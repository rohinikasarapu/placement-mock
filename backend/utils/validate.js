const mongoose = require('mongoose');
const ApiError = require('./ApiError');

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS', 'CSM', 'CSD', 'Other'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

function assertObjectId(id, label = 'id') {
  if (!mongoose.isValidObjectId(id) || String(id).length !== 24) throw new ApiError(400, `Invalid ${label}`, 'INVALID_ID');
}

function validateRegistration(body = {}) {
  const errors = {};
  const studentName = String(body.studentName ?? '').trim().replace(/\s+/g, ' ');
  const rollNumber = String(body.rollNumber ?? '').trim().toUpperCase();
  const department = String(body.department ?? '').trim();
  const yearOfStudy = String(body.yearOfStudy ?? '').trim();

  if (!studentName) errors.studentName = 'Student name is required';
  else if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(studentName)) errors.studentName = 'Use 2-80 letters (spaces, . \' - allowed)';

  if (!rollNumber) errors.rollNumber = 'Roll number is required';
  else if (!/^[A-Z0-9]{6,15}$/.test(rollNumber)) errors.rollNumber = 'Roll number must be 6-15 letters/digits (e.g. 22A81A05XX)';

  if (!department) errors.department = 'Department is required';
  else if (!DEPARTMENTS.includes(department)) errors.department = 'Select a valid department';

  if (!yearOfStudy) errors.yearOfStudy = 'Year of study is required';
  else if (!YEARS.includes(yearOfStudy)) errors.yearOfStudy = 'Select a valid year of study';

  if (Object.keys(errors).length) throw new ApiError(400, 'Please correct the highlighted fields', 'VALIDATION_ERROR', errors);
  return { studentName, rollNumber, department, yearOfStudy };
}

function validateQuestionInput(body = {}, section, { partial = false } = {}) {
  const errors = {};
  const out = {};
  if (!partial || body.text !== undefined) {
    const text = String(body.text ?? '').trim();
    if (text.length < 3 || text.length > 4000) errors.text = 'Question text must be 3-4000 characters';
    out.text = text;
  }
  if (section.type === 'objective') {
    if (!partial || body.options !== undefined) {
      const options = Array.isArray(body.options) ? body.options.map(o => String(o ?? '').trim()) : [];
      if (options.length !== 4 || options.some(o => !o)) errors.options = 'Exactly four non-empty options are required';
      out.options = options;
    }
    if (!partial || body.correctOption !== undefined) {
      const c = Number(body.correctOption);
      if (!Number.isInteger(c) || c < 0 || c > 3) errors.correctOption = 'correctOption must be 0-3';
      out.correctOption = c;
    }
    if (body.negativeMarks !== undefined) {
      const n = Number(body.negativeMarks);
      if (!Number.isFinite(n) || n < 0 || n > 5) errors.negativeMarks = 'negativeMarks must be between 0 and 5';
      out.negativeMarks = n;
    }
  } else {
    out.options = [];
  }
  if (body.difficulty !== undefined) {
    if (!['Easy', 'Medium', 'Hard'].includes(body.difficulty)) errors.difficulty = 'difficulty must be Easy, Medium or Hard';
    else out.difficulty = body.difficulty;
  }
  if (body.topic !== undefined) out.topic = String(body.topic).trim().slice(0, 80);
  if (Object.keys(errors).length) throw new ApiError(400, 'Invalid question', 'VALIDATION_ERROR', errors);
  return out;
}

module.exports = { DEPARTMENTS, YEARS, assertObjectId, validateRegistration, validateQuestionInput };
