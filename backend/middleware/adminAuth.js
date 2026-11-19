const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

const TTL_MS = 8 * 60 * 60 * 1000;
const secret = () => process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
const sign = payload => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
const safeEq = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const failures = new Map(); // ip -> { count, until }  (basic brute-force throttle)

function login(req, res) {
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    throw new ApiError(503, 'Admin access is not configured on the server (set ADMIN_USERNAME / ADMIN_PASSWORD)', 'ADMIN_DISABLED');
  }
  const ip = req.ip;
  const f = failures.get(ip);
  if (f && f.count >= 5 && f.until > Date.now()) throw new ApiError(429, 'Too many failed attempts. Try again in a few minutes.', 'RATE_LIMITED');

  const { username = '', password = '' } = req.body || {};
  const ok = safeEq(username, process.env.ADMIN_USERNAME) & safeEq(password, process.env.ADMIN_PASSWORD);
  if (!ok) {
    const cur = failures.get(ip) && failures.get(ip).until > Date.now() ? failures.get(ip) : { count: 0 };
    failures.set(ip, { count: cur.count + 1, until: Date.now() + 5 * 60000 });
    throw new ApiError(401, 'Invalid admin credentials', 'BAD_CREDENTIALS');
  }
  failures.delete(ip);
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + TTL_MS })).toString('base64url');
  res.json({ token: `${payload}.${sign(payload)}`, expiresInMs: TTL_MS });
}

function requireAdmin(req, res, next) {
  if (!secret()) throw new ApiError(503, 'Admin access is not configured', 'ADMIN_DISABLED');
  const h = req.get('authorization') || '';
  const [payload, sig] = h.replace(/^Bearer\s+/i, '').split('.');
  if (!payload || !sig || !safeEq(sig, sign(payload))) throw new ApiError(401, 'Admin login required', 'UNAUTHORIZED');
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw new ApiError(401, 'Admin login required', 'UNAUTHORIZED'); }
  if (data.role !== 'admin' || data.exp < Date.now()) throw new ApiError(401, 'Admin session expired', 'UNAUTHORIZED');
  next();
}

module.exports = { login, requireAdmin };
