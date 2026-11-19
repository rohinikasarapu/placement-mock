(async function () {
  const sid = requireStudentId(); if (!sid) return;
  const testId = new URLSearchParams(location.search).get('test');
  const app = document.getElementById('app');
  if (!testId) return location.replace('dashboard.html');
  const root = document.documentElement;
  const canFS = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  const inFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const enterFS = () => (root.requestFullscreen ? root.requestFullscreen() : root.webkitRequestFullscreen());

  try {
    const [{ student }, ins] = await Promise.all([api('/students/' + sid), api(`/tests/${testId}/instructions`)]);
    document.getElementById('top').innerHTML = siteHeader({ href: 'dashboard.html', sub: 'Examination Instructions', student, nav: '<a href="dashboard.html">Dashboard</a>' });
    document.getElementById('foot').innerHTML = siteFooter();
    const t = ins.totals;
    app.innerHTML = `
      <div class="pagehead"><div><h1>${esc(ins.examName)}</h1><p>Please read all instructions carefully before you begin.</p></div></div>

      <div class="panel"><div class="ph"><h2>Examination Details</h2></div><div class="pb">
        <div class="kv" style="margin-bottom:12px"><div><small>Candidate</small><b>${esc(student.studentName)}</b></div><div><small>Roll Number</small><b>${esc(student.rollNumber)}</b></div>
          <div><small>Department</small><b>${esc(student.department)}</b></div><div><small>Year of Study</small><b>${esc(student.yearOfStudy)}</b></div></div>
        <div class="kv"><div><small>Examination Date</small><b>${esc(ins.scheduledDateLabel)}</b></div><div><small>Total Sections</small><b>${t.sections}</b></div>
          <div><small>Total Questions / Marks</small><b>${t.questions} / ${t.objectiveMarks}</b></div><div><small>Total Duration</small><b>${t.durationMinutes} minutes</b></div></div></div></div>

      <div class="panel"><div class="ph"><h2>Section-wise Pattern and Time Limits</h2></div><div class="pb flush"><div class="table-wrap"><table class="t">
        <thead><tr><th>S.No</th><th>Section Name</th><th class="num">Questions</th><th class="num">Marks</th><th class="num">Time</th></tr></thead><tbody>
        ${ins.sections.map((s, i) => `<tr><td>${i + 1}</td><td><b>${esc(s.name)}</b></td><td class="num">${s.questionCount}</td><td class="num">${s.type === 'descriptive' ? 'NA' : s.totalMarks}</td><td class="num">${s.durationMinutes} min</td></tr>`).join('')}
        </tbody></table></div>
        <p class="muted small" style="padding:10px 16px 0">The English Written Test is descriptive. It is saved but is not included in the objective marks.</p></div></div>

      <div class="ins-grid">
        <div class="panel"><div class="ph"><h2>Examination Rules</h2></div><div class="pb"><ol class="rules">${ins.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ol></div></div>
        <div>
          <div class="panel"><div class="ph"><h2>Full-screen and Tab Monitoring</h2></div><div class="pb"><ol class="rules">${ins.proctoringRules.map(r => `<li>${esc(r)}</li>`).join('')}</ol></div></div>
          <div class="panel"><div class="ph"><h2>Submission Instructions</h2></div><div class="pb"><ol class="rules">${ins.submissionInstructions.map(r => `<li>${esc(r)}</li>`).join('')}</ol></div></div>
        </div>
      </div>

      <div class="panel"><div class="ph"><h2>Before You Begin</h2></div><div class="pb">
        <div class="step" id="stepFs"><span class="no">1</span><div class="txt"><b>Enter full-screen mode</b><div class="muted small" id="fsText"></div></div>
          <button class="btn secondary" id="fsBtn" type="button">Enter Full Screen</button></div>
        <div class="step" id="stepAgree"><span class="no">2</span><div class="txt"><label class="check"><input type="checkbox" id="agree"> <span>I have read and understood all examination instructions.</span></label></div></div>
        <div class="step"><span class="no">3</span><div class="txt"><b>Start the examination</b><div class="muted small">The timer starts only when you click the button. It cannot be paused.</div></div>
          <a class="btn secondary" href="dashboard.html">Back</a><button class="btn success lg" id="begin" type="button" disabled>I'm Ready to Begin</button></div>
        <div id="msg"></div></div></div>`;

    const agree = document.getElementById('agree'), begin = document.getElementById('begin'), msg = document.getElementById('msg');
    const fsBtn = document.getElementById('fsBtn'), fsText = document.getElementById('fsText'), stepFs = document.getElementById('stepFs');
    function refresh() {
      const fs = inFS();
      stepFs.classList.toggle('ok', fs);
      fsText.textContent = !canFS ? 'This browser does not support full-screen mode. Please use a desktop or laptop with Chrome, Edge or Firefox.' : fs ? 'Full-screen mode is active.' : 'Click the button and allow full screen. The examination cannot start without it.';
      fsBtn.classList.toggle('hidden', fs || !canFS);
      begin.disabled = !(agree.checked && fs && ins.ready && canFS);
    }
    fsBtn.onclick = async () => { try { await enterFS(); } catch { msg.innerHTML = '<div class="alert error">Full screen was blocked by the browser. Please allow it and try again.</div>'; } refresh(); };
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, refresh));
    agree.onchange = refresh; refresh();
    if (!ins.ready) msg.innerHTML = '<div class="alert error">This test is not ready yet. Please contact the administrator.</div>';

    begin.onclick = async () => {
      if (!inFS()) return refresh();
      begin.disabled = true; begin.textContent = 'Starting…';
      try {
        const r = await api(`/tests/${testId}/start`, { method: 'POST', body: { studentId: sid } });   // server-side timer starts here
        store.set('pm_attempt', { attemptId: r.attemptId, token: r.token });
        await launchExam();
      } catch (e) {
        msg.innerHTML = `<div class="alert error">${esc(e.message)}</div>`;
        begin.textContent = "I'm Ready to Begin"; refresh();
      }
    };

    // Full-screen does not survive a page navigation, so the exam page is loaded into this same document.
    async function launchExam() {
      const html = await (await fetch('exam.html')).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      document.title = doc.title;
      const links = [...doc.querySelectorAll('link[rel=stylesheet]')];
      await Promise.all(links.map(l => new Promise(res => {
        if (document.querySelector(`link[href="${l.getAttribute('href')}"]`)) return res();
        const n = document.createElement('link'); n.rel = 'stylesheet'; n.href = l.getAttribute('href'); n.onload = n.onerror = res; document.head.appendChild(n);
      })));
      const scripts = [...doc.querySelectorAll('script[src]')].map(s => s.getAttribute('src')).filter(s => !/common\.js/.test(s));
      doc.querySelectorAll('script').forEach(s => s.remove());
      document.body.className = doc.body.className; document.body.innerHTML = doc.body.innerHTML;
      history.replaceState(null, '', 'exam.html');            // a refresh now reloads exam.html and resumes from the server
      for (const src of scripts) await new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = s.onerror = res; document.body.appendChild(s); });
    }
  } catch (e) {
    document.getElementById('top').innerHTML = siteHeader({ href: 'dashboard.html', sub: 'Examination Instructions' });
    app.innerHTML = `<div class="alert error" style="margin-top:8px">${esc(e.message)}</div><a class="btn" href="dashboard.html">Back to Dashboard</a>`;
  }
})();
