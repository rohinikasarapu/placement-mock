// Per-attempt data that never changes after the attempt starts (secret token, owner, section snapshot, frozen paper with
// answer key) is kept in memory, so the hot endpoints (timer polls, answer saves) do not re-read ~30 KB from MongoDB
// on every request. Mutable state (current section, responses, status) is ALWAYS read from / written to the database,
// so this cache can never make an attempt go stale, and a restart or a second server instance just reloads it.
const Attempt = require('../models/Attempt');
const AttemptPaper = require('../models/AttemptPaper');
const Student = require('../models/Student');

const MAX = 3000;
const entries = new Map();     // attemptId -> entry (Map keeps insertion order => simple LRU)

async function load(id) {
  const key = String(id);
  const hit = entries.get(key);
  if (hit) { entries.delete(key); entries.set(key, hit); return hit.promise ? hit.promise : hit; }
  const promise = Attempt.findById(key).select('+paper token studentId testId sections').lean().then(async a => {
    if (!a) { entries.delete(key); return null; }
    let paper = a.paper;                                   // attempts created by older versions embedded the paper
    if (!paper || !paper.length) { const p = await AttemptPaper.findById(key).lean(); paper = p ? p.paper : []; }
    const entry = { id: a._id, token: a.token, studentId: a.studentId, testId: a.testId, sections: a.sections, paper, paperById: new Map(paper.map(q => [q.id, q])), student: null };
    entries.set(key, entry);
    return entry;
  }, e => { entries.delete(key); throw e; });
  entries.set(key, { promise });
  while (entries.size > MAX) entries.delete(entries.keys().next().value);
  return promise;
}
async function studentOf(entry) {
  if (!entry.student) entry.student = await Student.findById(entry.studentId).lean();
  return entry.student;
}
// Called when an attempt is created: everything is already in memory, so the first requests need no extra reads.
function prime({ id, token, studentId, testId, sections, paper, student }) {
  entries.set(String(id), { id, token, studentId, testId, sections, paper, paperById: new Map(paper.map(q => [q.id, q])), student: student || null });
  while (entries.size > MAX) entries.delete(entries.keys().next().value);
}
const evict = id => entries.delete(String(id));
module.exports = { load, prime, studentOf, evict };
