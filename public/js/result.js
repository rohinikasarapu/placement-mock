(async function () {
  const id = new URLSearchParams(location.search).get('id');
  const app = document.getElementById('app');
  const sid = store.get('pm_student');
  let student = null; if (sid) { try { student = (await api('/students/' + sid)).student; } catch {} }
  document.getElementById('top').innerHTML = siteHeader({ href: sid ? 'dashboard.html' : 'index.html', sub: 'Examination Result', student, nav: sid ? '<a href="dashboard.html">Dashboard</a><a href="dashboard.html#history">Test History</a><button onclick="logout()">Sign out</button>' : '' });
  document.getElementById('foot').innerHTML = siteFooter();
  if (!id) return location.replace('dashboard.html');
  try {
    const { result: r, breakdown: b } = await api('/results/' + id);
    const max = (b && b.maxMarks) || r.maxMarks || 75, pct = max ? Math.round((r.totalMarks / max) * 100) : 0;
    const term = b && b.submitReason === 'violation';
    const how = !b ? '' : term ? 'Terminated: exceeded the maximum number of violations' : b.submitReason === 'timeout' ? 'Auto-submitted when the final section timer ended' : 'Submitted by the candidate';
    app.innerHTML = `
      <div class="pagehead"><div><h1>Examination Result</h1><p>${esc(r.testName)}</p></div>
        <div style="display:flex;gap:8px"><a class="btn secondary" href="dashboard.html">Back to Dashboard</a><button class="btn ghost" onclick="print()">Print</button></div></div>

      ${term ? `<div class="notice"><b>Examination terminated.</b> ${esc(b.terminationReason || 'Exceeded maximum tab-switch/full-screen violations')}. The answers saved up to that moment were submitted automatically and scored below.</div>` : ''}

      <div class="panel"><div class="ph"><h2>Candidate and Score</h2></div><div class="pb">
        <div class="kv" style="margin-bottom:16px"><div><small>Student Name</small><b>${esc(r.studentName)}</b></div><div><small>Roll Number</small><b>${esc(r.rollNumber)}</b></div>
          <div><small>Department</small><b>${esc(r.department)}</b></div><div><small>Year of Study</small><b>${esc(r.yearOfStudy)}</b></div></div>
        <div class="score-box"><div><div class="muted small">Total Objective Marks</div><div class="score-big">${r.totalMarks} <small>/ ${max}</small></div><div class="muted small">${pct}% of objective marks</div></div>
          <div class="muted small">Submitted on<br><b style="color:var(--ink)">${fmtDate(r.submissionDate)} IST</b>${how ? `<br>${esc(how)}` : ''}</div></div></div></div>

      ${b ? `<div class="statline"><div><b style="color:var(--green)">${b.correct}</b><small>Correct answers</small></div><div><b style="color:var(--red)">${b.incorrect}</b><small>Incorrect answers</small></div>
        <div><b>${b.unanswered}</b><small>Unanswered</small></div><div><b>${fmtDur(b.timeTakenSeconds)}</b><small>Time taken</small></div>${b.violationCount ? `<div><b>${b.violationCount}</b><small>Violations recorded</small></div>` : ''}</div>

      <div class="panel"><div class="ph"><h2>Section-wise Performance</h2></div><div class="pb flush"><div class="table-wrap"><table class="t stack"><thead><tr><th>Section</th><th class="num">Marks</th><th class="num">Correct</th><th class="num">Incorrect</th><th class="num">Unanswered</th><th>Score</th></tr></thead><tbody>
        ${b.sections.map(s => s.type === 'descriptive'
          ? `<tr><td data-l="Section"><b>${esc(s.name)}</b></td><td colspan="4" class="muted" data-l="Status">Descriptive: ${s.written ? 'response saved' : 'not attempted'} (not auto-scored)</td><td data-l="Score">NA</td></tr>`
          : `<tr><td data-l="Section"><b>${esc(s.name)}</b></td><td class="num" data-l="Marks">${s.marks} / ${s.maxMarks}</td><td class="num" data-l="Correct" style="color:var(--green)">${s.correct}</td><td class="num" data-l="Incorrect" style="color:var(--red)">${s.incorrect}</td><td class="num" data-l="Unanswered">${s.unanswered}</td>
              <td data-l="Score"><div class="bar"><i style="width:${s.maxMarks ? Math.round(s.marks / s.maxMarks * 100) : 0}%"></i></div></td></tr>`).join('')}
        </tbody></table></div></div></div>

      ${b.writtenResponse && b.writtenResponse.text ? `<div class="panel"><div class="ph"><h2>English Written Test Response</h2><span class="badge grey">${b.writtenResponse.wordCount} words</span></div><div class="pb"><div class="essay">${esc(b.writtenResponse.text)}</div></div></div>` : ''}`
      : '<div class="alert info">A detailed breakdown is not available for this result.</div>'}`;
  } catch (e) {
    app.innerHTML = `<div class="alert error">${esc(e.message)}</div><a class="btn" href="dashboard.html">Back to Dashboard</a>`;
  }
})();
