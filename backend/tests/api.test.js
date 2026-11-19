// End-to-end API test. Needs a running server + seeded DB:  BASE=http://localhost:5000 npm test
require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Attempt = require('../models/Attempt');
const AttemptPaper = require('../models/AttemptPaper');
const TestResult = require('../models/TestResult');
const Question = require('../models/Question');
const Test = require('../models/Test');
const Student = require('../models/Student');
const { buildPaper } = require('../services/paperService');
const ExcelJS = require('exceljs');
const { today } = require('../utils/schedule');

const BASE = process.env.BASE || 'http://localhost:' + (process.env.PORT || 5000);
const roll = 'T' + Date.now().toString().slice(-9);
const api = async (method, path, body, headers = {}) => {
  const r = await fetch(BASE + '/api' + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await r.json(); } catch {}
  return { status: r.status, body: json };
};
const S = {};

const SEEDED = 'Placement Aptitude Mock Test 1';
test.before(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  // The seed creates draft tests on future dates; make the first one live today so the exam flow can be exercised.
  const r = await Test.updateOne({ testName: SEEDED, isSeeded: true }, { $set: { scheduledDate: today(), isActive: true } });
  assert.equal(r.matchedCount, 1, 'run `npm run seed` first');
});
test.after(() => mongoose.disconnect());

test('question papers shuffle per attempt within sections and respect configured counts', () => {
  const test = { sections: [
    { key: 'logic', questionCount: 2, marksPerQuestion: 1, totalMarks: 2, displayOrder: 1, isEnabled: true, type: 'objective' },
    { key: 'reading', questionCount: 1, marksPerQuestion: 1, totalMarks: 1, displayOrder: 2, isEnabled: true, type: 'objective' }
  ] };
  const questions = [
    { _id: 'logic-1', section: 'logic', order: 1, text: 'L1', options: [], correctOption: 0 },
    { _id: 'logic-2', section: 'logic', order: 2, text: 'L2', options: [], correctOption: 1 },
    { _id: 'logic-3', section: 'logic', order: 3, text: 'L3', options: [], correctOption: 2 },
    { _id: 'reading-1', section: 'reading', order: 1, text: 'R1', options: [], correctOption: 0 },
    { _id: 'reading-2', section: 'reading', order: 2, text: 'R2', options: [], correctOption: 1 }
  ];
  const firstPaper = buildPaper(test, questions, () => 0);
  const secondPaper = buildPaper(test, questions, max => max - 1);
  assert.deepEqual(firstPaper.map(q => q.id), ['logic-1', 'logic-2', 'reading-1']);
  assert.deepEqual(secondPaper.map(q => q.id), ['logic-3', 'logic-1', 'reading-2']);
  assert.deepEqual(firstPaper.map(q => q.sectionIndex), [0, 0, 1]);
  assert.deepEqual(firstPaper.map(q => q.number), [1, 2, 1]);
});

test('registration validation, success and duplicate roll number', async () => {
  let r = await api('POST', '/students/register', { studentName: '', rollNumber: 'x', department: 'CSE', yearOfStudy: '4th Year' });
  assert.equal(r.status, 400); assert.ok(r.body.error.details.studentName && r.body.error.details.rollNumber);
  r = await api('POST', '/students/register', { studentName: 'Test Student', rollNumber: roll, department: 'Nope', yearOfStudy: '4th Year' });
  assert.equal(r.status, 400);
  r = await api('POST', '/students/register', { studentName: 'Test Student', rollNumber: roll.toLowerCase(), department: 'CSE', yearOfStudy: '4th Year', email: 'a@b.c', password: 'x' });
  assert.equal(r.status, 201); S.student = r.body.student;
  assert.equal(S.student.email, undefined); assert.equal(S.student.rollNumber, roll);
  r = await api('POST', '/students/register', { studentName: 'Other', rollNumber: roll, department: 'IT', yearOfStudy: '3rd Year' });
  assert.equal(r.status, 409);
  r = await api('GET', '/students/roll/' + roll); assert.equal(r.body.student._id, S.student._id);
  r = await api('GET', '/students/' + S.student._id); assert.equal(r.status, 200);
  assert.equal((await api('GET', '/students/123')).status, 400);
});

test('tests list + instructions expose the exact pattern', async () => {
  const r = await api('GET', '/tests'); assert.equal(r.status, 200);
  S.test = r.body.tests[0];
  const i = (await api('GET', `/tests/${S.test.id}/instructions`)).body;
  assert.deepEqual(i.totals, { sections: 7, questions: 60, objectiveMarks: 75, durationMinutes: 130 - 10 });
  assert.deepEqual(i.sections.map(s => [s.name, s.questionCount, s.totalMarks, s.durationMinutes]), [
    ['Reasoning Ability', 15, 15, 25], ['Technical Ability (Quant)', 10, 10, 35], ['Verbal', 20, 20, 20],
    ['Pseudo Code', 5, 10, 10], ['Numerical Puzzle', 4, 10, 10], ['English Grammar Test', 5, 10, 10], ['English Written Test', 1, 0, 10]]);
});

test('start attempt, ownership, no answer key leak, resume', async () => {
  let r = await api('POST', `/tests/${S.test.id}/start`, { studentId: 'bad' }); assert.equal(r.status, 400);
  r = await api('POST', `/tests/${S.test.id}/start`, { studentId: S.student._id }); assert.equal(r.status, 201);
  S.att = r.body.attemptId; S.h = { 'x-attempt-token': r.body.token };
  assert.equal((await api('GET', `/attempts/${S.att}`)).status, 403);
  assert.equal((await api('GET', `/attempts/${S.att}`, null, { 'x-attempt-token': 'wrong' })).status, 403);
  r = await api('GET', `/attempts/${S.att}/questions`, null, S.h);
  assert.equal(r.body.questions.length, 15); assert.equal(r.body.section.name, 'Reasoning Ability');
  assert.ok(!JSON.stringify(r.body).includes('correctOption'));
  const again = await api('POST', `/tests/${S.test.id}/start`, { studentId: S.student._id });
  assert.equal(again.body.resumed, true); assert.equal(again.body.attemptId, S.att);
});

