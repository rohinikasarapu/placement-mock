const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  key: String, name: String, sectionName: String, questionCount: Number, marksPerQuestion: Number, totalMarks: Number, durationMinutes: Number,
  type: { type: String }   // 'objective' | 'descriptive' (explicit form: a bare `type` key would be read as the schema type)
}, { _id: false });

// Exam-session state (timer, responses, answer key snapshot). Kept OUT of TestResults on purpose.
const attemptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  testName: String,
  token: { type: String, required: true },                 // secret held by the browser that started the attempt
  status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress', index: true },
  sections: [sectionSchema],
  paper: { type: [mongoose.Schema.Types.Mixed], select: false },   // snapshot of questions incl. answer key
  currentSection: { type: Number, default: 0 },
  sectionStartedAt: { type: Date },
  sectionEndsAt: { type: Date },                           // sectionStartedAt + section duration; indexed for the auto-submit sweeper                        // server timestamp: the source of truth for timers
  startedAt: { type: Date, default: Date.now },
  submittedAt: Date,
  submitReason: { type: String, enum: ['manual', 'timeout', 'violation'] },
  terminationReason: String,                                // set when the exam is terminated for violations
  violationCount: { type: Number, default: 0 },
  violations: { type: [new mongoose.Schema({ type: { type: String }, at: Date }, { _id: false })], default: [] },
  responses: { type: mongoose.Schema.Types.Mixed, default: {} },   // { [questionId]: {selected, written, visited, marked} }
  resultId: { type: mongoose.Schema.Types.ObjectId },
  evaluation: mongoose.Schema.Types.Mixed                   // section-wise breakdown shown on the result page
}, { versionKey: false, minimize: false, collection: 'testattempts' });

attemptSchema.index({ studentId: 1, testId: 1, status: 1 });
attemptSchema.index({ status: 1, sectionEndsAt: 1 });
attemptSchema.index({ testId: 1, status: 1 });

module.exports = mongoose.model('Attempt', attemptSchema);
