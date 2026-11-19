(function () {
  const $ = id => document.getElementById(id);
  let token = null; try { token = sessionStorage.getItem('pm_admin'); } catch {}
  const adm = (path, o = {}) => api('/admin' + path, { ...o, headers: { Authorization: 'Bearer ' + token } });
  const qs = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString();
  const MENU = [['overview', 'Dashboard Overview'], ['students', 'Student Management'], ['tests', 'Test Management'], ['schedule', 'Schedule Management'], ['results', 'Examination Results'], ['reports', 'Reports and Downloads']];
  const DEPTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS', 'CSM', 'CSD', 'Other'], YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const opt = (list, sel, all) => (all ? `<option value="">${all}</option>` : '') + list.map(x => `<option ${x === sel ? 'selected' : ''}>${esc(x)}</option>`).join('');
  let tests = [], today = '', qTest = null, R = freshR(), view = 'overview';
  function freshR() { return { q: '', department: '', year: '', testName: '', date: '', from: '', to: '', studentId: '', studentLabel: '', sort: 'submissionDate', order: 'desc', page: 1, limit: 20 }; }

  document.getElementById('top').innerHTML = siteHeader({ href: 'admin.html', sub: 'Placement Mock Test Administration', nav: '<a href="index.html">Student Portal</a><button id="logout" class="hidden">Sign Out</button>' });
  document.getElementById('foot').innerHTML = siteFooter();

  function unauth() { try { sessionStorage.removeItem('pm_admin'); } catch {} token = null; $('adminView').classList.add('hidden'); $('loginView').classList.remove('hidden'); $('logout').classList.add('hidden'); }
  async function guard(fn, id) { try { return await fn(); } catch (e) { if (id !== undefined && id !== navId) return; if (e.status === 401) { unauth(); toast('Session expired. Please sign in again.', 'error'); } else toast(e.message, 'error'); } }
  $('loginForm').onsubmit = async e => {
    e.preventDefault();
    try {
      const r = await api('/admin/login', { method: 'POST', body: { username: $('u').value, password: $('p').value } });
      token = r.token; try { sessionStorage.setItem('pm_admin', token); } catch {} start();
    } catch (err) { $('loginMsg').innerHTML = `<div class="alert error">${esc(err.message)}</div>`; }
  };
  $('logout').onclick = unauth;

  async function start() {
    $('loginView').classList.add('hidden'); $('adminView').classList.remove('hidden'); $('logout').classList.remove('hidden');
    await guard(async () => { await refreshTests(); route(); });
  }
  async function refreshTests() { const r = await adm('/tests'); tests = r.tests; today = r.today; }
  let navId = 0;
  function route() {
    view = (location.hash || '#overview').slice(1).split('/')[0]; if (!MENU.some(m => m[0] === view)) view = 'overview';
    $('side').innerHTML = MENU.map(([k, l]) => `<a href="#${k}" class="${k === view ? 'on' : ''}">${l}</a>`).join('');
    // Each navigation gets a fresh pane. A slower, earlier view can then only write into a detached node and never overwrite the current one.
    const id = ++navId, fresh = document.createElement('main'); fresh.className = 'main'; fresh.id = 'pane';
    $('pane').replaceWith(fresh);
    guard(() => VIEWS[view](fresh), id);
  }
  window.addEventListener('hashchange', () => token && route());
  const go = h => { if (location.hash === '#' + h) route(); else location.hash = h; };

  // ---------- helpers ----------
  const pager = (p, onPage, onLimit) => `<div class="pager"><span>${p.total ? `Showing ${(p.page - 1) * p.limit + 1}&ndash;${Math.min(p.total, p.page * p.limit)} of ${p.total}` : 'No records'}</span>
    <span class="btns">${onLimit ? `<select class="input" id="pgLimit" style="width:auto;padding:3px 6px">${[10, 20, 50, 100].map(n => `<option ${n === p.limit ? 'selected' : ''}>${n}</option>`).join('')}</select> per page` : ''}
    <button class="btn sm secondary" id="pgPrev" ${p.page <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${p.page} of ${p.totalPages}</span><button class="btn sm secondary" id="pgNext" ${p.page >= p.totalPages ? 'disabled' : ''}>Next</button></span></div>`;
  function bindPager(p, onPage, onLimit) {
    $('pgPrev').onclick = () => onPage(p.page - 1); $('pgNext').onclick = () => onPage(p.page + 1);
    if (onLimit && $('pgLimit')) $('pgLimit').onchange = e => onLimit(+e.target.value);
  }
  const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const availBadge = a => ({ today: '<span class="badge green">Today</span>', upcoming: '<span class="badge amber">Upcoming</span>', closed: '<span class="badge grey">Past</span>', unscheduled: '<span class="badge red">Not scheduled</span>' }[a] || '');
  const statusBadge = t => t.isActive ? '<span class="badge green">Active</span>' : '<span class="badge grey">Inactive</span>';
  const readyBadge = t => t.ready ? '' : '<span class="badge red" title="An enabled section has fewer questions than configured; the test cannot be activated">Questions incomplete</span>';

  async function download(kind, params) {
    const r = await fetch('/api/admin/results/export/' + kind + '?' + qs(params), { headers: { Authorization: 'Bearer ' + token } });
    if (r.status === 401) { unauth(); return toast('Session expired. Please sign in again.', 'error'); }
    if (!r.ok) { let m = 'Download failed'; try { m = (await r.json()).error.message; } catch {} return toast(m, 'error'); }
    const blob = await r.blob(), m = /filename="([^"]+)"/.exec(r.headers.get('content-disposition') || '');
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = m ? m[1] : 'Placement_Results.' + (kind === 'excel' ? 'xlsx' : 'csv');
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`Downloaded ${a.download} (${r.headers.get('x-record-count')} record${r.headers.get('x-record-count') === '1' ? '' : 's'})`, 'success');
  }
  const filterParams = f => ({ q: f.q, department: f.department, year: f.year, testName: f.testName, date: f.date, from: f.from, to: f.to, studentId: f.studentId });

  // ================= OVERVIEW =================
  async function overview(pane) {
    const [s, an, tt, recent] = await Promise.all([adm('/stats'), adm('/analytics'), adm('/tests/today'), adm('/results?limit=5&sort=submissionDate&order=desc')]);
    const maxStu = Math.max(1, ...an.byDepartment.map(d => d.students));
    const dept = an.byDepartment.length ? `<div class="legend-inline"><span>Registered students</span><span class="f">Students who completed a test</span></div><div class="bars">${an.byDepartment.map(d => `<div class="bar-row"><span class="lab">${esc(d.department)}</span>
      <div class="bar-track"><i style="width:${d.students / maxStu * 100}%"></i><i class="f" style="width:${d.participated / maxStu * 100}%"></i></div><span class="right">${d.participated} / ${d.students}</span></div>`).join('')}</div>` : '<div class="empty">No students have registered yet.</div>';
    const perf = an.byTest.length ? `<div class="bars">${an.byTest.map(t => { const max = (tests.find(x => x.testName === t.testName) || {}).totalMarks || t.highest || 1;
      return `<div class="bar-row"><span class="lab" title="${esc(t.testName)}">${esc(t.testName)}</span><div class="bar-track"><i class="f" style="width:${Math.min(100, t.average / max * 100)}%"></i></div><span class="right">${t.average} / ${max}</span></div>
      <div class="muted small" style="margin:-6px 0 0 140px">${t.attempts} attempt${t.attempts === 1 ? '' : 's'} &middot; highest ${t.highest} &middot; lowest ${t.lowest}</div>`; }).join('')}</div>` : '<div class="empty">No test has been completed yet.</div>';
    pane.innerHTML = `<div class="pagehead"><div><h1>Dashboard Overview</h1><p>Today is ${fmtDay(s.today)} (IST)</p></div></div>
      <div class="statline"><div><b>${s.students}</b><small>Total registered students</small></div><div><b>${s.totalScheduledTests}</b><small>Total scheduled tests</small></div><div><b>${s.testsToday}</b><small>Tests scheduled today</small></div>
        <div><b>${s.totalAttempts}</b><small>Total test attempts</small></div><div><b>${s.completedTests}</b><small>Total completed tests</small></div></div>
      ${s.inProgressAttempts || s.terminatedAttempts ? `<p class="muted small" style="margin-top:-8px">${s.inProgressAttempts} attempt(s) in progress now &middot; ${s.terminatedAttempts} terminated for violations</p>` : ''}
      <div class="panel"><div class="ph"><h2>Tests Scheduled Today</h2><a href="#schedule" class="small">Manage schedule</a></div><div class="pb flush">${tt.tests.length ? `<div class="table-wrap"><table class="t stack"><thead><tr><th>Test Name</th><th>Date</th><th>Duration</th><th>Status</th><th class="num">Completed</th><th class="num">In progress</th></tr></thead><tbody>
        ${tt.tests.map(t => `<tr><td data-l="Test"><b>${esc(t.testName)}</b></td><td data-l="Date">${fmtDay(t.scheduledDate)}</td><td data-l="Duration">${t.totalDuration} min</td><td data-l="Status">${statusBadge(t)} ${readyBadge(t)}</td><td data-l="Completed" class="num">${t.completedAttempts}</td><td data-l="In progress" class="num">${t.inProgressAttempts}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No tests are scheduled for today.</div>'}</div></div>
      <div class="ins-grid"><div class="panel"><div class="ph"><h2>Student Participation by Department</h2></div><div class="pb">${dept}</div></div>
        <div class="panel"><div class="ph"><h2>Average Marks by Test</h2></div><div class="pb">${perf}</div></div></div>
      <div class="panel"><div class="ph"><h2>Latest Submissions</h2><a href="#results" class="small">All results</a></div><div class="pb flush">${resultsTable(recent.results, false)}</div></div>`;
  }

  // ================= STUDENTS =================
  const S = { q: '', department: '', year: '', page: 1, limit: 20 };
  async function students(pane) {
    pane.innerHTML = `<div class="pagehead"><div><h1>Student Management</h1><p>Registered students and their examination activity.</p></div></div>
      <div class="panel"><div class="pb"><div class="filters">
        <div class="field"><label for="sq">Search by roll number or name</label><input id="sq" value="${esc(S.q)}" placeholder="e.g. 22A81A05"></div>
        <div class="field"><label for="sd">Department</label><select id="sd">${opt(DEPTS, S.department, 'All departments')}</select></div>
        <div class="field"><label for="sy">Year of Study</label><select id="sy">${opt(YEARS, S.year, 'All years')}</select></div></div></div></div>
      <div class="panel"><div class="pb flush" id="slist"><div class="empty">Loading…</div></div></div>`;
    const load = async () => {
      const r = await adm('/students?' + qs(S));
      $('slist').innerHTML = (r.students.length ? `<div class="table-wrap"><table class="t stack"><thead><tr><th>Student Name</th><th>Roll Number</th><th>Department</th><th>Year of Study</th><th>Registered</th><th class="num">Tests Attempted</th><th class="num">Latest Marks</th><th></th></tr></thead><tbody>
        ${r.students.map(s => `<tr><td data-l="Name"><b>${esc(s.studentName)}</b></td><td data-l="Roll No.">${esc(s.rollNumber)}</td><td data-l="Dept.">${esc(s.department)}</td><td data-l="Year">${esc(s.yearOfStudy)}</td><td data-l="Registered">${fmtDay(String(s.registrationDate).slice(0, 10))}</td>
        <td data-l="Attempted" class="num">${s.testsAttempted}</td><td data-l="Latest" class="num">${s.latestMarks ?? '—'}</td><td class="act"><button class="btn sm ghost" data-r="${s._id}" data-n="${esc(s.studentName)}">View Results</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No students match your search.</div>') + pager(r, p => { S.page = p; load(); }, true);
      bindPager(r, p => { S.page = p; load(); }, n => { S.limit = n; S.page = 1; load(); });
      $('slist').querySelectorAll('[data-r]').forEach(b => b.onclick = () => { R = freshR(); R.studentId = b.dataset.r; R.studentLabel = b.dataset.n; go('results'); });
    };
    const reload = () => { S.page = 1; guard(load); };
    $('sq').oninput = debounce(() => { S.q = $('sq').value.trim(); reload(); }); $('sd').onchange = () => { S.department = $('sd').value; reload(); }; $('sy').onchange = () => { S.year = $('sy').value; reload(); };
    await load();
  }

  // ================= TESTS =================
  async function testsView(pane) {
    if (view === 'tests' && location.hash.startsWith('#tests/questions')) return questions(pane);
    await refreshTests();
    pane.innerHTML = `<div class="pagehead"><div><h1>Test Management</h1><p>Create tests, set the date, configure sections and manage questions.</p></div><button class="btn" id="addT">Create New Test</button></div>
      <div class="panel"><div class="pb flush">${tests.length ? `<div class="table-wrap"><table class="t stack"><thead><tr><th>Test Name</th><th>Test Date</th><th class="num">Duration</th><th class="num">Marks</th><th class="num">Questions</th><th>Status</th><th></th></tr></thead><tbody>
      ${tests.map(t => { const have = enabledHave(t);
        return `<tr><td data-l="Test"><b>${esc(t.testName)}</b>${t.isSeeded ? ' <span class="badge grey" title="Created by the seed script; fully editable">Sample</span>' : ''}<div class="muted small">${esc(t.description)}</div></td><td data-l="Date">${fmtDay(t.scheduledDate)} ${availBadge(t.availability)}</td><td data-l="Duration" class="num">${t.totalDuration} min</td><td data-l="Marks" class="num">${t.totalMarks}</td>
        <td data-l="Questions" class="num">${have} / ${t.totalQuestions} ${readyBadge(t)}</td><td data-l="Status">${statusBadge(t)}</td>
        <td class="act nowrap"><button class="btn sm ghost" data-q="${t.id}">Questions</button> <button class="btn sm secondary" data-e="${t.id}">Edit</button> <button class="btn sm danger" data-d="${t.id}">Delete</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">No tests have been created yet. Use "Create New Test" to schedule the first one.</div>'}</div></div>`;
    $('addT').onclick = () => editTest();
    pane.querySelectorAll('[data-e]').forEach(b => b.onclick = () => editTest(tests.find(t => t.id === b.dataset.e)));
    pane.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { qTest = b.dataset.q; location.hash = '#tests/questions'; });
    pane.querySelectorAll('[data-d]').forEach(b => b.onclick = () => deleteTest(tests.find(t => t.id === b.dataset.d)));
  }
  async function deleteTest(t) {
    if (!await confirmBox('Delete test?', `<p><b>${esc(t.testName)}</b> and all its questions will be deleted. Results already saved for students are kept.</p>`, 'Delete', 'danger')) return;
    await guard(async () => { await adm('/tests/' + t.id, { method: 'DELETE' }); toast('Test deleted', 'success'); route(); });
  }

  // create / edit test: name, date, description, status and the admin-controlled section configuration
  const enabledHave = t => (t.sections || []).filter(s => s.isEnabled !== false).reduce((a, s) => a + Math.min((t.questionCounts || {})[s.key] || 0, s.questionCount), 0);
  async function editTest(t) {
    const start = (t ? t.sections : (await adm('/section-defaults')).sections);
    let secs = start.map((s, i) => ({ key: s.key, sectionName: s.sectionName || s.name, type: s.type, questionCount: s.questionCount, marksPerQuestion: s.marksPerQuestion != null ? s.marksPerQuestion : (s.type === 'descriptive' ? 0 : s.totalMarks / s.questionCount), durationMinutes: s.durationMinutes, isEnabled: s.isEnabled !== false, displayOrder: s.displayOrder || i + 1 }));
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = `<div class="modal wide" role="dialog" aria-modal="true"><h3>${t ? 'Edit Test' : 'Create New Test'}</h3><div>
      <div id="terr"></div>
      <div class="filters" style="grid-template-columns:1fr 1fr">
        <div class="field" style="grid-column:1/-1"><label for="tn">Test Name</label><input id="tn" maxlength="100" value="${esc(t ? t.testName : '')}"></div>
        <div class="field"><label for="tdt">Test Date (IST)</label><input id="tdt" type="date" min="${today}" value="${esc(t ? t.scheduledDate : '')}"><div class="hint">Students can start the test only on this date.</div></div>
        <div class="field"><label for="ta">Test Status</label><select id="ta"><option value="0" ${!t || !t.isActive ? 'selected' : ''}>Inactive (draft)</option><option value="1" ${t && t.isActive ? 'selected' : ''}>Active</option></select><div class="hint">A test can be activated only when every enabled section has enough questions.</div></div>
        <div class="field" style="grid-column:1/-1"><label for="td">Test Description</label><input id="td" maxlength="400" value="${esc(t ? t.description : '')}"></div></div>
      <label class="lbl">Section Configuration</label>
      <div class="table-wrap"><table class="t"><thead><tr><th>Order</th><th>Section Name</th><th>Type</th><th class="num">Questions</th><th class="num">Marks / question</th><th class="num">Total marks</th><th class="num">Time (min)</th><th>Enabled</th><th></th></tr></thead><tbody id="secRows"></tbody></table></div>
      <div style="margin:10px 0"><button class="btn sm secondary" id="addSec" type="button">Add Section</button></div>
      <div class="panel" style="margin-top:10px"><div class="ph"><h2>Exam Preview</h2></div><div class="pb" id="prev"></div></div>
      <p class="muted small" style="margin:8px 0 0">Only enabled sections are part of the exam. They run in the order shown, each with its own timer; the total time and marks are calculated from the enabled sections.</p></div>
      <div class="actions"><button class="btn secondary" id="tc" type="button">Cancel</button><button class="btn" id="ts" type="button">${t ? 'Save Changes' : 'Create Test'}</button></div></div>`;
    document.body.appendChild(back);
    const $$ = x => back.querySelector(x), num = (v, d = 0) => (v === '' || v == null || isNaN(+v)) ? d : +v;
    const r2 = n => Math.round(n * 100) / 100;
    const bank = k => (t && t.questionCounts && t.questionCounts[k]) || 0;
    function preview() {
      const on = secs.filter(s => s.isEnabled).sort((a, b) => a.displayOrder - b.displayOrder);
      const q = on.reduce((a, s) => a + num(s.questionCount), 0), m = on.filter(s => s.type === 'objective').reduce((a, s) => a + num(s.questionCount) * num(s.marksPerQuestion), 0), d = on.reduce((a, s) => a + num(s.durationMinutes), 0);
      $$('#prev').innerHTML = on.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>#</th><th>Section</th><th class="num">Questions</th><th class="num">Marks</th><th class="num">Time</th>${t ? '<th class="num">In question bank</th>' : ''}</tr></thead><tbody>
        ${on.map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.sectionName)}${s.type === 'descriptive' ? ' <span class="muted small">(descriptive, not auto-scored)</span>' : ''}</td><td class="num">${num(s.questionCount)}</td><td class="num">${s.type === 'descriptive' ? 'NA' : r2(num(s.questionCount) * num(s.marksPerQuestion))}</td><td class="num">${num(s.durationMinutes)} min</td>${t ? `<td class="num">${bank(s.key)}${s.key && bank(s.key) < num(s.questionCount) ? ' <span class="badge red">short</span>' : ''}</td>` : ''}</tr>`).join('')}
        <tr><td></td><td><b>Total (${on.length} section${on.length === 1 ? '' : 's'})</b></td><td class="num"><b>${q}</b></td><td class="num"><b>${r2(m)}</b></td><td class="num"><b>${d} min</b></td>${t ? '<td></td>' : ''}</tr></tbody></table></div>` : '<div class="alert error">Enable at least one section.</div>';
    }
    function draw() {
      secs.sort((a, b) => a.displayOrder - b.displayOrder);
      $$('#secRows').innerHTML = secs.map((s, i) => `<tr data-i="${i}" class="${s.isEnabled ? '' : 'muted'}">
        <td class="nowrap">${i + 1} <button class="btn sm ghost" data-mv="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">&uarr;</button><button class="btn sm ghost" data-mv="1" ${i === secs.length - 1 ? 'disabled' : ''} aria-label="Move down">&darr;</button></td>
        <td><input class="input f-name" maxlength="60" value="${esc(s.sectionName)}" style="min-width:150px" aria-label="Section name"></td>
        <td><select class="input f-type" ${s.key && t && t.sections.some(x => x.key === s.key) ? 'disabled' : ''}><option value="objective" ${s.type === 'objective' ? 'selected' : ''}>Objective</option><option value="descriptive" ${s.type === 'descriptive' ? 'selected' : ''}>Descriptive</option></select></td>
        <td><input class="input f-q" type="number" min="0" max="200" value="${s.questionCount}" style="width:74px" aria-label="Questions"></td>
        <td>${s.type === 'descriptive' ? 'NA' : `<input class="input f-m" type="number" min="0" step="0.25" max="100" value="${s.marksPerQuestion}" style="width:74px" aria-label="Marks per question">`}</td>
        <td class="num f-tot">${s.type === 'descriptive' ? 'NA' : r2(num(s.questionCount) * num(s.marksPerQuestion))}</td>
        <td><input class="input f-d" type="number" min="0" max="300" value="${s.durationMinutes}" style="width:74px" aria-label="Time in minutes"></td>
        <td><input type="checkbox" class="f-on" ${s.isEnabled ? 'checked' : ''} aria-label="Enabled"></td>
        <td><button class="btn sm danger" data-rm="1" type="button">Remove</button></td></tr>`).join('');
      preview();
    }
    const rowOf = el => secs[+el.closest('tr[data-i]').dataset.i];
    back.addEventListener('input', e => {
      const el = e.target, row = el.closest('tr[data-i]'); if (!row) return; const s = rowOf(el);
      if (el.classList.contains('f-name')) s.sectionName = el.value;
      if (el.classList.contains('f-q')) s.questionCount = el.value;
      if (el.classList.contains('f-m')) s.marksPerQuestion = el.value;
      if (el.classList.contains('f-d')) s.durationMinutes = el.value;
      const tot = row.querySelector('.f-tot'); if (tot && s.type === 'objective') tot.textContent = r2(num(s.questionCount) * num(s.marksPerQuestion));
      preview();
    });
    back.addEventListener('change', e => {
      const el = e.target; if (!el.closest('tr[data-i]')) return; const s = rowOf(el);
      if (el.classList.contains('f-on')) { s.isEnabled = el.checked; draw(); }
      if (el.classList.contains('f-type')) { s.type = el.value; if (s.type === 'descriptive') s.marksPerQuestion = 0; else if (!+s.marksPerQuestion) s.marksPerQuestion = 1; draw(); }
    });
    back.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b || !b.closest('tr[data-i]')) return; const i = +b.closest('tr[data-i]').dataset.i, s = secs[i];
      if (b.dataset.mv) { const j = i + +b.dataset.mv; if (j < 0 || j >= secs.length) return; [secs[i].displayOrder, secs[j].displayOrder] = [secs[j].displayOrder, secs[i].displayOrder]; draw(); }
      if (b.dataset.rm) {
        const had = s.key && t && t.sections.some(x => x.key === s.key) ? bank(s.key) : 0;
        if (had && !await confirmBox('Remove section?', `<p><b>${esc(s.sectionName)}</b> has ${had} question(s) in the question bank. Removing the section deletes them when you save. To keep them, untick <b>Enabled</b> instead.</p>`, 'Remove', 'danger')) return;
        secs.splice(i, 1); secs.forEach((x, k) => x.displayOrder = k + 1); draw();
      }
    });
    $$('#addSec').onclick = () => { secs.push({ key: '', sectionName: '', type: 'objective', questionCount: 5, marksPerQuestion: 1, durationMinutes: 10, isEnabled: true, displayOrder: secs.length + 1 }); draw(); const n = back.querySelectorAll('.f-name'); n[n.length - 1].focus(); };
    draw();
    $$('#tc').onclick = () => back.remove();
    $$('#ts').onclick = async () => {
      const sections = secs.map(s => ({ ...(s.key ? { key: s.key } : {}), sectionName: s.sectionName, type: s.type, questionCount: num(s.questionCount), marksPerQuestion: s.type === 'descriptive' ? 0 : num(s.marksPerQuestion), durationMinutes: num(s.durationMinutes), isEnabled: s.isEnabled, displayOrder: s.displayOrder }));
      const body = { testName: $$('#tn').value, scheduledDate: $$('#tdt').value, description: $$('#td').value, isActive: $$('#ta').value === '1', sections };
      try { await adm(t ? '/tests/' + t.id : '/tests', { method: t ? 'PUT' : 'POST', body }); back.remove(); toast(t ? 'Test updated' : 'Test created', 'success'); route(); }
      catch (e) { if (e.status === 401) { back.remove(); unauth(); return; } const d = e.details && e.details.shortages ? ' ' : (e.details ? ' ' + Object.values(e.details).join(' ') : ''); $$('#terr').innerHTML = `<div class="alert error">${esc(e.message)}${e.details && !e.details.shortages && e.message !== Object.values(e.details)[0] ? esc(d) : ''}</div>`; $$('#terr').scrollIntoView({ block: 'nearest' }); }
    };
  }

  // ---------- questions (part of Test Management) ----------
  async function questions(pane, secFilter = '') {
    await refreshTests();
    if (!tests.length) { pane.innerHTML = '<div class="empty">Create a test first.</div>'; return; }
    if (!qTest || !tests.find(t => t.id === qTest)) qTest = tests[0].id;
    const { test, questions: list } = await adm(`/tests/${qTest}/questions`);
    const shown = secFilter ? list.filter(q => q.section === secFilter) : list;
    pane.innerHTML = `<div class="pagehead"><div><h1>Questions</h1><p><a href="#tests">&larr; Back to Test Management</a></p></div><button class="btn" id="addQ">Add Question</button></div>
      <div class="panel"><div class="pb"><div class="filters">
        <div class="field"><label for="qt">Test</label><select id="qt">${tests.map(t => `<option value="${t.id}" ${t.id === qTest ? 'selected' : ''}>${esc(t.testName)}</option>`).join('')}</select></div>
        <div class="field"><label for="qs">Section</label><select id="qs"><option value="">All sections</option>${test.sections.map(s => `<option value="${s.key}" ${s.key === secFilter ? 'selected' : ''}>${esc(s.name)} (${test.questionCounts[s.key] || 0}/${s.questionCount})</option>`).join('')}</select></div></div></div></div>
      <div class="panel"><div class="pb flush">${shown.length ? `<div class="table-wrap"><table class="t stack"><thead><tr><th>#</th><th>Section</th><th>Question</th><th>Answer</th><th></th></tr></thead><tbody>
      ${shown.map((q, i) => { const s = test.sections.find(x => x.key === q.section); return `<tr><td data-l="#">${i + 1}</td><td data-l="Section">${esc(s ? s.name : q.section)}</td><td data-l="Question" style="max-width:520px"><div style="white-space:pre-wrap;text-align:left">${esc(q.text.length > 160 ? q.text.slice(0, 160) + '…' : q.text)}</div></td>
        <td data-l="Answer">${q.options && q.options.length ? 'ABCD'[q.correctOption] : '<span class="badge grey">Descriptive</span>'}</td><td class="act nowrap"><button class="btn sm secondary" data-e="${q._id}">Edit</button> <button class="btn sm danger" data-d="${q._id}">Delete</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">No questions yet for this selection.</div>'}</div></div>`;
    $('qt').onchange = e => { qTest = e.target.value; guard(() => questions(pane)); };
    $('qs').onchange = e => guard(() => questions(pane, e.target.value));
    $('addQ').onclick = () => editQuestion(test, null, secFilter);
    pane.querySelectorAll('[data-e]').forEach(b => b.onclick = () => editQuestion(test, list.find(q => q._id === b.dataset.e)));
    pane.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
      if (!await confirmBox('Delete question?', '<p>This cannot be undone.</p>', 'Delete', 'danger')) return;
      await guard(async () => { await adm('/questions/' + b.dataset.d, { method: 'DELETE' }); toast('Question deleted', 'success'); questions(pane, secFilter); });
    });
  }
  function editQuestion(test, q, defSec = '') {
    const sec = q ? q.section : (defSec || test.sections[0].key), opts = (q && q.options) || ['', '', '', ''];
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = `<div class="modal wide"><h3>${q ? 'Edit' : 'Add'} Question</h3><div><div id="qerr"></div>
      <div class="field"><label>Section</label><select id="fs" ${q ? 'disabled' : ''}>${test.sections.map(s => `<option value="${s.key}" ${s.key === sec ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Question text</label><textarea id="fq" rows="4" maxlength="4000">${esc(q ? q.text : '')}</textarea></div>
      <div class="filters" style="grid-template-columns:1fr 1fr"><div class="field"><label>Difficulty</label><select id="fdf">${['Easy', 'Medium', 'Hard'].map(d => `<option ${((q && q.difficulty) || 'Medium') === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="field"><label>Topic (optional)</label><input id="ftp" maxlength="80" value="${esc((q && q.topic) || '')}"></div></div>
      <div id="objFields"><div class="filters" style="grid-template-columns:1fr 1fr">${[0, 1, 2, 3].map(i => `<div class="field"><label>Option ${'ABCD'[i]}</label><input class="fo" value="${esc(opts[i] || '')}"></div>`).join('')}</div>
      <div class="field" style="max-width:200px"><label>Correct option</label><select id="fc">${[0, 1, 2, 3].map(i => `<option value="${i}" ${q && q.correctOption === i ? 'selected' : ''}>${'ABCD'[i]}</option>`).join('')}</select></div></div></div>
      <div class="actions"><button class="btn secondary" id="mc">Cancel</button><button class="btn" id="ms">Save</button></div></div>`;
    document.body.appendChild(back);
    const toggle = () => { const s = test.sections.find(x => x.key === back.querySelector('#fs').value); back.querySelector('#objFields').classList.toggle('hidden', s.type === 'descriptive'); };
    back.querySelector('#fs').onchange = toggle; toggle();
    back.querySelector('#mc').onclick = () => back.remove();
    back.querySelector('#ms').onclick = async () => {
      const sKey = back.querySelector('#fs').value, s = test.sections.find(x => x.key === sKey), body = { section: sKey, text: back.querySelector('#fq').value, difficulty: back.querySelector('#fdf').value, topic: back.querySelector('#ftp').value };
      if (s.type === 'objective') { body.options = [...back.querySelectorAll('.fo')].map(i => i.value); body.correctOption = +back.querySelector('#fc').value; }
      try { await adm(q ? '/questions/' + q._id : `/tests/${test._id || test.id}/questions`, { method: q ? 'PUT' : 'POST', body }); back.remove(); toast('Question saved', 'success'); questions($('pane')); }
      catch (e) { if (e.status === 401) { back.remove(); unauth(); return; } const d = e.details ? ' ' + Object.values(e.details).join(' · ') : ''; back.querySelector('#qerr').innerHTML = `<div class="alert error">${esc(e.message)}${esc(d)}</div>`; }
    };
  }

  // ================= SCHEDULE =================
  async function schedule(pane) {
    const [t, u, p] = await Promise.all([adm('/tests/today'), adm('/tests/upcoming'), adm('/tests/past')]);
    today = t.today; tests = [...t.tests, ...u.tests, ...p.tests];
    const table = (list, empty, past) => list.length ? `<div class="table-wrap"><table class="t stack"><thead><tr><th>Test Name</th><th>Scheduled Date</th><th class="num">Duration</th><th class="num">Questions</th><th class="num">Completed</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map(x => { const have = enabledHave(x);
        return `<tr><td data-l="Test"><b>${esc(x.testName)}</b></td><td data-l="Date">${fmtDay(x.scheduledDate)}</td><td data-l="Duration" class="num">${x.totalDuration} min</td><td data-l="Questions" class="num">${have} / ${x.totalQuestions}</td><td data-l="Completed" class="num">${x.completedAttempts}</td><td data-l="Status">${statusBadge(x)} ${readyBadge(x)}</td>
        <td class="act nowrap">${past ? `<button class="btn sm ghost" data-v="${esc(x.testName)}">View Results</button> ` : ''}<button class="btn sm secondary" data-rs="${x.id}">${past ? 'Reschedule' : 'Change Date'}</button>
        <button class="btn sm secondary" data-t="${x.id}">${x.isActive ? 'Deactivate' : 'Activate'}</button></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty">${empty}</div>`;
    pane.innerHTML = `<div class="pagehead"><div><h1>Schedule Management</h1><p>A test is available to students only on its scheduled date (IST). Today: <b>${fmtDay(today)}</b></p></div><button class="btn" id="addT">Schedule New Test</button></div>
      <div class="panel"><div class="ph"><h2>Scheduled for Today</h2></div><div class="pb flush">${table(t.tests, 'No tests are scheduled for today.')}</div></div>
      <div class="panel"><div class="ph"><h2>Upcoming Tests</h2></div><div class="pb flush">${table(u.tests, 'No upcoming tests are scheduled.')}</div></div>
      <div class="panel"><div class="ph"><h2>Completed and Past Tests</h2></div><div class="pb flush">${table(p.tests, 'No past tests yet.', true)}</div></div>`;
    $('addT').onclick = () => editTest();
    pane.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => reschedule(tests.find(x => x.id === b.dataset.rs)));
    pane.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const x = tests.find(y => y.id === b.dataset.t); guard(async () => { await adm('/tests/' + x.id, { method: 'PUT', body: { isActive: !x.isActive } }); toast(x.isActive ? 'Test deactivated' : 'Test activated', 'success'); schedule(pane); }); });
    pane.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { R = freshR(); R.testName = b.dataset.v; go('results'); });
  }
  async function reschedule(t) {
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = `<div class="modal"><h3>${t.availability === 'closed' ? 'Reschedule' : 'Change Date'}: ${esc(t.testName)}</h3><div><div id="rerr"></div><div class="field"><label for="rd">New test date (IST)</label><input id="rd" type="date" min="${today}" value="${t.scheduledDate >= today ? t.scheduledDate : ''}">
      <div class="hint">Currently scheduled for ${fmtDay(t.scheduledDate)}. Students can start the test only on the new date.</div></div></div>
      <div class="actions"><button class="btn secondary" id="rc">Cancel</button><button class="btn" id="rsv">Save Date</button></div></div>`;
    document.body.appendChild(back);
    back.querySelector('#rc').onclick = () => back.remove();
    back.querySelector('#rsv').onclick = async () => {
      try { await adm('/tests/' + t.id, { method: 'PUT', body: { scheduledDate: back.querySelector('#rd').value } }); back.remove(); toast('Test rescheduled', 'success'); schedule($('pane')); }
      catch (e) { if (e.status === 401) { back.remove(); unauth(); return; } back.querySelector('#rerr').innerHTML = `<div class="alert error">${esc(e.message)}</div>`; }
    };
  }

  // ================= RESULTS =================
  function resultsTable(rows, sortable, stud) {
    if (!rows.length) return '<div class="empty">No results found for the selected filters.</div>';
    const cols = [['studentName', 'Student Name'], ['rollNumber', 'Roll Number'], ['department', 'Department'], ['yearOfStudy', 'Year of Study'], ['testName', 'Test Name'], ['submissionDate', 'Test Date'], ['totalMarks', 'Total Marks']];
    const th = cols.map(([k, l]) => `<th class="${sortable ? 'sortable' : ''} ${k === 'totalMarks' ? 'num' : ''}" ${sortable ? `data-s="${k}"` : ''}>${l}${sortable && R.sort === k ? `<span class="arr">${R.order === 'asc' ? '&#9650;' : '&#9660;'}</span>` : ''}</th>`).join('');
    return `<div class="table-wrap"><table class="t stack"><thead><tr>${th}</tr></thead><tbody>${rows.map(r => `<tr><td data-l="Student"><b>${stud ? `<a href="#results" data-st="${r.studentId}" data-n="${esc(r.studentName)}" title="Show only this student">${esc(r.studentName)}</a>` : esc(r.studentName)}</b></td><td data-l="Roll No.">${esc(r.rollNumber)}</td><td data-l="Dept.">${esc(r.department)}</td><td data-l="Year">${esc(r.yearOfStudy)}</td>
      <td data-l="Test">${esc(r.testName)}</td><td data-l="Date">${fmtDate(r.submissionDate)}</td><td data-l="Marks" class="num"><b>${r.totalMarks}</b></td></tr>`).join('')}</tbody></table></div>`;
  }
  async function results(pane) {
    const o = await adm('/results/options');
    const depts = [...new Set([...DEPTS, ...o.departments])], yrs = [...new Set([...YEARS, ...o.years])];
    pane.innerHTML = `<div class="pagehead"><div><h1>Examination Results</h1><p>Completed mock test results of all students.</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="xl">Download Results &ndash; Excel (.xlsx)</button><button class="btn secondary" id="cv">Download CSV</button></div></div>
      <div class="panel"><div class="ph"><h2>Search and Filters</h2><button class="btn sm secondary" id="reset" type="button">Reset Filters</button></div><div class="pb">
        <div class="filters">
          <div class="field" style="grid-column:span 2"><label for="fq">Search (student name, roll number, test name)</label><input id="fq" value="${esc(R.q)}"></div>
          <div class="field"><label for="fd">Department</label><select id="fd">${opt(depts, R.department, 'All')}</select></div>
          <div class="field"><label for="fy">Year of Study</label><select id="fy">${opt(yrs, R.year, 'All')}</select></div>
          <div class="field"><label for="ft">Test Name</label><select id="ft">${opt(o.testNames, R.testName, 'All tests')}</select></div>
          <div class="field"><label for="fdt">Test Date</label><input id="fdt" type="date" value="${R.date}"></div>
          <div class="field"><label for="ff">From Date</label><input id="ff" type="date" value="${R.from}"></div>
          <div class="field"><label for="fto">To Date</label><input id="fto" type="date" value="${R.to}"></div>
          <div class="field"><label for="fs">Sort by</label><select id="fs">${[['submissionDate', 'Submission Date'], ['studentName', 'Student Name'], ['rollNumber', 'Roll Number'], ['department', 'Department'], ['yearOfStudy', 'Year of Study'], ['testName', 'Test Name'], ['totalMarks', 'Total Marks']].map(([k, l]) => `<option value="${k}" ${R.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="fo">Order</label><select id="fo"><option value="desc" ${R.order === 'desc' ? 'selected' : ''}>Descending</option><option value="asc" ${R.order === 'asc' ? 'selected' : ''}>Ascending</option></select></div></div>
        ${R.studentId ? `<p style="margin:12px 0 0">Student filter: <span class="chip">${esc(R.studentLabel || R.studentId)} <button id="clrS" aria-label="Remove student filter">&times;</button></span></p>` : ''}</div></div>
      <div class="panel"><div class="pb flush" id="rlist"><div class="empty">Loading…</div></div></div>`;
    const load = async () => {
      const r = await adm('/results?' + qs({ ...filterParams(R), sort: R.sort, order: R.order, page: R.page, limit: R.limit }));
      $('rlist').innerHTML = resultsTable(r.results, true, true) + pager(r, null, true);
      bindPager(r, p => { R.page = p; guard(load); }, n => { R.limit = n; R.page = 1; guard(load); });
      $('rlist').querySelectorAll('[data-s]').forEach(h => h.onclick = () => { if (R.sort === h.dataset.s) R.order = R.order === 'asc' ? 'desc' : 'asc'; else { R.sort = h.dataset.s; R.order = 'asc'; } R.page = 1; $('fs').value = R.sort; $('fo').value = R.order; guard(load); });
      $('rlist').querySelectorAll('[data-st]').forEach(a => a.onclick = e => { e.preventDefault(); R.studentId = a.dataset.st; R.studentLabel = a.dataset.n; R.page = 1; results(pane); });
    };
    const apply = () => { Object.assign(R, { q: $('fq').value.trim(), department: $('fd').value, year: $('fy').value, testName: $('ft').value, date: $('fdt').value, from: $('ff').value, to: $('fto').value, sort: $('fs').value, order: $('fo').value, page: 1 }); guard(load); };
    $('fq').oninput = debounce(apply); ['fd', 'fy', 'ft', 'fdt', 'ff', 'fto', 'fs', 'fo'].forEach(i => $(i).onchange = apply);
    $('reset').onclick = () => { R = freshR(); results(pane); };
    if ($('clrS')) $('clrS').onclick = () => { R.studentId = ''; R.studentLabel = ''; R.page = 1; results(pane); };
    // exports always use the filters and sorting currently applied above
    $('xl').onclick = () => guard(() => download('excel', { ...filterParams(R), sort: R.sort, order: R.order }));
    $('cv').onclick = () => guard(() => download('csv', { ...filterParams(R), sort: R.sort, order: R.order }));
    await load();
  }

  // ================= REPORTS =================
  const RP = { department: '', year: '', testName: '', date: '', from: '', to: '' };
  async function reports(pane) {
    const o = await adm('/results/options');
    const depts = [...new Set([...DEPTS, ...o.departments])], yrs = [...new Set([...YEARS, ...o.years])];
    pane.innerHTML = `<div class="pagehead"><div><h1>Reports and Downloads</h1><p>Export examination results from the database as an Excel workbook or CSV file.</p></div></div>
      <div class="panel"><div class="ph"><h2>Export Options</h2></div><div class="pb">
        <div class="filters">
          <div class="field"><label for="rt">Test</label><select id="rt">${opt(o.testNames, RP.testName, 'All tests')}</select></div>
          <div class="field"><label for="rd2">Department</label><select id="rd2">${opt(depts, RP.department, 'All departments')}</select></div>
          <div class="field"><label for="ry">Year of Study</label><select id="ry">${opt(yrs, RP.year, 'All years')}</select></div>
          <div class="field"><label for="rdate">Single Date</label><input id="rdate" type="date" value="${RP.date}"></div>
          <div class="field"><label for="rf">Date Range: From</label><input id="rf" type="date" value="${RP.from}"></div>
          <div class="field"><label for="rto">Date Range: To</label><input id="rto" type="date" value="${RP.to}"></div></div>
        <p id="rcount" class="muted" style="margin:14px 0">&nbsp;</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn lg" id="rxl">Download Results &ndash; Excel (.xlsx)</button><button class="btn secondary lg" id="rcv">Download CSV</button><button class="btn secondary lg" id="rall">Reset (all results)</button></div></div></div>
      <div class="panel"><div class="ph"><h2>About the Excel Report</h2></div><div class="pb"><ul class="rules"><li>Columns: Student ID, Student Name, Roll Number, Department, Year of Study, Test Name, Total Marks, Submission Date.</li>
        <li>Only the results matching the options selected above are exported. With nothing selected, all results are exported.</li>
        <li>The report heading carries the college name, the generation date and the filters used. Dates and times are in IST.</li>
        <li>The college logo is included in the heading when the logo file has been added to the website (<code>public/img/college-logo.png</code>).</li></ul></div></div>`;
    const params = () => { Object.assign(RP, { testName: $('rt').value, department: $('rd2').value, year: $('ry').value, date: $('rdate').value, from: $('rf').value, to: $('rto').value }); return { ...RP }; };
    const count = async () => { const p = params(); try { const r = await adm('/results?' + qs({ ...p, limit: 1 })); $('rcount').innerHTML = `<b>${r.total}</b> result${r.total === 1 ? '' : 's'} match the selected options.`; } catch (e) { $('rcount').textContent = e.message; } };
    ['rt', 'rd2', 'ry', 'rdate', 'rf', 'rto'].forEach(i => $(i).onchange = () => guard(count));
    $('rxl').onclick = () => guard(() => download('excel', params())); $('rcv').onclick = () => guard(() => download('csv', params()));
    $('rall').onclick = () => { Object.keys(RP).forEach(k => RP[k] = ''); reports(pane); };
    await count();
  }

  const VIEWS = { overview, students, tests: testsView, schedule, results, reports };
  if (token) start();
})();
