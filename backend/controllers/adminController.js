const Student = require('../models/Student');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const TestResult = require('../models/TestResult');
const ApiError = require('../utils/ApiError');
const { assertObjectId, validateQuestionInput, DEPARTMENTS, YEARS } = require('../utils/validate');
const { sectionCounts } = require('../services/paperService');
const { normalizeSections, SECTIONS, sectionTotals, activeSections } = require('../config/pattern');
const ttl = require('../utils/ttlCache');
const { today, parseDay, availability, pretty } = require('../utils/schedule');

const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pageOf = q => {
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 25));
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  return { page, limit, skip: (page - 1) * limit };
};

// ---------- students ----------
exports.students = async (req, res) => {
  const q = String(req.query.q || req.query.roll || '').trim();
  const filter = {};
  if (q) filter.$or = [{ rollNumber: { $regex: esc(q.toUpperCase()) } }, { studentName: { $regex: esc(q), $options: 'i' } }];
  if (req.query.department) filter.department = String(req.query.department);
  if (req.query.year) filter.yearOfStudy = String(req.query.year);
  const { page, limit, skip } = pageOf(req.query);
  const [total, students] = await Promise.all([Student.countDocuments(filter), Student.find(filter).sort({ registrationDate: -1 }).skip(skip).limit(limit).lean()]);
  const results = await TestResult.find({ studentId: { $in: students.map(s => s._id) } }).select('studentId totalMarks submissionDate').lean();
  const agg = {};
  results.forEach(r => {
    const k = String(r.studentId);
    const a = agg[k] || (agg[k] = { attempts: 0, latest: null, latestDate: 0 });
    a.attempts++;
    if (+r.submissionDate >= a.latestDate) { a.latestDate = +r.submissionDate; a.latest = r.totalMarks; }
  });
  res.json({
    students: students.map(s => ({ ...s, testsAttempted: (agg[s._id] || {}).attempts || 0, latestMarks: (agg[s._id] || {}).latest ?? null })),
    page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), departments: DEPARTMENTS, years: YEARS
  });
};

exports.studentResults = async (req, res) => {
  assertObjectId(req.params.id, 'student id');
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found', 'NOT_FOUND');
  res.json({ student, results: await TestResult.find({ studentId: student._id }).sort({ submissionDate: -1 }) });
};

exports.stats = async (req, res) => {
  const day = today();
  const [students, tests, testsToday, upcoming, attempts, inProgress, completed, terminated] = await Promise.all([
    Student.countDocuments(), Test.countDocuments(), Test.countDocuments({ scheduledDate: day }), Test.countDocuments({ scheduledDate: { $gt: day } }),
    Attempt.countDocuments(), Attempt.countDocuments({ status: 'in_progress' }), TestResult.countDocuments(), Attempt.countDocuments({ submitReason: 'violation' })
  ]);
  res.json({ today: day, students, totalScheduledTests: tests, testsToday, upcomingTests: upcoming, totalAttempts: attempts, inProgressAttempts: inProgress, completedTests: completed, terminatedAttempts: terminated });
};

// ---------- tests & schedule ----------
// Exam preview computed from ENABLED sections only: what a student will get.
function preview(t) {
  const on = activeSections(t.sections), tot = sectionTotals(t.sections);
  return { sections: on.map(s => ({ key: s.key, sectionName: s.sectionName || s.name, questionCount: s.questionCount, marksPerQuestion: s.marksPerQuestion, totalMarks: s.totalMarks, durationMinutes: s.durationMinutes, type: s.type })),
    totalSections: tot.sections, totalQuestions: tot.questions, totalMarks: tot.marks, totalDuration: tot.duration };
}
// A test may only be live when every enabled section has enough questions in the bank.
async function assertCanActivate(t) {
  const { shortages } = await sectionCounts(t);
  if (shortages.length) {
    const msg = 'Cannot activate: ' + shortages.map(x => `${x.sectionName} needs ${x.required} question(s) but has ${x.available}`).join('; ');
    throw new ApiError(409, msg, 'ACTIVATION_BLOCKED', { shortages });
  }
}
async function testView(t) {
  const { counts, ready, shortages } = await sectionCounts(t);
  const [completed, inProgress] = await Promise.all([Attempt.countDocuments({ testId: t._id, status: 'submitted' }), Attempt.countDocuments({ testId: t._id, status: 'in_progress' })]);
  const o = t.toObject();
  return {
    ...o, id: t._id, questionCounts: counts, ready, shortages, availability: availability(t), scheduledDateLabel: pretty(t.scheduledDate),
    totalQuestions: sectionTotals(t.sections).questions, preview: preview(t), completedAttempts: completed, inProgressAttempts: inProgress
  };
}
const views = async list => Promise.all(list.map(testView));

