const Attempt = require('../models/Attempt');
const ApiError = require('../utils/ApiError');
const svc = require('../services/attemptService');
const cache = require('../services/attemptCache');

async function loadSynced(id) {
  const att = await svc.syncAttempt(id);
  if (!att) throw new ApiError(404, 'Attempt not found', 'NOT_FOUND');
  return att;
}
const submittedError = att => {
  const e = new ApiError(409, 'This test has already been submitted', 'ATTEMPT_SUBMITTED');
  e.extra = { resultId: att.resultId };
  return e;
};

exports.getAttempt = async (req, res) => {
  const att = await loadSynced(req.attemptId);
  const student = await cache.studentOf(req.attempt);
  res.json({ attempt: svc.stateView(att, student) });
};

exports.getTimer = async (req, res) => {
  const att = await loadSynced(req.attemptId);
  res.json({ timer: svc.timerView(att), currentSection: att.currentSection, status: att.status, resultId: att.resultId });
};

exports.getQuestions = async (req, res) => {
  const att = await loadSynced(req.attemptId);            // one read; the paper itself comes from the in-memory cache
  if (att.status === 'submitted') throw submittedError(att);
  const sec = att.sections[att.currentSection];
  const questions = req.attempt.paper.filter(q => q.sectionIndex === att.currentSection)
    .map(q => ({ id: q.id, number: q.number, type: q.type, text: q.text, options: q.options, marks: q.marks }));
  const responses = att.responses || {};
  res.json({
    section: { ...sec, index: att.currentSection, isLast: att.currentSection === att.sections.length - 1 },
    questions,
    responses: Object.fromEntries(questions.map(q => [q.id, responses[q.id] || {}])),
    timer: svc.timerView(att)
  });
};

// Validate answers against the frozen paper and build $set paths per field so concurrent saves never overwrite each other.
// Returns { set, sectionIndex }.
function buildUpdates(list, paperById) {
  const set = {};
  let sectionIndex = null;
  for (const a of list) {
    const q = paperById.get(String(a && a.questionId));
    if (!q) throw new ApiError(400, 'Unknown question', 'UNKNOWN_QUESTION');
    if (sectionIndex === null) sectionIndex = q.sectionIndex;
    else if (q.sectionIndex !== sectionIndex) throw new ApiError(409, 'That question belongs to a section that is not currently open', 'SECTION_LOCKED');
    const p = `responses.${q.id}`;
    if (a.selected !== undefined) {
      if (q.type !== 'objective') throw new ApiError(400, 'Not an objective question', 'INVALID_ANSWER');
      if (a.selected !== null && !(Number.isInteger(a.selected) && a.selected >= 0 && a.selected <= 3)) throw new ApiError(400, 'selected must be 0-3 or null', 'INVALID_ANSWER');
      set[`${p}.selected`] = a.selected;
      set[`${p}.visited`] = true;
    }
    if (a.written !== undefined) {
      if (q.type !== 'descriptive') throw new ApiError(400, 'Not a descriptive question', 'INVALID_ANSWER');
      if (typeof a.written !== 'string' || a.written.length > 8000) throw new ApiError(400, 'Written answer must be text up to 8000 characters', 'INVALID_ANSWER');
      set[`${p}.written`] = a.written;
      set[`${p}.visited`] = true;
    }
    if (a.marked !== undefined) set[`${p}.marked`] = !!a.marked;
    if (a.visited !== undefined) set[`${p}.visited`] = !!a.visited || set[`${p}.visited`] === true;
  }
  return { set, sectionIndex };
}

// Single database write. The filter itself enforces: attempt still open, the question's section is the current one, and
// the section time (plus a small grace for the last keystrokes) has not run out.
const saveFilter = (id, sectionIndex) => ({ _id: id, status: 'in_progress', currentSection: sectionIndex, sectionEndsAt: { $gt: new Date(Date.now() - svc.GRACE_MS) } });