test('answers: save, mark, clear, restore after refresh, section lock', async () => {
  const q = (await api('GET', `/attempts/${S.att}/questions`, null, S.h)).body.questions;
  const key = (await AttemptPaper.findById(S.att).lean()).paper;
  const ans = id => key.find(k => k.id === id).correctOption;
  // answer first 10 correctly, 3 wrong, leave 2; mark one for review
  for (let i = 0; i < 10; i++) assert.equal((await api('POST', `/attempts/${S.att}/answers`, { questionId: q[i].id, selected: ans(q[i].id) }, S.h)).status, 200);
  for (let i = 10; i < 13; i++) await api('POST', `/attempts/${S.att}/answers`, { questionId: q[i].id, selected: (ans(q[i].id) + 1) % 4 }, S.h);
  await api('POST', `/attempts/${S.att}/answers`, { questionId: q[0].id, marked: true }, S.h);
  await api('POST', `/attempts/${S.att}/answers`, { questionId: q[1].id, selected: null }, S.h); // clear -> unanswered
  await api('POST', `/attempts/${S.att}/answers`, { answers: [{ questionId: q[13].id, visited: true }] }, S.h);
  let bad = await api('POST', `/attempts/${S.att}/answers`, { questionId: q[2].id, selected: 9 }, S.h); assert.equal(bad.status, 400);
  const other = (await Question.findOne({ section: 'quant' }).lean())._id;
  bad = await api('POST', `/attempts/${S.att}/answers`, { questionId: String(other), selected: 0 }, S.h); assert.ok([400, 409].includes(bad.status));
  const r = (await api('GET', `/attempts/${S.att}/questions`, null, S.h)).body.responses;   // "refresh"
  assert.equal(r[q[0].id].selected, ans(q[0].id)); assert.equal(r[q[0].id].marked, true);
  assert.equal(r[q[1].id].selected, null); assert.equal(r[q[13].id].visited, true);
  assert.equal(r[q[11].id].selected, (ans(q[11].id) + 1) % 4);
  S.expected = { reasoning: { correct: 9, incorrect: 3, unanswered: 3 } };
});

test('timer is server-based: refresh keeps remaining time; expiry auto-advances', async () => {
  let t = (await api('GET', `/attempts/${S.att}/timer`, null, S.h)).body.timer;
  assert.ok(t.sectionRemainingMs <= 25 * 60000 && t.sectionRemainingMs > 24 * 60000);
  // pretend 10 minutes elapsed on the server clock
  await Attempt.updateOne({ _id: S.att }, { $set: { sectionStartedAt: new Date(Date.now() - 10 * 60000) } });
  t = (await api('GET', `/attempts/${S.att}/timer`, null, S.h)).body.timer;
  assert.ok(Math.abs(t.sectionRemainingMs - 15 * 60000) < 3000, 'remaining ~15 min after "refresh"');
  // answers still accepted; then expire reasoning completely
  await Attempt.updateOne({ _id: S.att }, { $set: { sectionStartedAt: new Date(Date.now() - 26 * 60000) } });
  let st = (await api('GET', `/attempts/${S.att}`, null, S.h)).body.attempt;
  assert.equal(st.currentSection, 1); assert.equal(st.sections[0].state, 'completed');
  assert.ok(Math.abs(st.timer.sectionRemainingMs - (35 * 60000 - 60000)) < 3000, 'next section started at previous end');
  const q0 = (await AttemptPaper.findById(S.att).lean()).paper[0];
  const late = await api('POST', `/attempts/${S.att}/answers`, { questionId: q0.id, selected: 0 }, S.h);
  assert.equal(late.status, 409); // old section is locked
  // changeSection: stale + valid
  assert.equal((await api('POST', `/attempts/${S.att}/section`, { fromSection: 0 }, S.h)).status, 409);
});

test('offline for a long time skips several sections; manual finish works', async () => {
  await Attempt.updateOne({ _id: S.att }, { $set: { sectionStartedAt: new Date(Date.now() - (35 + 20 + 5) * 60000) } });
  let st = (await api('GET', `/attempts/${S.att}`, null, S.h)).body.attempt;
  assert.equal(st.currentSection, 3);  // reasoning, quant, verbal over -> pseudocode
  const r = await api('POST', `/attempts/${S.att}/section`, { fromSection: 3 }, S.h);
  assert.equal(r.status, 200); assert.equal(r.body.currentSection, 4);
});

