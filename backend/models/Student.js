const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  rollNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  department: { type: String, required: true, trim: true, maxlength: 40 },
  yearOfStudy: { type: String, required: true, trim: true },
  registrationDate: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('Student', studentSchema);
