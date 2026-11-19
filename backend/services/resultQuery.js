// Shared by the admin results table AND the Excel/CSV exports so a filtered export always equals what the admin sees.
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { parseDay, dayStart, nextDayStart } = require('../utils/schedule');

const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTABLE = ['studentName', 'rollNumber', 'department', 'yearOfStudy', 'testName', 'submissionDate', 'totalMarks'];

function parseQuery(q = {}) {
  const filter = {};
  const and = [];
  const search = String(q.q || q.search || '').trim();
  if (search) and.push({ $or: ['studentName', 'rollNumber', 'testName'].map(f => ({ [f]: { $regex: esc(search), $options: 'i' } })) });
  if (q.department) filter.department = String(q.department);
  if (q.year || q.yearOfStudy) filter.yearOfStudy = String(q.year || q.yearOfStudy);
  if (q.testName) filter.testName = String(q.testName);
  if (q.studentId) {
    if (!mongoose.isValidObjectId(q.studentId) || String(q.studentId).length !== 24) throw new ApiError(400, 'Invalid studentId', 'INVALID_ID');
    filter.studentId = new mongoose.Types.ObjectId(String(q.studentId));
  }
  // Dates are IST calendar days. `date` = a single day; `from`/`to` = inclusive range. They combine (intersection).
  let lo = null, hi = null;
  const narrow = (a, b) => { if (a && (!lo || a > lo)) lo = a; if (b && (!hi || b < hi)) hi = b; };
  if (q.date) { const d = parseDay(q.date, 'date'); narrow(dayStart(d), nextDayStart(d)); }
  if (q.from) narrow(dayStart(parseDay(q.from, 'from')), null);
  if (q.to) narrow(null, nextDayStart(parseDay(q.to, 'to')));
  if (lo && hi && lo >= hi) and.push({ _id: null });   // empty range -> no rows
  else if (lo || hi) filter.submissionDate = { ...(lo ? { $gte: lo } : {}), ...(hi ? { $lt: hi } : {}) };
  if (and.length) filter.$and = and;

  const sortBy = SORTABLE.includes(q.sort) ? q.sort : 'submissionDate';
  const order = String(q.order || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  return { filter, sort: { [sortBy]: order, _id: 1 }, sortBy, order: order === 1 ? 'asc' : 'desc', limit, page };
}

// Case-insensitive ordering for text columns (names, departments ...)
const COLLATION = { locale: 'en', strength: 2 };

module.exports = { parseQuery, COLLATION, SORTABLE };
