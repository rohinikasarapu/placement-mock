const TestResult = require('../models/TestResult');
const Student = require('../models/Student');
const Attempt = require('../models/Attempt');
const ApiError = require('../utils/ApiError');
const Test = require('../models/Test');
const { cached } = require('../utils/ttlCache');
const { assertObjectId } = require('../utils/validate');

// maxMarks is looked up from the test for display only; it is NOT stored in TestResults.
async function withMax(results) {
  const tests = await cached('testTotals', 30000, () => Test.find().select('testName totalMarks').lean());
  const m = Object.fromEntries(tests.map(t => [t.testName, t.totalMarks]));
  return results.map(r => ({ ...r.toObject(), maxMarks: m[r.testName] ?? null }));
}

exports.byStudent = async (req, res) => {
  assertObjectId(req.params.studentId, 'student id');
  const results = await TestResult.find({ studentId: req.params.studentId }).sort({ submissionDate: -1 });
  res.json({ results: await withMax(results) });
};

exports.byRoll = async (req, res) => {
  const roll = String(req.params.rollNumber || '').trim().toUpperCase();
  const results = await TestResult.find({ rollNumber: roll }).sort({ submissionDate: -1 });
  res.json({ results: await withMax(results) });
};

// Result document (8 fields) + the section-wise breakdown kept with the attempt.
exports.getById = async (req, res) => {
  assertObjectId(req.params.id, 'result id');
  const result = await TestResult.findById(req.params.id);
  if (!result) throw new ApiError(404, 'Result not found', 'NOT_FOUND');
  const att = await Attempt.findOne({ resultId: result._id }).lean();
  res.json({ result, breakdown: att && att.evaluation ? { ...att.evaluation, startedAt: att.startedAt, submitReason: att.submitReason, terminationReason: att.terminationReason || null, violationCount: att.violationCount || 0 } : null });
};
