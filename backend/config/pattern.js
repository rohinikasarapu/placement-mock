// Section configuration.
// A test owns an ordered list of sections. Admins can add, edit, enable/disable and remove sections; the values below are only
// the DEFAULT template offered when a new test is created (the 7-section placement pattern).
//
// Section fields: sectionName, questionCount, marksPerQuestion, totalMarks, durationMinutes, isEnabled, displayOrder.
// `key` is a stable slug used by questions/answers; `name` mirrors sectionName (kept for attempt snapshots and the exam UI).
const DEFAULT_SECTIONS = [
  { sectionName: 'Reasoning Ability',         questionCount: 15, marksPerQuestion: 1,   durationMinutes: 25, type: 'objective' },
  { sectionName: 'Technical Ability (Quant)', questionCount: 10, marksPerQuestion: 1,   durationMinutes: 35, type: 'objective' },
  { sectionName: 'Verbal',                    questionCount: 20, marksPerQuestion: 1,   durationMinutes: 20, type: 'objective' },
  { sectionName: 'Pseudo Code',               questionCount: 5,  marksPerQuestion: 2,   durationMinutes: 10, type: 'objective' },
  { sectionName: 'Numerical Puzzle',          questionCount: 4,  marksPerQuestion: 2.5, durationMinutes: 10, type: 'objective' },
  { sectionName: 'English Grammar Test',      questionCount: 5,  marksPerQuestion: 2,   durationMinutes: 10, type: 'objective' },
  { sectionName: 'English Written Test',      questionCount: 1,  marksPerQuestion: 0,   durationMinutes: 10, type: 'descriptive' }
];
const KEYS = ['reasoning', 'quant', 'verbal', 'pseudocode', 'puzzle', 'grammar', 'written'];

const r2 = n => Math.round(n * 100) / 100;
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'section';

// Fills in key/name/totalMarks/isEnabled/displayOrder on well-formed section objects (no validation).
function decorate(list) {
  return list.map((s, i) => ({
    key: s.key || KEYS[i] || slug(s.sectionName),
    sectionName: s.sectionName, name: s.sectionName,
    questionCount: s.questionCount, marksPerQuestion: s.marksPerQuestion,
    totalMarks: r2(s.questionCount * s.marksPerQuestion), durationMinutes: s.durationMinutes,
    isEnabled: s.isEnabled !== false, displayOrder: s.displayOrder || i + 1, type: s.type
  }));
}
const SECTIONS = decorate(DEFAULT_SECTIONS);

// Enabled sections in exam order.
const activeSections = sections => sections.filter(s => s.isEnabled !== false).slice().sort((a, b) => a.displayOrder - b.displayOrder);

const sectionTotals = sections => {
  const on = activeSections(sections);
  return {
    sections: on.length,
    questions: on.reduce((a, s) => a + s.questionCount, 0),
    marks: r2(on.filter(s => s.type === 'objective').reduce((a, s) => a + s.totalMarks, 0)),
    duration: on.reduce((a, s) => a + s.durationMinutes, 0)
  };
};
const totals = () => { const t = sectionTotals(SECTIONS); return { sections: t.sections, questions: t.questions, objectiveMarks: t.marks, durationMinutes: t.duration }; };

// Validates an admin-supplied list. Returns { sections } or { error, errors }.
function normalizeSections(input) {
  if (!Array.isArray(input) || !input.length) return { error: 'Add at least one section' };
  if (input.length > 20) return { error: 'A test can have at most 20 sections' };
  const errors = {}, out = [], names = new Set(), keys = new Set();
  input.forEach((x, i) => {
    x = x || {};
    const label = `Section ${i + 1}`;
    const name = String(x.sectionName ?? x.name ?? '').trim();
    const fail = m => { if (!errors[i]) errors[i] = `${name || label}: ${m}`; };
    if (name.length < 2 || name.length > 60) return fail('name must be 2-60 characters');
    if (names.has(name.toLowerCase())) return fail('duplicate section name');
    names.add(name.toLowerCase());
    const type = x.type === 'descriptive' ? 'descriptive' : 'objective';
    const q = Number(x.questionCount), d = Number(x.durationMinutes);
    if (!Number.isInteger(q) || q < 0 || q > 200) return fail('number of questions must be 0-200');
    if (!Number.isFinite(d) || !Number.isInteger(d) || d < 0 || d > 300) return fail('time must be 0-300 minutes');
    let mpq = 0;
    if (type === 'objective') {
      if (x.marksPerQuestion !== undefined && x.marksPerQuestion !== '' && x.marksPerQuestion !== null) mpq = Number(x.marksPerQuestion);
      else if (x.totalMarks !== undefined && x.totalMarks !== '') mpq = Number(x.totalMarks) / q;
      else return fail('marks are required');
      if (!Number.isFinite(mpq) || mpq < 0 || mpq > 100) return fail('marks per question must be 0-100');
    }
    let key = String(x.key || '').trim();
    if (!/^[a-z0-9-]{1,40}$/.test(key) || keys.has(key)) key = slug(name);
    for (let n = 2; keys.has(key); n++) key = `${slug(name)}-${n}`;
    keys.add(key);
    const order = Number(x.displayOrder);
    out.push({ key, sectionName: name, name, questionCount: q, marksPerQuestion: r2(mpq), totalMarks: r2(mpq * q), durationMinutes: d,
      isEnabled: x.isEnabled === undefined ? true : (x.isEnabled === true || x.isEnabled === 'true'), displayOrder: Number.isFinite(order) ? order : i + 1, type, _i: i });
  });
  if (Object.keys(errors).length) return { error: Object.values(errors)[0], errors };
  out.sort((a, b) => a.displayOrder - b.displayOrder || a._i - b._i);
  out.forEach((s, i) => { s.displayOrder = i + 1; delete s._i; });
  if (!out.some(s => s.isEnabled)) return { error: 'Enable at least one section' };
  return { sections: out };
}

module.exports = { DEFAULT_SECTIONS, SECTIONS, normalizeSections, sectionTotals, activeSections, totals, slug };
