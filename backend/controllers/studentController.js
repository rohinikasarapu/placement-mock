const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { assertObjectId, validateRegistration } = require('../utils/validate');

exports.register = async (req, res) => {
  const data = validateRegistration(req.body);
  let student;
  try { student = await Student.create(data); }   // the unique index is the single, race-free duplicate check (one DB write, no pre-read)
  catch (e) {
    if (e && e.code === 11000) throw new ApiError(409, `Roll number ${data.rollNumber} is already registered. Use "Continue with Roll Number" to open your dashboard.`, 'DUPLICATE_ROLL', { rollNumber: 'This roll number is already registered' });
    throw e;
  }
  res.status(201).json({ message: 'Registration successful', student });
};

exports.getById = async (req, res) => {
  assertObjectId(req.params.id, 'student id');
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found', 'NOT_FOUND');
  res.json({ student });
};

exports.getByRoll = async (req, res) => {
  const roll = String(req.params.rollNumber || '').trim().toUpperCase();
  const student = await Student.findOne({ rollNumber: roll });
  if (!student) throw new ApiError(404, 'No student registered with this roll number', 'NOT_FOUND');
  res.json({ student });
};
