(async function () {
  const sid = requireStudentId(); if (!sid) return;
  const app = document.getElementById('app');
  const NONE_TODAY = 'No mock tests are scheduled for today. Please check again on your next scheduled test date.';
  let D;

  async function load() {
    const [{ student }, today, upcoming, { results }] = await Promise.all([
      api('/students/' + sid), api('/tests/today'), api('/tests/upcoming'), api('/results/student/' + sid)
    ]);
    // Unfinished attempt on this browser?
    let resume = null;
    const saved = store.get('pm_attempt');
    if (saved) {
      try {
        const { attempt } = await api('/attempts/' + saved.attemptId, { token: saved.token });
        if (attempt.status === 'in_progress' && String(attempt.student.id) === String(sid)) resume = attempt; else store.del('pm_attempt');
      } catch { store.del('pm_attempt'); }
    }
    D = { student, today: today.tests, todayMsg: today.message || NONE_TODAY, todayDate: today.today, upcoming: upcoming.tests, results, resume };
    document.getElementById('top').innerHTML = siteHeader({ href: 'dashboard.html', sub: 'Student Portal', student, nav: '<button onclick="logout()">Sign out</button>' });
    document.getElementById('foot').innerHTML = siteFooter();
  }

  const maxOf = r => r.maxMarks ?? 75;
  const metaCells = t => `<td data-l="Date">${esc(fmtDay(t.scheduledDate))}</td><td data-l="Questions" class="num">${t.totals.questions}</td><td data-l="Total Marks" class="num">${t.totals.objectiveMarks}</td><td data-l="Duration" class="num">${t.totals.durationMinutes} min</td>`;
  const head = '<th>Test Name</th><th>Test Date</th><th class="num">Questions</th><th class="num">Total Marks</th><th class="num">Duration</th>';

  const resumeBanner = () => D.resume ? `<div class="alert warn" style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
      <span><b>Examination in progress:</b> ${esc(D.resume.testName)}, section ${D.resume.currentSection + 1} of ${D.resume.sections.length}. The timer is running on the server.</span>
      <a class="btn sm" href="exam.html">Resume Examination</a></div>` : '';

  function todayTable() {
    if (!D.today.length) return `<div class="empty">${esc(D.todayMsg)}</div>`;
    return `<div class="table-wrap"><table class="t stack"><thead><tr>${head}<th></th></tr></thead><tbody>
      ${D.today.map(t => `<tr><td data-l="Test"><b>${esc(t.testName)}</b>${t.description ? `<div class="muted small">${esc(t.description)}</div>` : ''}</td>${metaCells(t)}
        <td class="act">${D.resume && D.resume.testId === t.id ? '<a class="btn sm" href="exam.html">Resume</a>' : `<a class="btn sm" href="instructions.html?test=${t.id}">Start Test</a>`}</td></tr>`).join('')}
      </tbody></table></div>`;
  }
  function upcomingTable() {
    if (!D.upcoming.length) return '<div class="empty">No upcoming tests have been scheduled yet.</div>';
    return `<div class="table-wrap"><table class="t stack"><thead><tr>${head}<th>Availability</th></tr></thead><tbody>
      ${D.upcoming.map(t => `<tr><td data-l="Test"><b>${esc(t.testName)}</b></td>${metaCells(t)}<td data-l="Availability"><span class="badge amber">Opens on ${esc(fmtDay(t.scheduledDate))}</span></td></tr>`).join('')}
      </tbody></table></div>`;
  }
  function historyTable(limit) {
    const list = limit ? D.results.slice(0, limit) : D.results;
    if (!list.length) return '<div class="empty">You have not completed any mock test yet.</div>';
    return `<div class="table-wrap"><table class="t stack"><thead><tr><th>#</th><th>Test Name</th><th class="num">Marks Obtained</th><th>Submitted (IST)</th><th></th></tr></thead><tbody>
      ${list.map((r, i) => `<tr><td data-l="#">${D.results.length - i}</td><td data-l="Test">${esc(r.testName)}</td><td data-l="Marks" class="num"><span><b>${r.totalMarks}</b> / ${maxOf(r)}</span></td><td data-l="Submitted">${fmtDate(r.submissionDate)}</td>
        <td class="act"><a class="btn sm ghost" href="result.html?id=${r._id}">View Result</a></td></tr>`).join('')}</tbody></table></div>`;
  }
  const profile = () => { const s = D.student; return `<div class="kv"><div><small>Student Name</small><b>${esc(s.studentName)}</b></div><div><small>Roll Number</small><b>${esc(s.rollNumber)}</b></div>
      <div><small>Department</small><b>${esc(s.department)}</b></div><div><small>Year of Study</small><b>${esc(s.yearOfStudy)}</b></div></div>`; };

  const VIEWS = {
    overview() {
      const last = D.results[0], best = D.results.length ? Math.max(...D.results.map(r => r.totalMarks)) : null;
      return `<div class="pagehead"><div><h1>Student Dashboard</h1><p>Today is ${esc(fmtDay(D.todayDate))} (IST)</p></div></div>
        ${resumeBanner()}
        <div class="panel"><div class="ph"><h2>Student Profile</h2></div><div class="pb">${profile()}</div></div>
        <div class="statline"><div><b>${D.results.length}</b><small>Total tests attempted</small></div><div><b>${last ? `${last.totalMarks} / ${maxOf(last)}` : '—'}</b><small>Latest test marks</small></div>
          <div><b>${best !== null ? best : '—'}</b><small>Best marks</small></div><div><b>${D.today.length}</b><small>Tests scheduled today</small></div></div>
        <div class="panel"><div class="ph"><h2>Today's Scheduled Tests</h2></div><div class="pb flush">${todayTable()}</div></div>
        <div class="panel"><div class="ph"><h2>Recent Results</h2>${D.results.length > 5 ? '<a href="#history" class="small">View all</a>' : ''}</div><div class="pb flush">${historyTable(5)}</div></div>`;
    },
    today() {
      return `<div class="pagehead"><div><h1>Today's Scheduled Tests</h1><p>${esc(fmtDay(D.todayDate))}. Tests can be started only on their scheduled date.</p></div></div>${resumeBanner()}
        <div class="panel"><div class="pb flush">${todayTable()}</div></div>`;
    },
    upcoming() {
      return `<div class="pagehead"><div><h1>Upcoming Tests</h1><p>These tests cannot be started before their scheduled date.</p></div></div>
        <div class="panel"><div class="pb flush">${upcomingTable()}</div></div>`;
    },
    history() {
      return `<div class="pagehead"><div><h1>Previous Test History</h1><p>${D.results.length} completed test${D.results.length === 1 ? '' : 's'}</p></div></div>
        <div class="panel"><div class="pb flush">${historyTable()}</div></div>`;
    },
    profile() {
      return `<div class="pagehead"><div><h1>Student Profile</h1></div></div><div class="panel"><div class="pb">${profile()}
        <p class="muted small" style="margin:12px 0 0">Registered on ${fmtDate(D.student.registrationDate)}</p></div></div>`;
    }
  };
  const MENU = [['overview', 'Dashboard'], ['today', "Today's Tests"], ['upcoming', 'Upcoming Tests'], ['history', 'Test History'], ['profile', 'My Profile']];

  function render() {
    const v = (location.hash || '#overview').slice(1); const key = VIEWS[v] ? v : (v === 'results' ? 'history' : 'overview');
    document.getElementById('side').innerHTML = MENU.map(([k, l]) => `<a href="#${k}" class="${k === key ? 'on' : ''}">${l}${k === 'today' && D.today.length ? ` <span class="badge blue">${D.today.length}</span>` : ''}</a>`).join('');
    app.innerHTML = VIEWS[key]();
  }
  try { await load(); render(); window.addEventListener('hashchange', render); }
  catch (e) {
    if (e.status === 404 || e.status === 400) { store.del('pm_student'); location.replace('index.html'); return; }
    app.innerHTML = `<div class="alert error">${esc(e.message)}</div><button class="btn" onclick="location.reload()">Retry</button>`;
  }
})();