test('answer remaining sections, written test, submit once, exact 8 fields, marks calculated on server', async () => {
  // jump to pseudocode (index 3) already past; answer puzzle(4) correctly, grammar(5) after moving on
  const paper = (await AttemptPaper.findById(S.att).lean()).paper;
  const cur = async () => (await api('GET', `/attempts/${S.att}`, null, S.h)).body.attempt.currentSection;
  assert.equal(await cur(), 4);
  for (const q of paper.filter(p => p.sectionIndex === 4)) await api('POST', `/attempts/${S.att}/answers`, { questionId: q.id, selected: q.correctOption }, S.h);
  await api('POST', `/attempts/${S.att}/section`, { fromSection: 4 }, S.h);
  const g = paper.filter(p => p.sectionIndex === 5);
  for (const [i, q] of g.entries()) await api('POST', `/attempts/${S.att}/answers`, { questionId: q.id, selected: i < 2 ? q.correctOption : (q.correctOption + 1) % 4 }, S.h);
  await api('POST', `/attempts/${S.att}/section`, { fromSection: 5 }, S.h);
  const w = paper.find(p => p.sectionIndex === 6);
  assert.equal((await api('POST', `/attempts/${S.att}/answers`, { questionId: w.id, written: 'Technology matters. '.repeat(20) }, S.h)).status, 200);
  assert.equal((await api('POST', `/attempts/${S.att}/section`, { fromSection: 6 }, S.h)).status, 400);

  const [a, b] = await Promise.all([api('POST', `/attempts/${S.att}/submit`, {}, S.h), api('POST', `/attempts/${S.att}/submit`, {}, S.h)]);
  assert.ok([a.status, b.status].every(x => [200, 409].includes(x)) && [a.status, b.status].includes(200));
  assert.equal((await api('POST', `/attempts/${S.att}/submit`, {}, S.h)).status, 409);
  assert.equal((await api('POST', `/attempts/${S.att}/answers`, { questionId: w.id, written: 'x' }, S.h)).status, 409);

  const docs = await TestResult.find({ studentId: S.student._id }).lean();
  assert.equal(docs.length, 1, 'exactly one result document');
  assert.deepEqual(Object.keys(docs[0]).sort(), ['_id', 'department', 'rollNumber', 'studentId', 'studentName', 'submissionDate', 'testName', 'totalMarks', 'yearOfStudy']);
  // reasoning: 9 correct = 9. quant/verbal/pseudo: unanswered(0). puzzle: 4*2.5=10. grammar: 2*2=4. => 23
  assert.equal(docs[0].totalMarks, 23);
  assert.equal(docs[0].testName, SEEDED); assert.equal(docs[0].rollNumber, roll);
  assert.ok(docs[0].studentId instanceof mongoose.Types.ObjectId);

  const res = (await api('GET', `/results/${docs[0]._id}`)).body;
  assert.equal(res.breakdown.totalMarks, 23); assert.equal(res.breakdown.maxMarks, 75);
  assert.equal(res.breakdown.sections[0].correct, 9); assert.equal(res.breakdown.sections[0].incorrect, 3); assert.equal(res.breakdown.sections[0].unanswered, 3);
  assert.equal(res.breakdown.writtenResponse.wordCount, 40);
  assert.equal(res.breakdown.correct + res.breakdown.incorrect + res.breakdown.unanswered, 59);
  assert.equal((await api('GET', `/results/student/${S.student._id}`)).body.results.length, 1);
  assert.equal((await api('GET', `/results/roll/${roll}`)).body.results.length, 1);
  S.result = docs[0]._id;
});

test('second attempt creates a separate result; final-section timeout auto-submits', async () => {
  const r = await api('POST', `/tests/${S.test.id}/start`, { studentId: S.student._id });
  assert.equal(r.status, 201); const id = r.body.attemptId;
  await Attempt.updateOne({ _id: id }, { $set: { startedAt: new Date(Date.now() - 125 * 60000), sectionStartedAt: new Date(Date.now() - 125 * 60000) } });
  const h = { 'x-attempt-token': r.body.token };
  const st = (await api('GET', `/attempts/${id}`, null, h)).body.attempt;
  assert.equal(st.status, 'submitted');
  const docs = await TestResult.find({ studentId: S.student._id }).lean();
  assert.equal(docs.length, 2); assert.equal(docs[1].totalMarks, 0);
  assert.equal((await Attempt.findById(id).lean()).submitReason, 'timeout');
  assert.equal((await api('GET', `/results/${S.result}`)).body.result.totalMarks, 23, 'previous result untouched');
});

test('admin: protected, login, students search, tests/questions CRUD', async () => {
  assert.equal((await api('GET', '/admin/students')).status, 401);
  assert.equal((await api('GET', '/admin/students', null, { authorization: 'Bearer abc.def' })).status, 401);
  assert.equal((await api('POST', '/admin/login', { username: 'admin', password: 'nope' })).status, 401);
  const l = await api('POST', '/admin/login', { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD });
  assert.equal(l.status, 200); const h = { authorization: 'Bearer ' + l.body.token };
  const s = (await api('GET', '/admin/students?roll=' + roll.slice(0, 6), null, h)).body.students;
  assert.ok(s.find(x => x.rollNumber === roll && x.testsAttempted === 2));
  assert.ok((await api('GET', '/admin/results', null, h)).body.results.length >= 2);
  assert.ok((await api('GET', '/admin/stats', null, h)).body.students >= 1);

  const t = (await api('POST', '/admin/tests', { testName: 'Admin Temp Test ' + roll, scheduledDate: today() }, h)).body.test;
  assert.equal(t.ready, false);
  assert.equal(t.isActive, false);                                                                          // new tests are drafts
  let act = await api('PUT', `/admin/tests/${t.id}`, { isActive: true }, h);                                // activation needs a complete question bank
  assert.equal(act.status, 409); assert.equal(act.body.error.code, 'ACTIVATION_BLOCKED');
  assert.equal((await api('POST', `/tests/${t.id}/start`, { studentId: S.student._id })).status, 404);     // a draft cannot be started
  let q = await api('POST', `/admin/tests/${t.id}/questions`, { section: 'puzzle', text: 'What is 2+2?', options: ['3', '4', '5', '6'], correctOption: 1 }, h);
  assert.equal(q.status, 201);
  assert.equal((await api('POST', `/admin/tests/${t.id}/questions`, { section: 'puzzle', text: 'Bad', options: ['a'], correctOption: 1 }, h)).status, 400);
  q = await api('PUT', `/admin/questions/${q.body.question._id}`, { text: 'What is 3+3?', options: ['5', '6', '7', '8'], correctOption: 1 }, h);
  assert.equal(q.body.question.text, 'What is 3+3?');
  const w = await api('POST', `/admin/tests/${t.id}/questions`, { section: 'written', text: 'Describe your goals.' }, h); assert.equal(w.status, 201);
  assert.equal((await api('POST', `/admin/tests/${t.id}/questions`, { section: 'written', text: 'Second written' }, h)).status, 409);
  assert.equal((await api('PUT', `/admin/tests/${t.id}`, { description: 'edited' }, h)).body.test.description, 'edited');
  assert.equal((await api('DELETE', `/admin/questions/${q.body.question._id}`, null, h)).status, 200);
  assert.equal((await api('DELETE', `/admin/tests/${t.id}`, null, h)).status, 200);
  assert.equal((await api('GET', `/admin/tests/${t.id}/questions`, null, h)).status, 404);
});

