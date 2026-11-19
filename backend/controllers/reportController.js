const TestResult = require('../models/TestResult');
const Student = require('../models/Student');
const Test = require('../models/Test');
const { parseQuery, COLLATION } = require('../services/resultQuery');
const { buildWorkbook, buildCsv, fileBase } = require('../services/exportService');

const MAX_EXPORT = 50000;
// Case-insensitive ordering via collation (MongoDB/Atlas). Falls back to default ordering on servers without collation support.
async function find(p, { skip = 0, limit = 0 } = {}) {
  const run = useCollation => {
    let q = TestResult.find(p.filter);
    if (useCollation) q = q.collation(COLLATION);
    q = q.sort(p.sort).skip(skip);
    if (limit) q = q.limit(limit);
    return q.lean();
  };
  try { return await run(true); } catch (e) { if (e && (e.code === 238 || /collation/i.test(e.message))) return run(false); throw e; }
}
const view = r => ({ studentId: String(r.studentId), resultId: r._id, studentName: r.studentName, rollNumber: r.rollNumber, department: r.department, yearOfStudy: r.yearOfStudy, testName: r.testName, totalMarks: r.totalMarks, submissionDate: r.submissionDate });

// GET /api/admin/results and /results/filter : search + filters + sorting + pagination (all via query string)
exports.results = async (req, res) => {
  const p = parseQuery(req.query);
  const [total, rows] = await Promise.all([
    TestResult.countDocuments(p.filter),
    find(p, { skip: (p.page - 1) * p.limit, limit: p.limit })
  ]);
  res.json({ results: rows.map(view), page: p.page, limit: p.limit, total, totalPages: Math.max(1, Math.ceil(total / p.limit)), sort: p.sortBy, order: p.order });
};

// Values for the filter drop-downs (taken from real data)
exports.options = async (req, res) => {
  const [departments, years, testNames, tests] = await Promise.all([
    TestResult.distinct('department'), TestResult.distinct('yearOfStudy'), TestResult.distinct('testName'), Test.find().select('testName').lean()
  ]);
  const names = [...new Set([...testNames, ...tests.map(t => t.testName)])].sort();
  res.json({ departments: departments.sort(), years: years.sort(), testNames: names });
};

async function exportRows(req) {
  const q = req.query, p = parseQuery(q);
  const rows = await find(p, { limit: MAX_EXPORT });   // exports honour the exact same filters/sort, ignore pagination
  return { rows, base: fileBase(q), q };
}

exports.exportExcel = async (req, res) => {
  const { rows, base, q } = await exportRows(req);
  const wb = await buildWorkbook(rows, q);
  res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${base}.xlsx"`, 'Cache-Control': 'no-store', 'X-Record-Count': String(rows.length) });
  await wb.xlsx.write(res);
  res.end();
};

exports.exportCsv = async (req, res) => {
  const { rows, base } = await exportRows(req);
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${base}.csv"`, 'Cache-Control': 'no-store', 'X-Record-Count': String(rows.length) });
  res.send(buildCsv(rows));
};

// Real participation / performance numbers for the overview charts (no sample data)
exports.analytics = async (req, res) => {
  const [students, results] = await Promise.all([Student.find().select('department').lean(), TestResult.find().select('studentId department testName totalMarks').lean()]);
  const dept = {};
  students.forEach(s => { (dept[s.department] || (dept[s.department] = { department: s.department, students: 0, participated: new Set(), attempts: 0 })).students++; });
  const tests = {};
  results.forEach(r => {
    const d = dept[r.department] || (dept[r.department] = { department: r.department, students: 0, participated: new Set(), attempts: 0 });
    d.participated.add(String(r.studentId)); d.attempts++;
    const t = tests[r.testName] || (tests[r.testName] = { testName: r.testName, attempts: 0, sum: 0, highest: -Infinity, lowest: Infinity });
    t.attempts++; t.sum += r.totalMarks; t.highest = Math.max(t.highest, r.totalMarks); t.lowest = Math.min(t.lowest, r.totalMarks);
  });
  res.json({
    byDepartment: Object.values(dept).map(d => ({ department: d.department, students: d.students, participated: d.participated.size, attempts: d.attempts })).sort((a, b) => b.students - a.students),
    byTest: Object.values(tests).map(t => ({ testName: t.testName, attempts: t.attempts, average: Math.round(t.sum / t.attempts * 100) / 100, highest: t.highest, lowest: t.lowest }))
  });
};