exports.listTests = async (req, res) => res.json({ today: today(), tests: await views(await Test.find().sort({ scheduledDate: 1, createdAt: 1 })) });
exports.todayTests = async (req, res) => res.json({ today: today(), tests: await views(await Test.find({ scheduledDate: today() }).sort({ createdAt: 1 })) });
exports.upcomingTests = async (req, res) => res.json({ today: today(), tests: await views(await Test.find({ scheduledDate: { $gt: today() } }).sort({ scheduledDate: 1 })) });
exports.pastTests = async (req, res) => res.json({ today: today(), tests: await views(await Test.find({ scheduledDate: { $lt: today() } }).sort({ scheduledDate: -1 })) });

function readName(v) {
  const n = String(v ?? '').trim();
  if (n.length < 3 || n.length > 100) throw new ApiError(400, 'Test name must be 3-100 characters', 'VALIDATION_ERROR', { testName: 'Test name must be 3-100 characters' });
  return n;
}
function readSections(v) {
  const r = normalizeSections(v);
  if (r.error) throw new ApiError(400, r.error, 'VALIDATION_ERROR', { sections: r.error });
  return r.sections;
}
const futureOrToday = (d, label) => {
  parseDay(d, label);
  if (d < today()) throw new ApiError(400, 'Test date cannot be in the past (IST)', 'VALIDATION_ERROR', { scheduledDate: 'Choose today or a future date' });
};

exports.createTest = async (req, res) => {
  const b = req.body || {};
  const testName = readName(b.testName ?? b.name);
  if (!String(b.scheduledDate || '').trim()) throw new ApiError(400, 'Test date is required', 'VALIDATION_ERROR', { scheduledDate: 'Select the test date' });
  futureOrToday(b.scheduledDate, 'scheduledDate');
  if (await Test.exists({ testName })) throw new ApiError(409, 'A test with this name already exists', 'DUPLICATE');
  const doc = { testName, description: String(b.description || '').slice(0, 400), scheduledDate: b.scheduledDate, isActive: false };   // new tests start as drafts; activate once the question bank is complete
  if (b.sections !== undefined) doc.sections = readSections(b.sections);
  const t = new Test(doc);
  if (b.isActive === true) await assertCanActivate(t);   // a brand-new test has no questions yet, so this always explains what is missing
  await t.save();
  ttl.clear();
  res.status(201).json({ test: await testView(t) });
};

