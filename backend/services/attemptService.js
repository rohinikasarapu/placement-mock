const crypto = require('crypto');
const Attempt = require('../models/Attempt');
const Student = require('../models/Student');
const TestResult = require('../models/TestResult');
const { evaluate } = require('./scoringService');
const cache = require('./attemptCache');

const GRACE_MS = 2000;
const MAX_VIOLATIONS = 3;                 // the 4th violation terminates the exam
const VIOLATION_TYPES = ['fullscreen_exit', 'tab_switch', 'focus_loss'];
const VIOLATION_DEDUPE_MS = 1500;         // one user action often fires several browser events (blur + hidden + fullscreenchange)
const TERMINATION_REASON = 'Exceeded maximum tab-switch/full-screen violations'; // late-save tolerance for the last keystrokes of a section

const sectionEndMs = a => a.sectionStartedAt.getTime() + a.sections[a.currentSection].durationMinutes * 60000;
const newToken = () => crypto.randomBytes(24).toString('hex');

// Idempotently write the single TestResults document for a submitted attempt.
async function ensureResult(attemptId) {
  let att = await Attempt.findById(attemptId).lean();
  if (!att || att.status !== 'submitted') return att;
  const entry = await cache.load(attemptId);
  if (!att.evaluation) {
    att.evaluation = evaluate({ ...att, paper: entry.paper });
    await Attempt.updateOne({ _id: att._id }, { $set: { evaluation: att.evaluation } });
  }
  const student = await cache.studentOf(entry) || await Student.findById(att.studentId).lean();
  if (!student) return att;
  await TestResult.updateOne(
    { _id: att.resultId },
    { $setOnInsert: {
        studentId: student._id, studentName: student.studentName, rollNumber: student.rollNumber,
        department: student.department, yearOfStudy: student.yearOfStudy, testName: att.testName,
        totalMarks: att.evaluation.totalMarks, submissionDate: att.submittedAt
    } },
    { upsert: true }
  );
  return att;
}

// Final submission. The status flip is one atomic compare-and-set, so only one caller can ever win.
async function finalizeAttempt(attemptId, reason, extra = {}) {
  // result _id == attempt _id, so a second result document can never exist
  const r = await Attempt.updateOne(
    { _id: attemptId, status: 'in_progress' },
    { $set: { status: 'submitted', submittedAt: new Date(), submitReason: reason, resultId: attemptId, ...extra } }
  );
  const won = r.modifiedCount === 1;
  const att = await ensureResult(attemptId);
  cache.evict(attemptId);          // finished: free the memory held for this attempt
  return { won, att };
}

// Server-side timer: advance past every section whose time has run out (even if the browser was closed).
async function syncAttempt(attemptId) {
  for (let i = 0; i < 10; i++) {
    const att = await Attempt.findById(attemptId).lean();
    if (!att || att.status !== 'in_progress') return att;
    const end = sectionEndMs(att);
    if (Date.now() < end) return att;
    if (att.currentSection >= att.sections.length - 1) {
      const r = await finalizeAttempt(attemptId, 'timeout');
      return Attempt.findById(attemptId).lean();
    }
    const next = att.sections[att.currentSection + 1];
    await Attempt.updateOne(
      { _id: attemptId, status: 'in_progress', currentSection: att.currentSection },
      // the next ENABLED section starts when the previous one ended
      { $set: { currentSection: att.currentSection + 1, sectionStartedAt: new Date(end), sectionEndsAt: new Date(end + next.durationMinutes * 60000) } }
    );
  }
  return Attempt.findById(attemptId).lean();
}

