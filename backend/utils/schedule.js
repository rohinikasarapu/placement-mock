// Date-wise test scheduling, evaluated on the SERVER in IST (Asia/Kolkata).
// scheduledDate is an IST calendar date string 'YYYY-MM-DD'. A test can only be STARTED on that date.
const ApiError = require('./ApiError');

const TZ = 'Asia/Kolkata';
const IST_OFFSET_MIN = 330;
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const today = (now = new Date()) => fmt.format(now);

// 'today' | 'upcoming' | 'closed' | 'unscheduled'
function availability(t, now) {
  const d = t.scheduledDate;
  if (!d) return 'unscheduled';
  const n = today(now);
  return d === n ? 'today' : d > n ? 'upcoming' : 'closed';
}
const isAvailable = (t, now) => availability(t, now) === 'today';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pretty = d => { const [y, m, day] = d.split('-'); return `${day}-${MONTHS[+m - 1]}-${y}`; };   // 18-Nov-2026

function availabilityMessage(t) {
  const a = availability(t);
  if (a === 'upcoming') return `This test is scheduled for ${pretty(t.scheduledDate)} and cannot be started before that date.`;
  if (a === 'closed') return `This test was scheduled for ${pretty(t.scheduledDate)}. It is closed and cannot be started again.`;
  if (a === 'unscheduled') return 'This test has not been scheduled yet.';
  return '';
}

function parseDay(v, label = 'Date') {
  const s = String(v ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!m || d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
    throw new ApiError(400, `${label} must be a valid date (YYYY-MM-DD)`, 'VALIDATION_ERROR', { [label]: 'Enter a valid date' });
  }
  return s;
}
// instant at which an IST calendar day starts / the next one starts
const dayStart = s => new Date(Date.parse(s + 'T00:00:00.000Z') - IST_OFFSET_MIN * 60000);
const nextDayStart = s => new Date(dayStart(s).getTime() + 86400000);
const toIstString = d => new Date(new Date(d).getTime() + IST_OFFSET_MIN * 60000).toISOString().slice(0, 16).replace('T', ' ');

module.exports = { TZ, today, availability, isAvailable, availabilityMessage, parseDay, pretty, dayStart, nextDayStart, toIstString, IST_OFFSET_MIN };
