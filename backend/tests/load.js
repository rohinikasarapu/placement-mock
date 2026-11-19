#!/usr/bin/env node
// Load test: N virtual students take a full exam against a RUNNING server (default 600).
//
//   BASE=http://localhost:5000 STUDENTS=600 node tests/load.js
//
// Each student: registers -> opens today's test -> instructions -> starts -> for every section loads the questions,
// answers them (with "think time"), polls the timer, occasionally refreshes the page (re-loads state), moves to the next
// section and finally submits. Real students act far more slowly, so the default pacing below is a deliberate
// stress (~15-20x the request rate of real exam-takers).
//
// Options (env): BASE, STUDENTS, THINK_MS (mean time between answers), POLL_MS (timer poll interval),
//   REFRESH_PCT (% of sections where the student reloads the page), RAMP_MS (spread of the initial start burst),
//   TEST_NAME (pick a specific scheduled test), MAX_Q_PER_SECTION (shorten the run), P95_LIMIT_MS (exit code 1 when exceeded).
const BASE = (process.env.BASE || 'http://localhost:5000').replace(/\/$/, '');
const N = +(process.env.STUDENTS || 600);
const THINK = +(process.env.THINK_MS || 1500);
const POLL = +(process.env.POLL_MS || 3000);
const REFRESH = +(process.env.REFRESH_PCT || 10) / 100;
const RAMP = +(process.env.RAMP_MS || 8000);
const MAXQ = +(process.env.MAX_Q_PER_SECTION || 0);   // answer only the first N questions of each section (0 = all)
const P95_LIMIT = +(process.env.P95_LIMIT_MS || 1500);
const RUN = Date.now().toString(36).toUpperCase().slice(-5);

const lat = {}, errs = {};
const rnd = n => Math.floor(Math.random() * n);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const letters = n => { let o = ''; do { o = String.fromCharCode(65 + n % 26) + o; n = Math.floor(n / 26) - 1; } while (n >= 0); return o; };   // names may not contain digits
const jitter = ms => ms * (0.5 + Math.random());