exports.updateTest = async (req, res) => {
  assertObjectId(req.params.id, 'test id');
  const t = await Test.findById(req.params.id);
  if (!t) throw new ApiError(404, 'Test not found', 'NOT_FOUND');
  const b = req.body || {};
  if (b.testName !== undefined || b.name !== undefined) {
    const n = readName(b.testName ?? b.name);
    if (n !== t.testName && await Test.exists({ testName: n })) throw new ApiError(409, 'A test with this name already exists', 'DUPLICATE');
    t.testName = n;
  }
  if (b.scheduledDate !== undefined && b.scheduledDate !== t.scheduledDate) { futureOrToday(b.scheduledDate, 'scheduledDate'); t.scheduledDate = b.scheduledDate; }   // reschedule
  if (b.description !== undefined) t.description = String(b.description).slice(0, 400);
  if (b.isActive !== undefined) t.isActive = !!b.isActive;
  if (b.sections !== undefined) {
    const next = readSections(b.sections);
    // A section that is removed or switched off must not be in use by a running exam.
    const gone = t.sections.filter(o => !next.some(n => n.key === o.key && n.isEnabled) && o.isEnabled !== false);
    if (gone.length && await Attempt.exists({ testId: t._id, status: 'in_progress' })) {
      throw new ApiError(409, `Students are taking this test right now, so "${gone[0].sectionName || gone[0].name}" cannot be removed or disabled. Try again when no exam is in progress.`, 'IN_USE');
    }
    const removed = t.sections.filter(o => !next.some(n => n.key === o.key));
    t.sections = next;                                                   // attempts in progress keep their own frozen copy
    if (removed.length) await Question.deleteMany({ testId: t._id, section: { $in: removed.map(r => r.key) } });
  }
  if (t.isActive) await assertCanActivate(t);   // keeps an active test consistent with its section configuration
  await t.save();
  ttl.clear();
  res.json({ test: await testView(t) });
};

exports.deleteTest = async (req, res) => {
  assertObjectId(req.params.id, 'test id');
  const t = await Test.findById(req.params.id);
  if (!t) throw new ApiError(404, 'Test not found', 'NOT_FOUND');
  if (await Attempt.exists({ testId: t._id, status: 'in_progress' })) throw new ApiError(409, 'Students are currently taking this test. Deactivate it instead.', 'IN_USE');
  await Question.deleteMany({ testId: t._id });
  await Test.deleteOne({ _id: t._id });
  ttl.clear();
  res.json({ message: 'Test and its questions deleted (past results are kept)' });
};
exports.defaultSections = (req, res) => res.json({ sections: SECTIONS });

// ---------- questions ----------
exports.listQuestions = async (req, res) => {
  assertObjectId(req.params.id, 'test id');
  const t = await Test.findById(req.params.id);
  if (!t) throw new ApiError(404, 'Test not found', 'NOT_FOUND');
  const rank = k => t.sections.findIndex(s => s.key === k);
  const questions = (await Question.find({ testId: t._id }).sort({ order: 1, _id: 1 })).sort((a, b) => rank(a.section) - rank(b.section) || a.order - b.order);
  res.json({ test: await testView(t), questions });
};

exports.addQuestion = async (req, res) => {
  assertObjectId(req.params.id, 'test id');
  const t = await Test.findById(req.params.id);
  if (!t) throw new ApiError(404, 'Test not found', 'NOT_FOUND');
  const sec = t.sections.find(s => s.key === (req.body || {}).section);
  if (!sec) throw new ApiError(400, 'Choose a valid section', 'VALIDATION_ERROR', { section: 'Invalid section' });
  const used = await Question.countDocuments({ testId: t._id, section: sec.key });
  if (used >= sec.questionCount) throw new ApiError(409, `${sec.name} already has its ${sec.questionCount} question(s). Delete one first.`, 'SECTION_FULL');
  const data = validateQuestionInput(req.body, sec);
  const q = await Question.create({ ...data, testId: t._id, section: sec.key, questionType: sec.type, marks: sec.type === 'objective' ? sec.marksPerQuestion : 0, order: used + 1 });
  ttl.clear();
  res.status(201).json({ question: q });
};

exports.updateQuestion = async (req, res) => {
  assertObjectId(req.params.qid, 'question id');
  const q = await Question.findById(req.params.qid);
  if (!q) throw new ApiError(404, 'Question not found', 'NOT_FOUND');
  const t = await Test.findById(q.testId);
  const sec = t && t.sections.find(s => s.key === q.section);
  Object.assign(q, validateQuestionInput(req.body, sec, { partial: true }));
  await q.save();
  ttl.clear();
  res.json({ question: q });
};

exports.deleteQuestion = async (req, res) => {
  assertObjectId(req.params.qid, 'question id');
  const r = await Question.deleteOne({ _id: req.params.qid });
  if (!r.deletedCount) throw new ApiError(404, 'Question not found', 'NOT_FOUND');
  ttl.clear();
  res.json({ message: 'Question deleted' });
};