const shift = n => { const d = new Date(today() + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const adminH = async () => ({ authorization: 'Bearer ' + (await api('POST', '/admin/login', { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD })).body.token });
const raw = async (path, headers) => fetch(BASE + '/api' + path, { headers });

test('IST calendar day boundary', () => {
  const { today: t, dayStart } = require('../utils/schedule');
  assert.equal(t(new Date('2026-11-17T18:29:59Z')), '2026-11-17');   // 23:59:59 IST
  assert.equal(t(new Date('2026-11-17T18:30:00Z')), '2026-11-18');   // 00:00:00 IST next day
  assert.equal(dayStart('2026-11-18').toISOString(), '2026-11-17T18:30:00.000Z');
});

test('date-wise scheduling: only the scheduled date is accessible, enforced by the backend', async () => {
  const H = await adminH();
  const tid = (await api('GET', '/tests/today')).body.tests[0].id;     // the seeded test, scheduled for today
  const setDb = d => Test.updateOne({ _id: tid }, { $set: { scheduledDate: d } });
  const inList = async k => (await api('GET', '/tests/' + k)).body.tests.some(x => x.id === tid);
  const start = () => api('POST', `/tests/${tid}/start`, { studentId: S.student._id });
  try {
    // today
    assert.ok(await inList('today')); assert.ok(!(await inList('upcoming')));
    assert.equal((await api('GET', `/tests/${tid}/instructions`)).status, 200);
    // future
    await setDb(shift(1));
    assert.ok(!(await inList('today'))); assert.ok(await inList('upcoming'));
    assert.ok(!(await api('GET', '/tests')).body.tests.some(x => x.id === tid));
    const todayRes = (await api('GET', '/tests/today')).body; assert.match(todayRes.message, /No mock tests are scheduled for today/);
    let r = await start(); assert.equal(r.status, 403); assert.equal(r.body.error.code, 'TEST_NOT_AVAILABLE');
    assert.equal((await api('GET', `/tests/${tid}/instructions`)).status, 403);
    // past
    await setDb(shift(-1));
    assert.ok(!(await inList('today'))); assert.ok(!(await inList('upcoming')));
    r = await start(); assert.equal(r.status, 403); assert.match(r.body.error.message, /closed/);
    // admin views
    assert.ok((await api('GET', '/admin/tests/past', null, H)).body.tests.some(x => x.id === tid));
    assert.ok(!(await api('GET', '/admin/tests/today', null, H)).body.tests.some(x => x.id === tid));
    // admin validation + reschedule + auth
    assert.equal((await api('PUT', '/admin/tests/' + tid, { scheduledDate: shift(-2) }, H)).status, 400);        // cannot reschedule into the past
    assert.equal((await api('PUT', '/admin/tests/' + tid, { scheduledDate: '2026-02-30' }, H)).status, 400);
    assert.equal((await api('PUT', '/admin/tests/' + tid, { scheduledDate: shift(2) })).status, 401);            // students cannot schedule
    let u = await api('PUT', '/admin/tests/' + tid, { scheduledDate: shift(3) }, H); assert.equal(u.status, 200); assert.equal(u.body.test.availability, 'upcoming');
    assert.ok((await api('GET', '/admin/tests/upcoming', null, H)).body.tests.some(x => x.id === tid));
    assert.equal((await api('POST', '/admin/tests', { testName: 'No date ' + roll }, H)).status, 400);           // date is mandatory
    // deactivate hides even on the right day
    u = await api('PUT', '/admin/tests/' + tid, { scheduledDate: today(), isActive: false }, H); assert.equal(u.status, 200);
    assert.ok(!(await inList('today'))); assert.equal((await start()).status, 404);
    await api('PUT', '/admin/tests/' + tid, { isActive: true }, H);
    // resuming an unfinished attempt still works if midnight passes during the exam
    r = await start(); assert.equal(r.status, 201);
    await setDb(shift(-1));
    const again = await start(); assert.equal(again.status, 200); assert.equal(again.body.resumed, true);
    await api('POST', `/attempts/${r.body.attemptId}/submit`, {}, { 'x-attempt-token': r.body.token });
  } finally { await setDb(today()); }
});

test('Test schema: new scheduling fields and section configuration', async () => {
  const H = await adminH();
  const sections = (await api('GET', '/admin/section-defaults', null, H)).body.sections.map(s => ({ ...s, durationMinutes: s.durationMinutes + 1 }));
  const r = await api('POST', '/admin/tests', { testName: 'Config Test ' + roll, description: 'd', scheduledDate: shift(5), sections, isActive: false }, H);
  assert.equal(r.status, 201);
  const doc = await Test.findById(r.body.test.id).lean();
  for (const k of ['testName', 'description', 'scheduledDate', 'totalDuration', 'totalMarks', 'sections', 'isActive', 'createdAt', 'updatedAt']) assert.ok(k in doc, 'missing ' + k);
  assert.equal(doc.totalDuration, 127); assert.equal(doc.totalMarks, 75); assert.equal(doc.isActive, false);
  const bad = async sec => (await api('POST', '/admin/tests', { testName: 'Bad ' + roll, scheduledDate: shift(5), sections: sec }, H)).status;
  assert.equal(await bad([]), 400);                                                                            // at least one section
  assert.equal(await bad([{ ...sections[0] }, { ...sections[1], sectionName: sections[0].sectionName }]), 400);  // duplicate names
  assert.equal(await bad([{ ...sections[0], questionCount: -1 }]), 400);
  assert.equal(await bad([{ ...sections[0], questionCount: 201 }]), 400);
  assert.equal(await bad([{ ...sections[0], durationMinutes: -1 }]), 400);
  assert.equal(await bad([{ ...sections[0], durationMinutes: 301 }]), 400);
  assert.equal(await bad(sections.map(s => ({ ...s, isEnabled: false }))), 400);                               // none enabled
  const zero = await api('POST', '/admin/tests', { testName: 'Zero Config ' + roll, scheduledDate: shift(5), sections: [{ ...sections[0], questionCount: 0, durationMinutes: 0 }] }, H);
  assert.equal(zero.status, 201); assert.equal(zero.body.test.sections[0].questionCount, 0); assert.equal(zero.body.test.sections[0].durationMinutes, 0);
  assert.equal(zero.body.test.totalMarks, 0); assert.equal(zero.body.test.totalDuration, 0);
  assert.equal((await api('DELETE', '/admin/tests/' + zero.body.test.id, null, H)).status, 200);
  assert.equal((await api('DELETE', '/admin/tests/' + r.body.test.id, null, H)).status, 200);
});

test('proctoring: 3 warnings, 4th violation terminates, scores on the backend, survives refresh', async () => {
  const reg = (await api('POST', '/students/register', { studentName: 'Proctor Test', rollNumber: 'PT' + roll.slice(2), department: 'ECE', yearOfStudy: '3rd Year' })).body.student;
  const tid = (await api('GET', '/tests/today')).body.tests[0].id;
  const s = await api('POST', `/tests/${tid}/start`, { studentId: reg._id }); assert.equal(s.status, 201);
  const id = s.body.attemptId, T = { 'x-attempt-token': s.body.token };
  // answer Q1 correctly (key read straight from the DB; it is never sent to the browser)
  const att = await AttemptPaper.findById(id).lean(); const q1 = att.paper.find(q => q.sectionIndex === 0 && q.number === 1);
  assert.equal((await api('POST', `/attempts/${id}/answers`, { answers: [{ questionId: q1.id, selected: q1.correctOption }] }, T)).status, 200);

  assert.equal((await api('POST', `/attempts/${id}/violation`, { type: 'bogus' }, T)).status, 400);
  assert.equal((await api('POST', `/attempts/${id}/violation`, { type: 'tab_switch' }, { 'x-attempt-token': 'x'.repeat(48) })).status, 403);
  const types = ['tab_switch', 'fullscreen_exit', 'focus_loss'];
  for (let i = 0; i < 3; i++) {
    const r = await api('POST', `/attempts/${id}/violation`, { type: types[i] }, T);
    assert.equal(r.status, 200); assert.equal(r.body.counted, true); assert.equal(r.body.violations, i + 1); assert.equal(r.body.terminated, false); assert.equal(r.body.remaining, 2 - i);
    if (i === 0) assert.equal((await api('POST', `/attempts/${id}/violation`, { type: 'focus_loss' }, T)).body.counted, false);   // same moment (blur + hidden) counts once
    assert.equal((await api('GET', `/attempts/${id}`, null, T)).body.attempt.violations.count, i + 1);                          // "refresh" keeps the count
    await new Promise(r => setTimeout(r, 1700));
  }
  assert.equal((await api('GET', `/attempts/${id}`, null, T)).body.attempt.status, 'in_progress');
  const fin = await api('POST', `/attempts/${id}/violation`, { type: 'tab_switch' }, T);                                         // 4th
  assert.equal(fin.status, 200); assert.equal(fin.body.terminated, true); assert.equal(fin.body.submitted, true);
  assert.equal(fin.body.terminationReason, 'Exceeded maximum tab-switch/full-screen violations');
  assert.equal(fin.body.totalMarks, 1);                                                                                           // Q1 was correct: 1 mark, computed server side
  // repeated termination requests / further actions are harmless
  const dup = await api('POST', `/attempts/${id}/violation`, { type: 'tab_switch' }, T); assert.equal(dup.body.counted, false);
  assert.equal((await api('POST', `/attempts/${id}/answers`, { answers: [{ questionId: q1.id, selected: 0 }] }, T)).status, 409);  // inputs locked
  assert.equal((await api('POST', `/attempts/${id}/submit`, {}, T)).status, 409);
  assert.equal((await api('POST', `/tests/${tid}/start`, { studentId: reg._id })).body.error.code, 'ATTEMPT_TERMINATED');         // no restart
  // stored in MongoDB: testattempts has the audit trail, TestResults still has exactly 8 fields
  const a = await Attempt.findById(id).lean();
  assert.equal(Attempt.collection.collectionName, 'testattempts');
  assert.equal(a.violationCount, 4); assert.equal(a.violations.length, 4); assert.ok(a.violations.every(v => v.type && v.at instanceof Date));
  assert.equal(a.submitReason, 'violation'); assert.equal(a.terminationReason, 'Exceeded maximum tab-switch/full-screen violations');
  const rs = await TestResult.collection.find({ studentId: new mongoose.Types.ObjectId(reg._id) }).toArray();
  assert.equal(rs.length, 1); assert.deepEqual(Object.keys(rs[0]).filter(k => k !== '_id').sort(), ['department', 'rollNumber', 'studentId', 'studentName', 'submissionDate', 'testName', 'totalMarks', 'yearOfStudy']);
  assert.equal(rs[0].totalMarks, 1);
  const res = (await api('GET', '/results/' + rs[0]._id)).body; assert.equal(res.breakdown.terminationReason, a.terminationReason);
});

test('admin results: search, filters, sorting, pagination (combined)', async () => {
  const H = await adminH(), tag = 'RZ' + String(Date.now()).slice(-6);
  const sid = new mongoose.Types.ObjectId(), sid2 = new mongoose.Types.ObjectId();
  const mk = (n, roll, dept, yr, test, marks, iso, id) => ({ studentId: id || new mongoose.Types.ObjectId(), studentName: n, rollNumber: tag + roll, department: dept, yearOfStudy: yr, testName: test, totalMarks: marks, submissionDate: new Date(iso) });
  const docs = [
    mk('Anitha Rao', '01', 'CSE', '4th Year', 'Aptitude Mock Test 1', 40, '2026-11-18T05:00:00Z', sid),
    mk('Bhavana K', '02', 'CSE', '3rd Year', 'Aptitude Mock Test 1', 55.5, '2026-11-18T09:00:00Z'),
    mk('Chandana P', '03', 'ECE', '4th Year', 'Technical Mock Test 1', 62, '2026-11-19T05:00:00Z', sid2),
    mk('Divya S', '04', 'CSE', '4th Year', 'Technical Mock Test 1', 71, '2026-11-19T05:30:00Z'),
    mk('Esha M', '05', 'IT', '4th Year', 'Company Assessment 1', 18, '2026-11-17T18:45:00Z'),   // = 18-Nov 00:15 IST
    mk('Fatima Z', '06', 'ECE', '3rd Year', 'Company Assessment 1', 33, '2026-11-17T18:00:00Z')  // = 17-Nov 23:30 IST
  ];
  await TestResult.insertMany(docs);
  const get = async (qs, path = '/admin/results') => (await api('GET', `${path}?q=${tag}&${qs}`, null, H)).body;
  try {
    assert.equal((await api('GET', '/admin/results')).status, 401); assert.equal((await api('GET', '/admin/results/export/excel')).status, 401); assert.equal((await api('GET', '/admin/results/export/csv')).status, 401);
    assert.equal((await get('')).total, 6);
    assert.equal((await get('', '/admin/results/filter')).total, 6);
    // search by name / roll / test
    assert.deepEqual((await get('')).results.length, 6);
    assert.equal((await api('GET', '/admin/results?q=anitha', null, H)).body.results.some(r => r.rollNumber === tag + '01'), true);
    assert.equal((await api('GET', `/admin/results?q=${tag}03`, null, H)).body.total, 1);
    assert.equal((await api('GET', `/admin/results?q=Company%20Assessment&department=IT&year=4th%20Year`, null, H)).body.results.filter(r => r.rollNumber.startsWith(tag)).length, 1);
    // each filter
    assert.equal((await get('department=CSE')).total, 3);
    assert.equal((await get('year=3rd%20Year')).total, 2);
    assert.equal((await get('testName=Technical%20Mock%20Test%201')).total, 2);
    assert.equal((await get(`studentId=${sid}`)).total, 1);
    assert.equal((await get('date=2026-11-18')).total, 3);        // includes 00:15 IST, excludes 23:30 IST on the 17th
    assert.equal((await get('date=2026-11-17')).total, 1);
    assert.equal((await get('from=2026-11-18&to=2026-11-19')).total, 5);
    assert.equal((await get('from=2026-11-19')).total, 2);
    assert.equal((await get('to=2026-11-17')).total, 1);
    assert.equal((await get('from=2026-11-20&to=2026-11-19')).total, 0);
    // combined: Department CSE + Test + Date
    const c = await get('department=CSE&testName=Aptitude%20Mock%20Test%201&date=2026-11-18');
    assert.equal(c.total, 2); assert.ok(c.results.every(r => r.department === 'CSE' && r.testName === 'Aptitude Mock Test 1'));
    assert.equal((await get('department=CSE&year=4th%20Year&from=2026-11-18&to=2026-11-19')).total, 2);
    // sorting
    const names = async (sort, order) => (await get(`sort=${sort}&order=${order}`)).results.map(r => r.studentName);
    assert.deepEqual(await names('totalMarks', 'asc'), ['Esha M', 'Fatima Z', 'Anitha Rao', 'Bhavana K', 'Chandana P', 'Divya S']);
    assert.deepEqual(await names('totalMarks', 'desc'), ['Divya S', 'Chandana P', 'Bhavana K', 'Anitha Rao', 'Fatima Z', 'Esha M']);
    assert.deepEqual((await names('studentName', 'asc')), ['Anitha Rao', 'Bhavana K', 'Chandana P', 'Divya S', 'Esha M', 'Fatima Z']);
    assert.deepEqual(await names('studentName', 'desc'), ['Fatima Z', 'Esha M', 'Divya S', 'Chandana P', 'Bhavana K', 'Anitha Rao']);
    assert.equal((await get('sort=rollNumber&order=asc')).results[0].rollNumber, tag + '01');
    assert.equal((await get('sort=department&order=asc')).results[0].department, 'CSE');
    assert.equal((await get('sort=submissionDate&order=asc')).results[0].studentName, 'Fatima Z');
    for (const f of ['yearOfStudy', 'testName']) assert.equal((await get(`sort=${f}&order=desc`)).total, 6);
    assert.equal((await get('sort=DROP&order=asc')).total, 6);   // unknown sort ignored
    // pagination
    const p1 = await get('limit=4&page=1&sort=totalMarks&order=asc'), p2 = await get('limit=4&page=2&sort=totalMarks&order=asc');
    assert.equal(p1.results.length, 4); assert.equal(p2.results.length, 2); assert.equal(p1.totalPages, 2); assert.equal(p2.page, 2);
    assert.equal(new Set([...p1.results, ...p2.results].map(r => r.resultId)).size, 6);
    assert.equal((await api('GET', '/admin/results?date=31-12-2026', null, H)).status, 400);
    assert.equal((await api('GET', '/admin/results?studentId=zzz', null, H)).status, 400);
    const o = (await api('GET', '/admin/results/options', null, H)).body; assert.ok(o.departments.includes('CSE') && o.testNames.includes('Aptitude Mock Test 1'));

    // ---- Excel export: real file, same filters, same data as MongoDB ----
    const xl = async qs => {
      const r = await raw(`/admin/results/export/excel?q=${tag}&${qs}`, H);
      assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /spreadsheetml/);
      const wb = new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(await r.arrayBuffer()));
      const ws = wb.worksheets[0]; const rows = [];
      ws.eachRow((row, n) => { if (n >= 7) rows.push(row.values.slice(1)); });
      return { r, ws, rows, name: /filename="([^"]+)"/.exec(r.headers.get('content-disposition'))[1] };
    };
    let x = await xl('sort=rollNumber&order=asc');
    assert.equal(x.ws.getCell('B1').value, "VIGNAN'S INSTITUTE OF ENGINEERING FOR WOMEN");
    assert.match(String(x.ws.getCell('B3').value), /Report generated on/);
    assert.deepEqual(x.ws.getRow(6).values.slice(1), ['Student ID', 'Student Name', 'Roll Number', 'Department', 'Year of Study', 'Test Name', 'Total Marks', 'Submission Date']);
    assert.equal(x.rows.length, 6); assert.ok(x.ws.getCell('A6').font.bold && x.ws.getCell('H6').font.bold);
    const db = await TestResult.find({ rollNumber: { $regex: '^' + tag } }).sort({ rollNumber: 1 }).lean();
    db.forEach((d, i) => {
      const [sidc, name, rl, dept, yr, test, marks, when] = x.rows[i];
      assert.equal(sidc, String(d.studentId)); assert.equal(name, d.studentName); assert.equal(rl, d.rollNumber); assert.equal(dept, d.department);
      assert.equal(yr, d.yearOfStudy); assert.equal(test, d.testName); assert.equal(marks, d.totalMarks); assert.equal(typeof marks, 'number');
      assert.equal(when.getTime(), d.submissionDate.getTime() + 330 * 60000);            // shown as IST wall-clock time
    });
    assert.equal(x.name.endsWith('.xlsx'), true);
    // filtered exports contain ONLY matching rows
    x = await xl('department=CSE'); assert.equal(x.rows.length, 3); assert.ok(x.rows.every(r => r[3] === 'CSE')); assert.match(x.name, /^CSE_Placement_Results/);
    x = await xl('testName=Technical%20Mock%20Test%201'); assert.equal(x.rows.length, 2); assert.match(x.name, /^Technical_Mock_Test_1_Results/);
    x = await xl('date=2026-11-18'); assert.equal(x.rows.length, 3); assert.match(x.name, /18_Nov_2026/);
    x = await xl('from=2026-11-19&to=2026-11-19'); assert.equal(x.rows.length, 2);
    x = await xl('department=CSE&testName=Aptitude%20Mock%20Test%201&date=2026-11-18'); assert.equal(x.rows.length, 2);
    x = await xl('department=NONE'); assert.equal(x.rows.length, 1); assert.match(String(x.rows[0][0]), /No results match/);   // empty export is still a valid file
    const all = await raw('/admin/results/export/excel', H); assert.match(all.headers.get('content-disposition'), /Placement_All_Results\.xlsx/);
    assert.equal(Number(all.headers.get('x-record-count')), await TestResult.countDocuments());

    // ---- CSV ----
    const cr = await raw(`/admin/results/export/csv?q=${tag}&department=ECE&sort=totalMarks&order=asc`, H);
    assert.match(cr.headers.get('content-type'), /text\/csv/);
    const lines = (await cr.text()).replace(/^﻿/, '').trim().split(/\r\n/);
    assert.equal(lines[0], 'Student ID,Student Name,Roll Number,Department,Year of Study,Test Name,Total Marks,Submission Date');
    assert.equal(lines.length, 3); assert.ok(lines[1].includes('Fatima Z') && lines[1].includes('33') && lines[1].includes('2026-11-17 23:30'));
  } finally { await TestResult.deleteMany({ rollNumber: { $regex: '^' + tag } }); }
});

