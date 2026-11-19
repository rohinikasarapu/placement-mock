const Test = require('../models/Test');
const Student = require('../models/Student');
const mongoose = require('mongoose');
const Attempt = require('../models/Attempt');
const cache = require('../services/attemptCache');
const AttemptPaper = require('../models/AttemptPaper');
const ApiError = require('../utils/ApiError');
const { cached } = require('../utils/ttlCache');
const ttl = require('../utils/ttlCache');
const { assertObjectId } = require('../utils/validate');
const { sectionCounts, loadQuestionBank, buildPaper } = require('../services/paperService');
const { newToken, syncAttempt, MAX_VIOLATIONS } = require('../services/attemptService');
const { activeSections, sectionTotals } = require('../config/pattern');
const { availability, isAvailable, availabilityMessage, today, pretty } = require('../utils/schedule');

const RULES = [
  'The examination is divided into sections that must be attempted in the given order. Each section has its own countdown timer.',
  'The timer starts when you click "I\'m Ready to Begin". The clock runs on the server, so refreshing or closing the browser does not pause or reset it.',
  'When a section timer reaches 00:00 you are moved to the next section automatically. Your saved answers are kept.',
  'You can move freely between questions inside the current section. Once a section ends you cannot go back to it.',
  'You may finish a section early with "Finish Section", but this cannot be undone.',
  'Each objective question has four options and exactly one correct answer. Use Save & Next to record an answer. Mark for Review flags a question for you only.',
  'Marking is done on the server. Unless stated otherwise there is no negative marking.',
  'Descriptive sections (such as the written test) are saved but are not part of the automatically calculated objective marks.',
  'Use a stable internet connection. Do not search for answers or use other devices or applications.'
];
const PROCTORING = [
  'The examination must be taken in full-screen mode. You will be asked to enter full screen before you begin.',
  'Leaving full screen, switching browser tabs, minimising the browser or moving away from the exam window is recorded as a violation.',
  'You get warnings for the first three violations. The 4th violation ends the examination immediately: your saved answers are submitted and your score is calculated automatically. A terminated attempt cannot be resumed.',
  'Refreshing the page does not reset your violation count or your timer.',
  'Note: browser-based monitoring cannot reliably detect every attempt to switch applications, use another device or bypass browser restrictions. It is a deterrent and an audit record, not foolproof proctoring.'
];
const SUBMISSION = [
  'The test is submitted automatically when the final section timer ends.',
  'You can submit earlier from the last section (or the Submit Test button) after confirming. A submitted test cannot be reopened.',
  'After submission your marks, section-wise performance and time taken are shown and saved.'
];

async function summary(t) {
  const { ready } = await cached('ready:' + t._id, LIST_TTL, () => sectionCounts(t));
  const sec = activeSections(t.sections);
  return {
    id: t._id, testName: t.testName, description: t.description, isActive: t.isActive, ready, sections: sec,
    scheduledDate: t.scheduledDate, scheduledDateLabel: pretty(t.scheduledDate), availability: availability(t), availableNow: isAvailable(t),
    totals: { sections: sec.length, questions: sec.reduce((a, x) => a + x.questionCount, 0), objectiveMarks: t.totalMarks, durationMinutes: t.totalDuration },
    today: today()
  };
}

// Students only ever see tests scheduled for today (IST) or in the future; past tests are never listed.
const LIST_TTL = 5000;   // dashboards of 600 students share one database read per few seconds
async function listFor(kind) { return cached('list:' + kind + ':' + today(), LIST_TTL, () => loadList(kind)); }
async function loadList(kind) {
  const day = today();
  const filter = { isActive: true, scheduledDate: kind === 'today' ? day : { $gt: day } };
  const tests = await Test.find(filter).sort({ scheduledDate: 1, createdAt: 1 });
  const out = [];
  for (const t of tests) { const s = await summary(t); if (s.ready) out.push(s); }
  return { tests: out, today: day, message: kind === 'today' && !out.length ? 'No mock tests are scheduled for today. Please check again on your next scheduled test date.' : '' };
}
exports.today = async (req, res) => res.json(await listFor('today'));
exports.upcoming = async (req, res) => res.json(await listFor('upcoming'));
exports.list = exports.today;   // GET /api/tests == tests available right now