async function call(tag, method, path, { body, token } = {}) {
  const t0 = performance.now();
  let status = 0, json = null;
  try {
    const r = await fetch(BASE + '/api' + path, {
      method, headers: { 'content-type': 'application/json', ...(token ? { 'x-attempt-token': token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    status = r.status;
    json = await r.json().catch(() => null);
  } catch (e) { status = -1; json = { error: { message: e.cause ? String(e.cause.code || e.cause.message) : e.message } }; }
  (lat[tag] || (lat[tag] = [])).push(performance.now() - t0);
  if (status < 200 || status >= 300) {
    const k = `${tag} ${status} ${json && json.error ? (json.error.code || json.error.message) : ''}`;
    errs[k] = (errs[k] || 0) + 1;
  }
  return { status, json };
}

async function student(i, testId) {
  await sleep(Math.random() * RAMP);                                              // the "everyone clicks Start" burst
  const roll = `LT${RUN}${String(i).padStart(4, '0')}`;
  const reg = await call('register', 'POST', '/students/register', { body: { studentName: `Load Student ${letters(i)}`, rollNumber: roll, department: ['CSE', 'IT', 'ECE', 'EEE'][i % 4], yearOfStudy: '4th Year' } });
  if (reg.status !== 201) return;
  const sid = reg.json.student._id;
  await call('dashboard', 'GET', '/students/' + sid);
  await call('dashboard', 'GET', '/tests/today');
  await call('dashboard', 'GET', '/tests/upcoming');
  await call('dashboard', 'GET', '/results/student/' + sid);
  await call('instructions', 'GET', `/tests/${testId}/instructions`);
  const st = await call('start', 'POST', `/tests/${testId}/start`, { body: { studentId: sid } });
  if (st.status !== 201) return;
  const id = st.json.attemptId, token = st.json.token;
  let { json: a } = await call('attempt', 'GET', '/attempts/' + id, { token });
  const sections = a.attempt.sections.length;
  for (let s = 0; s < sections; s++) {
    let q = (await call('questions', 'GET', `/attempts/${id}/questions`, { token })).json;
    if (!q || !q.questions) return;
    let lastPoll = Date.now();
    for (const question of (MAXQ ? q.questions.slice(0, MAXQ) : q.questions)) {
      await sleep(jitter(THINK));
      if (Date.now() - lastPoll > POLL) { lastPoll = Date.now(); await call('timer', 'GET', `/attempts/${id}/timer`, { token }); }
      const ans = question.type === 'descriptive'
        ? { questionId: question.id, written: 'Load test response. '.repeat(20) }
        : { questionId: question.id, selected: rnd(4), ...(Math.random() < 0.15 ? { marked: true } : {}) };
      await call('save', 'POST', `/attempts/${id}/answers`, { token, body: { answers: [ans] } });
      if (Math.random() < REFRESH / q.questions.length) {                         // browser refresh: re-sync everything
        await call('attempt', 'GET', '/attempts/' + id, { token });
        await call('questions', 'GET', `/attempts/${id}/questions`, { token });
      }
    }
    if (s < sections - 1) await call('section', 'POST', `/attempts/${id}/section`, { token, body: { fromSection: s } });
  }
  const sub = await call('submit', 'POST', `/attempts/${id}/submit`, { token, body: {} });
  if (sub.status === 200) await call('result', 'GET', '/results/' + sub.json.resultId);
}

const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
(async () => {
  const health = await fetch(BASE + '/api/health').then(r => r.json()).catch(() => null);
  if (!health) { console.error('Server not reachable at', BASE); process.exit(2); }
  const list = (await (await fetch(BASE + '/api/tests/today')).json()).tests || [];
  const t = process.env.TEST_NAME ? list.find(x => x.testName === process.env.TEST_NAME) : list[0];
  if (!t) { console.error('No test is scheduled & active for today (IST). Seed/activate one first.'); process.exit(2); }
  console.log(`Load test: ${N} students on "${t.testName}" (${t.totals.questions} questions, ${t.totals.sections} sections) at ${BASE}`);
  console.log(`pacing: think ~${THINK} ms, timer poll ${POLL} ms, refresh ${REFRESH * 100}%, ramp ${RAMP} ms`);
  const t0 = Date.now();
  await Promise.all(Array.from({ length: N }, (_, i) => student(i, t.id)));
  const secs = (Date.now() - t0) / 1000;
  let total = 0;
  console.log('\nendpoint        count    p50     p95     p99     max   (ms)');
  for (const [k, v] of Object.entries(lat)) {
    v.sort((x, y) => x - y); total += v.length;
    console.log(`${k.padEnd(14)} ${String(v.length).padStart(6)} ${pct(v, .5).toFixed(0).padStart(6)} ${pct(v, .95).toFixed(0).padStart(7)} ${pct(v, .99).toFixed(0).padStart(7)} ${v[v.length - 1].toFixed(0).padStart(7)}`);
  }
  const all = Object.values(lat).flat().sort((x, y) => x - y);
  const nErr = Object.values(errs).reduce((a, b) => a + b, 0);
  console.log(`\n${total} requests in ${secs.toFixed(0)} s = ${(total / secs).toFixed(0)} req/s overall, errors: ${nErr}`);
  console.log(`overall latency p50 ${pct(all, .5).toFixed(0)} ms, p95 ${pct(all, .95).toFixed(0)} ms, p99 ${pct(all, .99).toFixed(0)} ms`);
  Object.entries(errs).forEach(([k, v]) => console.log('  ERROR', v, 'x', k));
  const stats = await fetch(BASE + '/api/health?stats=1').then(r => r.json()).catch(() => ({}));
  if (stats.dbOps) console.log('DB operations during run:', JSON.stringify(stats.dbOps));
  const ok = nErr === 0 && pct(all, .95) <= P95_LIMIT;
  console.log(ok ? `\nPASS (no errors, p95 <= ${P95_LIMIT} ms)` : `\nFAIL (errors or p95 > ${P95_LIMIT} ms)`);
  process.exit(ok ? 0 : 1);
})();
