(function () {
  const A = store.get('pm_attempt');
  if (!A) return location.replace('dashboard.html');
  const $ = id => document.getElementById(id);
  const S = { state: null, section: null, questions: [], responses: {}, idx: 0, offset: 0, endsAt: 0, busy: false, answeredElsewhere: 0 };
  let leaveGuard = true;
  let over = false;            // exam finished/terminated on this page: stop timers and ignore late server events
  S.dirty = null;   // essay text typed but not yet sent
  window.addEventListener('beforeunload', e => { if (leaveGuard) { e.preventDefault(); e.returnValue = ''; } });

  // Last-gasp save if the page is refreshed/closed while text is still waiting for the debounce.
  window.addEventListener('pagehide', () => {
    if (!S.dirty) return;
    try { fetch(`/api/attempts/${A.attemptId}/answers`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', 'X-Attempt-Token': A.token }, body: JSON.stringify({ answers: [S.dirty] }) }); } catch {}
  });

  // ---------------- server calls ----------------
  const call = (path, opts = {}) => api(`/attempts/${A.attemptId}${path}`, { ...opts, token: A.token });
  const toResult = (id, force) => { if (over && !force) return; over = true; leaveGuard = false; store.del('pm_attempt'); location.replace('result.html?id=' + id); };
  function sync(timer) { S.offset = timer.serverNow - Date.now(); S.endsAt = timer.sectionEndsAt; S.overall = timer.overallRemainingMs; S.syncedAt = Date.now(); }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ---------------- autosave queue ----------------
  const queue = []; let pumping = false;
  function setSave(t, cls) { const el = $('saveState'); el.textContent = t; el.className = 'save-state ' + (cls || ''); }
  function save(item) {
    const r = S.responses[item.questionId] || (S.responses[item.questionId] = {});
    Object.keys(item).forEach(k => { if (k !== 'questionId') r[k] = item[k]; });
    queue.push(item); setSave('Saving…'); pump(); renderPalette(); renderProgress();
  }
  async function pump() {
    if (pumping) return; pumping = true; let fails = 0;
    while (queue.length) {
      const batch = queue.splice(0, queue.length), merged = {};
      batch.forEach(i => { merged[i.questionId] = { ...(merged[i.questionId] || {}), ...i }; });
      try {
        await call('/answers', { method: 'POST', body: { answers: Object.values(merged) } });
        fails = 0;
      } catch (e) {
        if (['SECTION_EXPIRED', 'SECTION_LOCKED', 'ATTEMPT_SUBMITTED'].includes(e.code)) { queue.length = 0; pumping = false; return onSectionOver(e); }
        queue.unshift(...batch); fails++;
        setSave(`Not saved – retrying (${fails})…`, 'bad'); await sleep(Math.min(1000 * fails, 5000));
      }
    }
    pumping = false; if (!S.dirty) setSave('All changes saved ✓', 'ok');
  }
  async function idle() { for (let i = 0; i < 40 && (pumping || queue.length); i++) await sleep(100); }

  // ---------------- loading ----------------
  async function loadState() {
    const { attempt } = await call('');
    S.state = attempt; return attempt;
  }
  async function loadSection() {
    const st = await loadState();
    if (st.status === 'submitted') return toResult(st.resultId);
    let data;
    try { data = await call('/questions'); }
    catch (e) { if (e.code === 'ATTEMPT_SUBMITTED') return toResult(e.data.resultId); throw e; }
    S.section = data.section; S.questions = data.questions; S.responses = data.responses; sync(data.timer);
    const answeredHere = S.questions.filter(isAnswered).length;
    S.answeredElsewhere = Math.max(0, st.progress.answered - answeredHere);
    const saved = parseInt(sessionStorage.getItem(`pm_idx_${A.attemptId}_${S.section.index}`), 10);
    S.idx = Number.isInteger(saved) && saved >= 0 && saved < S.questions.length ? saved : 0;
    $('hTest').textContent = st.testName; $('hName').textContent = st.student.studentName; $('hRoll').textContent = st.student.rollNumber;
    renderTabs(); renderHeader(); goTo(S.idx);
  }

  // ---------------- status helpers ----------------
  function isAnswered(q) { const r = S.responses[q.id] || {}; return q.type === 'objective' ? r.selected !== undefined && r.selected !== null : !!(r.written && r.written.trim()); }
  function status(q) {
    const r = S.responses[q.id] || {}, a = isAnswered(q);
    if (a && r.marked) return 'ansmark'; if (r.marked) return 'marked'; if (a) return 'answered';
    return r.visited ? 'notans' : 'unvisited';
  }
  const LABEL = { unvisited: 'Not Visited', notans: 'Not Answered', answered: 'Answered', marked: 'Marked for Review', ansmark: 'Answered & Marked for Review' };

  // ---------------- rendering ----------------
  function renderHeader() {
    const s = S.state;
    setViol(s.violations ? s.violations.count : 0);
    $('hSection').textContent = S.section.name; $('hSecNo').textContent = `Section ${S.section.index + 1} of ${s.sections.length}`;
  }
  function renderTabs() {
    $('tabs').innerHTML = S.state.sections.map((s, i) => `<button class="tab ${s.state}" data-i="${i}" ${s.state === 'current' ? 'aria-current="true"' : ''}>
      <span class="n">${s.state === 'completed' ? '✓' : i + 1}</span>${esc(s.name)}</button>`).join('');
    $('tabs').querySelectorAll('.tab').forEach(b => b.onclick = () => {
      const st = S.state.sections[b.dataset.i].state;
      if (st === 'completed') toast('This section is finished. You cannot go back to it.');
      else if (st === 'upcoming') toast('Sections open one after another. Finish or wait for the current section to end.');
    });
    const cur = $('tabs').querySelector('.current'); if (cur) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function renderProgress() {
    const here = S.questions.filter(isAnswered).length, answered = S.answeredElsewhere + here, total = S.state.progress.totalQuestions;
    $('pText').textContent = `${answered} of ${total} answered · Section ${S.section.index + 1}/${S.state.sections.length}`;
    $('pBar').style.width = Math.round(answered / total * 100) + '%';
  }
  function renderPalette() {
    $('palGrid').innerHTML = S.questions.map((q, i) => `<button class="qbtn ${status(q)} ${i === S.idx ? 'cur' : ''}" data-i="${i}" aria-label="Question ${q.number}: ${LABEL[status(q)]}">${q.number}</button>`).join('');
    $('palGrid').querySelectorAll('.qbtn').forEach(b => b.onclick = () => goTo(+b.dataset.i));
    const c = {}; S.questions.forEach(q => { const k = status(q); c[k] = (c[k] || 0) + 1; });
    $('legend').innerHTML = Object.keys(LABEL).map(k => `<div><span class="qbtn ${k}"></span>${LABEL[k]}<b>${c[k] || 0}</b></div>`).join('');
    const last = S.section.isLast;
    $('sectionAction').innerHTML = last
      ? '<button class="btn success" style="width:100%" id="btnSubmit">Submit Test</button>'
      : '<button class="btn warn" style="width:100%" id="btnFinish">Finish Section →</button>';
    if (last) $('btnSubmit').onclick = submitTest; else $('btnFinish').onclick = finishSection;
  }

  function codeSplit(text) {
    if (S.section.key !== 'pseudocode') return null;
    const p = text.indexOf('\n\n'); return p < 0 ? null : [text.slice(0, p), text.slice(p + 2)];
  }
  function goTo(i) {
    S.idx = i; sessionStorage.setItem(`pm_idx_${A.attemptId}_${S.section.index}`, i);
    const q = S.questions[i], r = S.responses[q.id] || {};
    if (!r.visited) save({ questionId: q.id, visited: true });
    const code = codeSplit(q.text), lastQ = i === S.questions.length - 1;
    let body;
    if (q.type === 'descriptive') {
      const w = (r.written || '').trim() ? r.written.trim().split(/\s+/).length : 0;
      body = `<p class="q-text">${esc(q.text)}</p>
        <textarea class="essay-in" id="essay" maxlength="8000" placeholder="Type your answer here…" aria-label="Your written answer">${esc(r.written || '')}</textarea>
        <div class="wc"><span id="wc">${w} words</span><span>Auto-saves as you type · max 8000 characters</span></div>`;
    } else {
      body = (code ? `<p class="q-text">${esc(code[0])}</p><pre class="code">${esc(code[1])}</pre>` : `<p class="q-text">${esc(q.text)}</p>`) +
        `<div class="opts" role="radiogroup">${q.options.map((o, k) => `<label class="opt ${r.selected === k ? 'sel' : ''}"><input type="radio" name="opt" value="${k}" ${r.selected === k ? 'checked' : ''}><span class="k">${'ABCD'[k]}</span><span class="t">${esc(o)}</span></label>`).join('')}</div>`;
    }
    $('qpanel').innerHTML = `<div class="q-top"><b>Question ${q.number} of ${S.questions.length}</b><span class="muted">${esc(S.section.name)}${q.marks ? ` · ${q.marks} mark${q.marks > 1 ? 's' : ''}` : ''}</span></div>
      <div class="q-body">${body}</div>
      <div class="q-actions">
        <button class="btn secondary" id="bPrev" ${i === 0 ? 'disabled' : ''}>← Previous</button>
        ${q.type === 'objective' ? `<button class="btn warn" id="bMark">${r.marked ? 'Unmark Review' : 'Mark for Review'}</button><button class="btn secondary" id="bClear">Clear Response</button>` : ''}
        <span class="sp"></span>
        <button class="btn" id="bNext">${q.type === 'descriptive' ? 'Save Answer' : lastQ ? 'Save' : 'Save & Next'}${lastQ || q.type === 'descriptive' ? '' : ' →'}</button></div>`;

    $('bPrev').onclick = () => goTo(S.idx - 1);
    const next = () => { if (!lastQ) goTo(S.idx + 1); else toast(S.section.isLast ? 'Last question. Use Submit Test when you are done.' : 'Last question of this section. Use Finish Section when you are done.'); };
    if (q.type === 'objective') {
      document.querySelectorAll('input[name=opt]').forEach(el => el.onchange = () => {
        document.querySelectorAll('.opt').forEach(o => o.classList.remove('sel')); el.closest('.opt').classList.add('sel');
        save({ questionId: q.id, selected: +el.value });
      });
      $('bClear').onclick = () => { save({ questionId: q.id, selected: null }); goTo(S.idx); };
      $('bMark').onclick = () => { const m = !(S.responses[q.id] || {}).marked; save({ questionId: q.id, marked: m }); if (m && !lastQ) goTo(S.idx + 1); else goTo(S.idx); };
      $('bNext').onclick = async () => { await idle(); next(); };
    } else {
      const ta = $('essay'); let t;
      ta.oninput = () => {
        const w = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0; $('wc').textContent = w + ' words';
        S.responses[q.id] = { ...(S.responses[q.id] || {}), written: ta.value }; renderPalette(); renderProgress(); setSave('Typing…');
        S.dirty = { questionId: q.id, written: ta.value };
        clearTimeout(t); t = setTimeout(() => { S.dirty = null; save({ questionId: q.id, written: ta.value }); }, 700);
      };
      $('bNext').onclick = () => { clearTimeout(t); S.dirty = null; save({ questionId: q.id, written: ta.value }); toast('Answer saved', 'success'); };
      window.__flushEssay = () => { clearTimeout(t); S.dirty = null; if (ta.isConnected) save({ questionId: q.id, written: ta.value }); };
    }
    renderPalette(); renderProgress();
  }

  // ---------------- timer ----------------
  const nowSrv = () => Date.now() + S.offset;
  let expiring = false;
  function tick() {
    if (!S.section || expiring || over) return;
    const rem = S.endsAt - nowSrv();
    $('timer').textContent = mmss(rem);
    $('timerBox').classList.toggle('low', rem <= 60000);
    $('pTime').textContent = 'Total time left: ' + mmss(Math.max(0, (S.overall || 0) - (Date.now() - S.syncedAt)));
    if (rem <= 1500 && window.__flushEssay) { window.__flushEssay(); window.__flushEssay = null; }
    if (rem <= 0) expire();
  }
  async function expire() {
    if (expiring || over) return; expiring = true;
    const ovl = document.createElement('div'); ovl.className = 'ovl'; ovl.textContent = S.section.isLast ? 'Time is up. Submitting your test…' : 'Time is up for this section. Saving your answers and moving on…';
    document.body.appendChild(ovl);
    await idle();
    for (let i = 0; i < 20; i++) {      // ask the server; it is the authority on when time is up
      try {
        const t = await call('/timer');
        if (t.status === 'submitted') return toResult(t.resultId);
        if (t.currentSection !== S.section.index) break;
        sync(t.timer);
      } catch (e) { if (e.code === 'ATTEMPT_SUBMITTED') return toResult(e.data.resultId); }
      await sleep(700);
    }
    ovl.remove(); expiring = false; await loadSection(); tick();
    toast('Moved to the next section', 'success');
  }
  const syncId = setInterval(async () => {            // re-sync with the server clock
    if (!S.section || expiring || over) return;
    try {
      const t = await call('/timer');
      if (t.status === 'submitted') return toResult(t.resultId);
      if (t.currentSection !== S.section.index) { await loadSection(); return; }
      sync(t.timer);
    } catch (e) { if (e.code === 'ATTEMPT_SUBMITTED') toResult(e.data.resultId); }
  }, 20000);
  const tickId = setInterval(tick, 250);

  // ---------------- section / submit ----------------
  async function onSectionOver(e) {
    if (over) return;
    if (e.code === 'ATTEMPT_SUBMITTED') return toResult(e.data.resultId);
    toast('That section has ended. Your saved answers were kept.');
    await loadSection();
  }
  function secSummary() {
    const c = {}; S.questions.forEach(q => { const k = status(q); c[k] = (c[k] || 0) + 1; });
    const ans = (c.answered || 0) + (c.ansmark || 0), mk = (c.marked || 0) + (c.ansmark || 0);
    return `<p><b>${ans}</b> answered · <b>${S.questions.length - ans}</b> not answered · <b>${mk}</b> marked for review</p>`;
  }
  async function finishSection() {
    if (window.__flushEssay) window.__flushEssay();
    const ok = await confirmBox('Finish this section?', secSummary() + `<p class="muted">You cannot come back to <b>${esc(S.section.name)}</b> once you move on. The next section's timer starts immediately.</p>`, 'Yes, Finish Section', 'warn');
    if (!ok) return;
    await idle();
    try { await call('/section', { method: 'POST', body: { fromSection: S.section.index } }); }
    catch (e) { if (e.code !== 'STALE_SECTION') return toast(e.message, 'error'); }
    await loadSection();
  }
  async function submitTest() {
    if (window.__flushEssay) window.__flushEssay();
    const here = S.questions.filter(isAnswered).length, answered = S.answeredElsewhere + here, total = S.state.progress.totalQuestions;
    const ok = await confirmBox('Submit your test?', `<p>You have answered <b>${answered}</b> of <b>${total}</b> questions.</p>${secSummary()}<p class="muted">This is final. After submission you cannot change any answer.</p>`, 'Yes, Submit Test', 'success');
    if (!ok) return;
    await idle();
    try { const r = await call('/submit', { method: 'POST', body: {} }); toResult(r.resultId); }
    catch (e) { if (e.code === 'ATTEMPT_SUBMITTED') toResult(e.data.resultId); else toast(e.message, 'error'); }
  }


  // ---------------- full-screen / tab monitoring ----------------
  // Browser events only: Fullscreen API, Page Visibility and window focus. The SERVER keeps the count, timestamps and decides termination.
  // This is a deterrent and an audit trail, not foolproof proctoring (other devices / applications cannot be detected).
  const MAXV = 3;
  const WARN = { 1: 'First warning', 2: 'Final warning', 3: 'Last warning before termination' };
  const VLABEL = { fullscreen_exit: 'you exited full-screen mode', tab_switch: 'you left the examination tab or minimised the browser', focus_loss: 'the examination window lost focus' };
  let armed = false, fsSeen = false, lastSent = 0, unloading = false, pendingWarn = null, blurT = null;
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const enterFS = () => { const r = document.documentElement; return (r.requestFullscreen || r.webkitRequestFullscreen).call(r); };
  const exitFS = () => { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch {} };
  function setViol(n) { const b = $('violCount'); if (b) { b.textContent = n; $('violBox').classList.toggle('hot', n > 0); } }

  function refreshGate() {
    let g = document.getElementById('gate');
    if (over || !armed || (fsEl() && !pendingWarn)) { if (g) g.remove(); return; }
    if (!g) { g = document.createElement('div'); g.id = 'gate'; g.className = 'gate'; document.body.appendChild(g); }
    const needFs = !fsEl(), w = pendingWarn;
    const supported = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
    g.innerHTML = `<div class="box ${w ? (w.n >= 3 ? 'bad' : 'warn') : ''}" role="alertdialog" aria-modal="true">
      ${w ? `<h2>${WARN[w.n]} &ndash; violation ${w.n} of ${MAXV}</h2>
        <p>A violation was recorded because ${VLABEL[w.type] || 'the examination rules were not followed'}.</p>
        <p>${w.n >= 3 ? '<b>One more violation will end your examination immediately.</b> Your saved answers will be submitted and your score calculated automatically.' : `You have <b>${MAXV - w.n}</b> warning${MAXV - w.n === 1 ? '' : 's'} left. The 4th violation ends the examination.`}</p>`
        : '<h2>Full-screen mode is required</h2><p>The examination must be taken in full screen. <b>Your timer is still running.</b></p>'}
      ${needFs ? `<p class="muted small">${supported ? 'Click the button below to return to full screen and continue.' : 'This browser does not support full-screen mode. Please open the examination on a desktop or laptop using Chrome, Edge or Firefox.'}</p>` : ''}
      <div class="btnrow"><button class="btn lg" id="gateBtn" ${needFs && !supported ? 'disabled' : ''}>${needFs ? 'Enter Full Screen and Continue' : 'Continue Examination'}</button></div></div>`;
    document.getElementById('gateBtn').onclick = async () => {
      if (!fsEl()) { try { await enterFS(); } catch { toast('Full screen was blocked by the browser. Please allow it.', 'error'); return; } }
      pendingWarn = null; refreshGate();
    };
  }

  function terminated(r) {
    over = true; clearInterval(tickId); clearInterval(syncId); leaveGuard = false;
    const g = document.getElementById('gate'); if (g) g.remove();
    document.body.classList.add('locked');
    document.querySelectorAll('.xmain,.tabs').forEach(el => { el.inert = true; });                        // inert: no mouse, keyboard or focus, even if an in-flight save re-renders controls
    document.querySelectorAll('button,input,textarea').forEach(el => { el.disabled = true; });
    exitFS();
    const o = document.createElement('div'); o.className = 'ovl';
    o.innerHTML = `<div class="box bad" role="alertdialog" aria-modal="true"><h2>Examination terminated</h2>
      <p>${esc(r.terminationReason || 'Exceeded maximum tab-switch/full-screen violations')}.</p>
      <p>Your answers saved up to this moment were submitted automatically. This attempt cannot be resumed or restarted.</p>
      <p class="muted small" style="margin-bottom:2px">Your score</p><div class="big-score">${r.totalMarks ?? '—'}${r.maxMarks ? ` <span class="muted" style="font-size:16px;font-weight:400">/ ${r.maxMarks}</span>` : ''}</div>
      <div class="btnrow"><button class="btn lg" id="viewRes">View Detailed Result</button></div></div>`;
    document.body.appendChild(o);
    const v = document.getElementById('viewRes'); v.disabled = false; v.onclick = () => toResult(r.resultId, true);
  }

  function handleViolation(r, type) {
    setViol(r.violations);
    if (r.submitted) return r.terminated ? terminated(r) : toResult(r.resultId);
    if (r.counted) { pendingWarn = { n: r.violations, type }; refreshGate(); }
  }
  async function report(type, tries = 0) {
    try { handleViolation(await call('/violation', { method: 'POST', body: { type } }), type); }
    catch (e) { if (!over && tries < 8) setTimeout(() => report(type, tries + 1), 2000); }                 // offline: keep trying so it is still recorded
  }
  function violation(type) {
    if (over || !armed || unloading || expiring) return;
    const now = Date.now(); if (now - lastSent < 1200) return; lastSent = now;                                  // one user action fires several browser events
    report(type);
  }
  window.addEventListener('beforeunload', () => { unloading = true; setTimeout(() => { unloading = false; }, 1500); });   // a refresh is not a violation
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(blurT); violation('tab_switch'); } });
  window.addEventListener('blur', () => { clearTimeout(blurT); blurT = setTimeout(() => violation('focus_loss'), 250); });   // let the more specific event win
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => {
    if (fsEl()) { fsSeen = true; refreshGate(); return; }
    if (fsSeen) violation('fullscreen_exit');
    refreshGate();
  }));

  // ---------------- boot ----------------
  (async function boot() {
    try { await loadSection(); tick(); armed = true; fsSeen = !!fsEl(); refreshGate(); }
    catch (e) {
      if (e.status === 403 || e.status === 404) { store.del('pm_attempt'); toast('This attempt could not be opened.', 'error'); return setTimeout(() => location.replace('dashboard.html'), 1200); }
      $('qpanel').innerHTML = `<div class="q-body"><div class="alert error">${esc(e.message)}</div><button class="btn" onclick="location.reload()">Retry</button></div>`;
    }
  })();
})();
