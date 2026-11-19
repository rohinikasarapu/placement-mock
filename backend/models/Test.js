const mongoose = require('mongoose');
const { SECTIONS, sectionTotals } = require('../config/pattern');

const sectionSchema = new mongoose.Schema({
  key: String, sectionName: String, name: String, questionCount: Number, marksPerQuestion: Number, totalMarks: Number,
  durationMinutes: Number, isEnabled: { type: Boolean, default: true }, displayOrder: Number,
  type: { type: String, enum: ['objective', 'descriptive'] }
}, { _id: false });

// A scheduled mock test. scheduledDate is an IST calendar date ('YYYY-MM-DD'); students can start it only on that day.
const testSchema = new mongoose.Schema({
  testName: { type: String, required: true, trim: true, unique: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 400, default: '' },
  scheduledDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  totalDuration: { type: Number, default: 0 },   // minutes, derived from sections
  totalMarks: { type: Number, default: 0 },      // objective marks, derived from sections
  sections: { type: [sectionSchema], default: () => SECTIONS.map(s => ({ ...s })) },
  isActive: { type: Boolean, default: false },   // a test goes live only after the question bank covers every enabled section
  // Seed marker: content created by `npm run seed` is flagged so it can be told apart from admin-created tests.
  isSeeded: { type: Boolean, default: false }, seedKey: { type: String, index: true, sparse: true }
}, { versionKey: false, timestamps: true });      // createdAt, updatedAt

testSchema.pre('validate', function () {
  const t = sectionTotals(this.sections);   // enabled sections only
  this.totalDuration = t.duration; this.totalMarks = t.marks;
});

module.exports = mongoose.model('Test', testSchema);