// Record one violation (server timestamp). The (MAX+1)th terminates and auto-submits the attempt. Idempotent after submission.
async function recordViolation(attemptId, type) {
  for (let i = 0; i < 5; i++) {
    const att = await syncAttempt(attemptId);
    if (!att || att.status !== 'in_progress') return { counted: false, terminated: att && att.submitReason === 'violation', att };
    const last = att.violations[att.violations.length - 1];
    if (last && Date.now() - last.at.getTime() < VIOLATION_DEDUPE_MS) return { counted: false, terminated: false, att };
    const cas = await Attempt.updateOne(
      { _id: attemptId, status: 'in_progress', violationCount: att.violationCount },     // compare-and-set: concurrent reports cannot double count
      { $inc: { violationCount: 1 }, $push: { violations: { type, at: new Date() } } });
    if (!cas.modifiedCount) continue;
    const upd = await Attempt.findById(attemptId).lean();
    if (upd.violationCount > MAX_VIOLATIONS) {
      await finalizeAttempt(attemptId, 'violation', { terminationReason: TERMINATION_REASON });
      return { counted: true, terminated: true, att: await Attempt.findById(attemptId).lean() };
    }
    return { counted: true, terminated: false, att: upd };
  }
  return { counted: false, terminated: false, att: await Attempt.findById(attemptId).lean() };
}

function timerView(att) {
  const now = Date.now();
  if (att.status !== 'in_progress') {
    return { serverNow: now, status: att.status, sectionRemainingMs: 0, overallRemainingMs: 0 };
  }
  const sec = att.sections[att.currentSection];
  const sectionRemainingMs = Math.max(0, sectionEndMs(att) - now);
  const later = att.sections.slice(att.currentSection + 1).reduce((a, s) => a + s.durationMinutes * 60000, 0);
  return {
    serverNow: now, status: att.status, currentSection: att.currentSection,
    sectionDurationMs: sec.durationMinutes * 60000,
    sectionEndsAt: sectionEndMs(att), sectionRemainingMs, overallRemainingMs: sectionRemainingMs + later
  };
}

function stateView(att, student) {
  const responses = att.responses || {};
  const answered = Object.values(responses).filter(r => (r.selected !== undefined && r.selected !== null) || (r.written && String(r.written).trim())).length;
  return {
    id: att._id, testId: att.testId, testName: att.testName, status: att.status,
    student: student ? { id: student._id, studentName: student.studentName, rollNumber: student.rollNumber, department: student.department, yearOfStudy: student.yearOfStudy } : undefined,
    currentSection: att.currentSection, startedAt: att.startedAt, submittedAt: att.submittedAt, resultId: att.resultId,
    sections: att.sections.map((s, i) => ({
      ...(s.toObject ? s.toObject() : s),
      state: att.status === 'submitted' || i < att.currentSection ? 'completed' : i === att.currentSection ? 'current' : 'upcoming'
    })),
    progress: {
      sectionsDone: att.status === 'submitted' ? att.sections.length : att.currentSection,
      totalSections: att.sections.length,
      answered, totalQuestions: att.sections.reduce((a, s) => a + s.questionCount, 0)
    },
    violations: { count: att.violationCount || 0, max: MAX_VIOLATIONS, remaining: Math.max(0, MAX_VIOLATIONS - (att.violationCount || 0)) },
    terminated: att.submitReason === 'violation', terminationReason: att.terminationReason || null, submitReason: att.submitReason || null,
    timer: timerView(att)
  };
}

// Auto-advance / auto-submit attempts whose section time has run out while the browser was closed.
// Indexed query on (status, sectionEndsAt): only attempts that are actually overdue are touched, in small batches.
async function sweepExpired() {
  for (let round = 0; round < 20; round++) {
    const due = await Attempt.find({ status: 'in_progress', sectionEndsAt: { $lte: new Date(Date.now() - GRACE_MS) } }).select('_id').limit(100).lean();
    if (!due.length) return;
    for (let i = 0; i < due.length; i += 10) {
      await Promise.all(due.slice(i, i + 10).map(a => syncAttempt(a._id).catch(e => console.error('sweep error', e.message))));
    }
  }
}

module.exports = { MAX_VIOLATIONS, VIOLATION_TYPES, TERMINATION_REASON, recordViolation, GRACE_MS, sectionEndMs, newToken, syncAttempt, finalizeAttempt, ensureResult, timerView, stateView, sweepExpired };
