const mongoose = require('mongoose');

// EXACTLY eight stored fields (plus MongoDB's own _id). Do not add more.
const testResultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  studentName: { type: String, required: true },
  rollNumber: { type: String, required: true, index: true },
  department: { type: String, required: true },
  yearOfStudy: { type: String, required: true },
  testName: { type: String, required: true },
  totalMarks: { type: Number, required: true },
  submissionDate: { type: Date, default: Date.now }
}, { versionKey: false, strict: true });

module.exports = mongoose.model('TestResult', testResultSchema);