test('admin analytics + stats use real data', async () => {
  const H = await adminH();
  const st = (await api('GET', '/admin/stats', null, H)).body;
  for (const k of ['students', 'totalScheduledTests', 'testsToday', 'totalAttempts', 'completedTests']) assert.equal(typeof st[k], 'number');
  assert.equal(st.testsToday, 1); assert.equal(st.completedTests, await TestResult.countDocuments());
  const an = (await api('GET', '/admin/analytics', null, H)).body;
  assert.equal(an.byDepartment.reduce((a, d) => a + d.students, 0), await Student.countDocuments());
  assert.equal(an.byTest.reduce((a, t) => a + t.attempts, 0), await TestResult.countDocuments());
});


test('admin-configurable sections: add, edit, reorder, disable, remove, preview, activation rules, timer follows config', async () => {
  const H = await adminH();
  const sec = (name, q, mpq, min, extra = {}) => ({ sectionName: name, questionCount: q, marksPerQuestion: mpq, durationMinutes: min, type: 'objective', ...extra });
  const secs = [sec('Alpha Logic', 2, 1.5, 1, { displayOrder: 1 }), sec('Beta Extra', 1, 3, 2, { displayOrder: 2, isEnabled: false }), sec('Gamma Writing', 1, 0, 1, { displayOrder: 3, type: 'descriptive' })];
  let r = await api('POST', '/admin/tests', { testName: 'Dynamic Sections ' + roll, scheduledDate: today(), sections: secs }, H);
  assert.equal(r.status, 201); const t = r.body.test;
  // totals come from ENABLED sections only
  assert.equal(t.totalDuration, 2); assert.equal(t.totalMarks, 3);
  assert.equal(t.preview.totalSections, 2); assert.equal(t.preview.totalQuestions, 3); assert.deepEqual(t.preview.sections.map(s => s.sectionName), ['Alpha Logic', 'Gamma Writing']);
  const key = n => t.sections.find(s => s.sectionName === n).key;
  assert.equal(t.sections.find(s => s.sectionName === 'Alpha Logic').totalMarks, 3);
  // cannot activate until the bank has the configured counts (disabled sections are not required)
  r = await api('PUT', '/admin/tests/' + t.id, { isActive: true }, H);
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'ACTIVATION_BLOCKED'); assert.equal(r.body.error.details.shortages.length, 2);
  const addQ = (k, n, extra = {}) => api('POST', `/admin/tests/${t.id}/questions`, { section: k, text: 'Dynamic question ' + n + ' ' + roll, options: ['a', 'b', 'c', 'd'], correctOption: 1, difficulty: 'Hard', ...extra }, H);
  assert.equal((await addQ(key('Alpha Logic'), 1)).status, 201);
  assert.equal((await api('PUT', '/admin/tests/' + t.id, { isActive: true }, H)).status, 409);                 // still short by one
  const q2 = await addQ(key('Alpha Logic'), 2); assert.equal(q2.status, 201); assert.equal(q2.body.question.difficulty, 'Hard');
  assert.equal((await addQ(key('Alpha Logic'), 3)).status, 409);                                                // section full
  assert.equal((await api('POST', `/admin/tests/${t.id}/questions`, { section: key('Gamma Writing'), text: 'Describe a challenge you solved.' }, H)).status, 201);
  assert.equal((await api('PUT', '/admin/tests/' + t.id, { isActive: true }, H)).status, 200);
  // enabling Beta while live is refused (it has no questions); the test stays consistent
  const enableBeta = t.sections.map(s => ({ ...s, isEnabled: true }));
  r = await api('PUT', '/admin/tests/' + t.id, { sections: enableBeta }, H); assert.equal(r.status, 409);
  // a student takes it: the attempt follows the admin configuration (two sections, admin durations)
  const stu = (await api('POST', '/students/register', { studentName: 'Dynamic Tester', rollNumber: 'DY' + roll.slice(2), department: 'CSE', yearOfStudy: '4th Year' })).body.student;
  const st = await api('POST', `/tests/${t.id}/start`, { studentId: stu._id }); assert.equal(st.status, 201);
  const tok = { 'x-attempt-token': st.body.token };
  let a = (await api('GET', '/attempts/' + st.body.attemptId, null, tok)).body.attempt;
  assert.deepEqual(a.sections.map(s => s.name), ['Alpha Logic', 'Gamma Writing']);
  assert.equal(a.timer.sectionDurationMs, 60000); assert.equal(a.progress.totalQuestions, 3);
  let qs = (await api('GET', `/attempts/${st.body.attemptId}/questions`, null, tok)).body;
  assert.equal(qs.questions.length, 2); assert.ok(qs.questions.every(x => x.marks === 1.5));
  // removing/disabling a section is blocked while an exam is in progress
  r = await api('PUT', '/admin/tests/' + t.id, { sections: t.sections.filter(s => s.sectionName !== 'Alpha Logic') }, H); assert.equal(r.status, 409); assert.equal(r.body.error.code, 'IN_USE');
  // answers: correct (index 1) and one wrong
  await api('POST', `/attempts/${st.body.attemptId}/answers`, { answers: [{ questionId: qs.questions[0].id, selected: 1 }, { questionId: qs.questions[1].id, selected: 0 }] }, tok);
  const ch = await api('POST', `/attempts/${st.body.attemptId}/section`, { fromSection: 0 }, tok);
  assert.equal(ch.status, 200); assert.equal(ch.body.currentSection, 1);
  assert.equal(ch.body.timer.sectionDurationMs, 60000);                                                         // Gamma's own timer (disabled Beta is skipped)
  const done = await api('POST', `/attempts/${st.body.attemptId}/submit`, {}, tok); assert.equal(done.status, 200);
  assert.equal(done.body.totalMarks, 1.5);                                                                      // 1 correct x 1.5 marks
  // now that nothing is running: edit the configuration freely - reorder, rename, remove
  const edited = [{ ...t.sections.find(s => s.sectionName === 'Gamma Writing'), displayOrder: 1 }, { ...t.sections.find(s => s.sectionName === 'Alpha Logic'), sectionName: 'Alpha Reasoning', displayOrder: 2, durationMinutes: 4 }];
  r = await api('PUT', '/admin/tests/' + t.id, { sections: edited }, H); assert.equal(r.status, 200);
  assert.deepEqual(r.body.test.preview.sections.map(s => s.sectionName), ['Gamma Writing', 'Alpha Reasoning']);
  assert.equal(r.body.test.totalDuration, 5);                                                                   // beta removed, recomputed
  assert.equal(await Question.countDocuments({ testId: t.id, section: key('Beta Extra') }), 0);
  assert.equal((await api('DELETE', '/admin/tests/' + t.id, null, H)).status, 200);
});
