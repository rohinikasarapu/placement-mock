const crypto = require('crypto');
const cache = require('../services/attemptCache');
const ApiError = require('../utils/ApiError');
const { assertObjectId } = require('../utils/validate');

// Ownership check: the caller must present the secret token issued when the attempt was started.
module.exports = async function attemptAuth(req, res, next) {
  assertObjectId(req.params.id, 'attempt id');
  const att = await cache.load(req.params.id);
  if (!att) throw new ApiError(404, 'Attempt not found', 'NOT_FOUND');
  const given = Buffer.from(String(req.get('x-attempt-token') || ''));
  const real = Buffer.from(att.token);
  if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
    throw new ApiError(403, 'You do not have access to this attempt', 'FORBIDDEN');
  }
  req.attempt = att;     // cached immutable data (token, sections, paper)
  req.attemptId = att.id;
  req.studentId = att.studentId;
  next();
};