exports.saveAnswers = async (req, res) => {
  const body = req.body || {};
  const list = Array.isArray(body.answers) ? body.answers : (body.questionId ? [body] : []);
  if (!list.length || list.length > 100) throw new ApiError(400, 'Provide 1-100 answers', 'VALIDATION_ERROR');
  const { set, sectionIndex } = buildUpdates(list, req.attempt.paperById);
  const r = await Attempt.updateOne(saveFilter(req.attemptId, sectionIndex), { $set: set });
  if (!r.matchedCount) {                                   // rare path: work out why, and return the precise error
    const att = await Attempt.findById(req.attemptId).lean();
    if (att.status === 'submitted') throw submittedError(att);
    if (Date.now() > svc.sectionEndMs(att) + svc.GRACE_MS) {
      await svc.syncAttempt(att._id);
      throw new ApiError(409, 'Time for this section is over. Your saved answers were kept.', 'SECTION_EXPIRED');
    }
    if (att.currentSection !== sectionIndex) throw new ApiError(409, 'That question belongs to a section that is not currently open', 'SECTION_LOCKED');
    throw new ApiError(409, 'The section changed while saving. Please reload.', 'SECTION_EXPIRED');
  }
  res.json({ saved: list.length, serverNow: Date.now() });
};

exports.changeSection = async (req, res) => {
  const from = Number(req.body && req.body.fromSection);
  const att = await loadSynced(req.attemptId);
  if (att.status === 'submitted') throw submittedError(att);
  if (from !== att.currentSection) {
    // Timer (or an earlier click) already moved the student on: report state instead of skipping another section.
    const e = new ApiError(409, 'Section already changed', 'STALE_SECTION');
    e.extra = { currentSection: att.currentSection };
    throw e;
  }
  if (att.currentSection >= att.sections.length - 1) throw new ApiError(400, 'This is the last section. Use Submit Test.', 'LAST_SECTION');
  const now = new Date();
  const next = att.sections[att.currentSection + 1];       // next ENABLED section (disabled ones are not part of the attempt)
  const r = await Attempt.updateOne(
    { _id: att._id, status: 'in_progress', currentSection: att.currentSection },
    { $set: { currentSection: att.currentSection + 1, sectionStartedAt: now, sectionEndsAt: new Date(now.getTime() + next.durationMinutes * 60000) } }
  );
  if (!r.matchedCount) throw new ApiError(409, 'Section already changed', 'STALE_SECTION');
  const fresh = { ...att, currentSection: att.currentSection + 1, sectionStartedAt: now };
  res.json({ currentSection: fresh.currentSection, timer: svc.timerView(fresh) });
};

exports.submit = async (req, res) => {
  const att = await Attempt.findById(req.attemptId).lean();
  if (att.status === 'submitted') throw submittedError(att);
  const list = Array.isArray(req.body && req.body.answers) ? req.body.answers : [];
  if (list.length) {
    try { // best-effort: last unsaved edits from the open section
      const { set, sectionIndex } = buildUpdates(list, req.attempt.paperById);
      await Attempt.updateOne(saveFilter(att._id, sectionIndex), { $set: set });
    } catch (e) { /* ignore invalid trailing answers; they must not block submission */ }
  }
  const { won, att: done } = await svc.finalizeAttempt(att._id, 'manual');
  if (!won) throw submittedError(done || att);
  res.json({ message: 'Test submitted', resultId: done.resultId, totalMarks: done.evaluation && done.evaluation.totalMarks });
};

// Browser-reported proctoring events. The server owns the count, timestamps and the termination decision.
exports.violation = async (req, res) => {
  const type = String(req.body && req.body.type || '');
  if (!svc.VIOLATION_TYPES.includes(type)) throw new ApiError(400, `type must be one of: ${svc.VIOLATION_TYPES.join(', ')}`, 'VALIDATION_ERROR');
  const r = await svc.recordViolation(req.attemptId, type);
  const att = r.att;
  res.json({
    counted: r.counted, terminated: r.terminated, submitted: att.status === 'submitted',
    violations: att.violationCount || 0, max: svc.MAX_VIOLATIONS, remaining: Math.max(0, svc.MAX_VIOLATIONS - (att.violationCount || 0)),
    terminationReason: att.terminationReason || null, resultId: att.resultId || null,
    totalMarks: att.evaluation ? att.evaluation.totalMarks : null, maxMarks: att.evaluation ? att.evaluation.maxMarks : null
  });
};
