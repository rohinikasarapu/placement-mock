// Seeds five original placement mock tests. By default they are ACTIVE: test 1 is scheduled for TODAY (IST), the others
// 2, 4, 6 and 8 days later (students see a test only on its date). SEED_DRAFT=1 creates them inactive instead.
//
//   npm run seed                 create whichever of the five tests do not exist yet (safe to run any number of times)
//   npm run seed -- --force      re-apply dates/active state and re-create the questions of seeded tests that nobody has attempted yet
//   SEED_FIRST_OFFSET=2 SEED_GAP_DAYS=3 npm run seed    choose the schedule (days from today, IST)
//
// Safety: it never modifies or deletes anything that was not created by this seed. Seeded tests and questions carry
// isSeeded: true and a seedKey; an existing test with the same name that is NOT seeded is left alone.
require('dotenv').config();
const connectDB = require('../config/db');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const { DEFAULT_SECTIONS, normalizeSections } = require('../config/pattern');
const { today } = require('../utils/schedule');

const bank = {
  reasoning: { ...require('./bank/reasoning_a'), ...require('./bank/reasoning_b') },
  quant: require('./bank/quant'),
  verbal: require('./bank/language').verbal,
  pseudocode: require('./bank/pseudo'),
  puzzle: require('./bank/numerical'),
  grammar: require('./bank/language').grammar,
  written: require('./bank/language').written
};
const TESTS = [
  { seedKey: 'apt1', testName: 'Placement Aptitude Mock Test 1', description: 'General aptitude: reasoning, quantitative ability, verbal, pseudo code, numerical puzzles, grammar and a written task.' },
  { seedKey: 'apt2', testName: 'Placement Aptitude Mock Test 2', description: 'Second aptitude practice set with fresh questions in every section.' },
  { seedKey: 'tech1', testName: 'Technical Assessment Mock Test 1', description: 'Technical-leaning placement mock: logic, quantitative ability, code tracing and puzzles.' },
  { seedKey: 'tech2', testName: 'Technical Assessment Mock Test 2', description: 'Second technical assessment set with fresh questions in every section.' },
  { seedKey: 'company1', testName: 'Company Placement Mock Test 1', description: 'Full-length mock modelled on a typical company recruitment drive.' }
];

const addDays = (day, n) => { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const sections = () => normalizeSections(DEFAULT_SECTIONS.map((s, i) => ({ ...s, key: ['reasoning', 'quant', 'verbal', 'pseudocode', 'puzzle', 'grammar', 'written'][i], displayOrder: i + 1, isEnabled: true }))).sections;

// Everything is validated in memory first, so a bad bank can never leave a half-seeded test behind.
function build(t, secs) {
  const rows = [], problems = [];
  for (const sec of secs) {
    const items = (bank[sec.key] || {})[t.seedKey] || [];
    if (items.length !== sec.questionCount) problems.push(`${t.testName} / ${sec.sectionName}: expected ${sec.questionCount}, found ${items.length}`);
    items.forEach((it, i) => {
      const base = { section: sec.key, order: i + 1, text: String(it.text).trim(), difficulty: it.difficulty, topic: it.topic, questionType: sec.type, marks: sec.type === 'objective' ? sec.marksPerQuestion : 0, isSeeded: true, seedKey: `${t.seedKey}:${sec.key}:${i + 1}` };
      if (!['Easy', 'Medium', 'Hard'].includes(it.difficulty)) problems.push(`${base.seedKey}: bad difficulty`);
      if (sec.type === 'descriptive') return rows.push({ ...base, options: [] });
      const opts = it.options || [];
      if (opts.length !== 4 || new Set(opts).size !== 4 || opts.some(o => !String(o).trim())) problems.push(`${base.seedKey}: needs 4 distinct options`);
      if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer > 3) problems.push(`${base.seedKey}: bad answer index`);
      rows.push({ ...base, options: opts, correctOption: it.answer });
    });
  }
  return { rows, problems };
}

(async () => {
  const force = process.argv.includes('--force');
  const draft = process.env.SEED_DRAFT === '1';
  const first = +(process.env.SEED_FIRST_OFFSET || 0), gap = +(process.env.SEED_GAP_DAYS || 2);
  const secs = sections();
  const built = TESTS.map(t => ({ t, ...build(t, secs) }));
  const seen = new Map(), problems = built.flatMap(b => b.problems);
  built.forEach(b => b.rows.forEach(r => { const k = r.text.toLowerCase(); if (seen.has(k)) problems.push(`duplicate question text: ${r.seedKey} = ${seen.get(k)}`); else seen.set(k, r.seedKey); }));
  if (problems.length) { console.error('Question bank problems:\n  ' + problems.join('\n  ')); process.exit(1); }

  await connectDB();
  await Test.init(); await Question.init();
  const base = today();
  let n = 0;
  for (const { t, rows } of built) {
    const date = addDays(base, first + gap * n++);
    let test = await Test.findOne({ $or: [{ seedKey: t.seedKey, isSeeded: true }, { testName: t.testName }] });
    if (test && !test.isSeeded) { console.log(`skip   "${t.testName}": a test with this name already exists and was not created by the seed (left untouched)`); continue; }
    if (test && !force) { console.log(`exists "${t.testName}" (${await Question.countDocuments({ testId: test._id })} questions, ${test.scheduledDate}, ${test.isActive ? 'active' : 'draft'}) - unchanged`); continue; }
    if (test) {
      if (await Attempt.exists({ testId: test._id })) { console.log(`skip   "${t.testName}": students have attempted it, questions not replaced`); continue; }
      await Question.deleteMany({ testId: test._id });
      test.sections = secs; test.description = t.description;
    } else {
      test = await Test.create({ testName: t.testName, description: t.description, scheduledDate: date, sections: secs, isActive: false, isSeeded: true, seedKey: t.seedKey });
    }
    await Question.insertMany(rows.map(r => ({ ...r, testId: test._id })));
    if (!draft) { test.scheduledDate = date; test.isActive = true; await test.save(); }   // question bank is complete, so it can go live
    console.log(`${force ? 'reset ' : 'create'} "${t.testName}": ${rows.length} questions, ${test.totalMarks} marks, ${test.totalDuration} min, scheduled ${test.scheduledDate}, ${test.isActive ? 'ACTIVE' : 'draft'}`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
