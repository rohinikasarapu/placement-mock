const ApiError = require('../utils/ApiError');

const notFound = (req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` } });

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code || 'ERROR', message: err.message, details: err.details, ...(err.extra || {}) } });
  }
  if (err && err.code === 11000) {
    return res.status(409).json({ error: { code: 'DUPLICATE', message: 'A record with this value already exists' } });
  }
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
  }
  if (err && (err.type === 'entity.parse.failed' || err.status === 400)) {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed request body' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong on the server' } });
}
module.exports = { notFound, errorHandler };
