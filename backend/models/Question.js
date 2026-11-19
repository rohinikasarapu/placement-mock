const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
  section: { type: String, required: true, trim: true },   // key of one of the test's sections
  order: { type: Number, default: 0 },
  text: { type: String, required: true, trim: true },
  options: { type: [String], default: [] },          // 4 options for objective, empty for descriptive
  correctOption: { type: Number, min: 0, max: 3 },   // 0-based index; not used for descriptive
  negativeMarks: { type: Number, default: 0, min: 0 },
  marks: { type: Number, min: 0 },                   // informational; scoring uses the section's marksPerQuestion
  questionType: { type: String, enum: ['objective', 'descriptive'], default: 'objective' },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  topic: { type: String, trim: true, maxlength: 80 },
  isSeeded: { type: Boolean, default: false }, seedKey: { type: String, index: true, sparse: true }
}, { versionKey: false });

module.exports = mongoose.model('Question', questionSchema);