async function findActiveTest(id) {
  assertObjectId(id, 'test id');
  const t = await cached('test:' + id, LIST_TTL, () => Test.findById(id));
  if (!t || !t.isActive) throw new ApiError(404, 'Test not found', 'NOT_FOUND');
  return t;
}
const assertAvailable = t => { if (!isAvailable(t)) throw new ApiError(403, availabilityMessage(t), 'TEST_NOT_AVAILABLE'); };

exports.getById = async (req, res) => res.json({ test: await summary(await findActiveTest(req.params.id)) });

exports.instructions = async (req, res) => {
  const t = await findActiveTest(req.params.id);
  assertAvailable(t);
  const s = await summary(t);
  res.json({
    examName: t.testName, scheduledDate: t.scheduledDate, scheduledDateLabel: s.scheduledDateLabel, totals: s.totals, sections: s.sections,
    rules: RULES, proctoringRules: PROCTORING, submissionInstructions: SUBMISSION, proctoringLimits: { maxViolations: MAX_VIOLATIONS },
    acknowledgement: 'I have read and understood all examination instructions.', ready: s.ready, availableNow: true
  });
};

exports.start = async (req, res) => {
  const t = await findActiveTest(req.params.id);
  const studentId = req.body && req.body.studentId;
  assertObjectId(studentId, 'studentId');
  const student = await Student.findById(studentId);
  if (!student) throw new ApiError(404, 'Student not found. Please register first.', 'NOT_FOUND');
  const { ready } = await cached('ready:' + t._id, LIST_TTL, () => sectionCounts(t));
  if (!ready) throw new ApiError(409, 'This test is not ready yet (question set is incomplete).', 'TEST_NOT_READY');

  // One read: a terminated attempt blocks a restart; an unfinished one is resumed (its timer is never reset).
  const existing = await Attempt.findOne({ studentId, testId: t._id, $or: [{ submitReason: 'violation' }, { status: 'in_progress' }] }).select('_id status submitReason').lean();
  if (existing && existing.submitReason === 'violation') {
    throw new ApiError(403, 'Your attempt for this test was terminated because of examination violations. It cannot be restarted.', 'ATTEMPT_TERMINATED');
  }
  if (existing) {
    const synced = await syncAttempt(existing._id);
    if (synced.status === 'in_progress') {
      return res.json({ attemptId: synced._id, token: synced.token, resumed: true });
    }
  }
  // Date-wise scheduling is enforced HERE on the server (IST). Resuming an unfinished attempt above is always allowed.
  assertAvailable(t);
  const questionBank = await cached('question-bank:' + t._id, 15000, () => loadQuestionBank(t));
  const paper = buildPaper(t, questionBank);
  const snap = activeSections(t.sections).map(s => ({ key: s.key, name: s.sectionName || s.name, sectionName: s.sectionName || s.name, questionCount: s.questionCount, marksPerQuestion: s.marksPerQuestion, totalMarks: s.totalMarks, durationMinutes: s.durationMinutes, type: s.type }));
  const now = new Date();
  const attemptId = new mongoose.Types.ObjectId();
  await AttemptPaper.create({ _id: attemptId, paper });                 // frozen question paper + answer key (written once)
  const attempt = await Attempt.create({
    _id: attemptId, studentId, testId: t._id, testName: t.testName, token: newToken(),
    sections: snap,
    currentSection: 0, startedAt: now, sectionStartedAt: now, sectionEndsAt: new Date(now.getTime() + snap[0].durationMinutes * 60000), responses: {}
  });
  cache.prime({ id: attempt._id, token: attempt.token, studentId: student._id, testId: t._id, sections: snap, paper, student: student.toObject() });
  res.status(201).json({ attemptId: attempt._id, token: attempt.token, resumed: false });
};

exports.RULES = RULES;
exports.invalidate = () => ttl.clear();
