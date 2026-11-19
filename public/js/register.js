const $ = s => document.querySelector(s);
const regForm = $('#regForm'), contForm = $('#contForm');

// If a student is already signed in on this browser, go straight to the dashboard.
if (store.get('pm_student')) location.replace('dashboard.html');

function show(which) {
  const reg = which === 'reg';
  regForm.classList.toggle('hidden', !reg); contForm.classList.toggle('hidden', reg);
  $('#tabReg').classList.toggle('on', reg); $('#tabCont').classList.toggle('on', !reg);
  $('#tabReg').setAttribute('aria-selected', reg); $('#tabCont').setAttribute('aria-selected', !reg);
}
$('#tabReg').onclick = () => show('reg'); $('#tabCont').onclick = () => show('cont');

const rules = {
  studentName: v => !v ? 'Student name is required' : !/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(v) ? 'Use 2-80 letters (spaces, . \' - allowed)' : '',
  rollNumber: v => !v ? 'Roll number is required' : !/^[A-Z0-9]{6,15}$/.test(v) ? 'Use 6-15 letters/digits, e.g. 22A81A05XX' : '',
  department: v => v ? '' : 'Department is required',
  yearOfStudy: v => v ? '' : 'Year of study is required'
};
function setErr(name, msg) {
  const f = regForm.elements[name].closest('.field');
  f.classList.toggle('invalid', !!msg); f.querySelector('.err').textContent = msg || '';
}
function values() {
  const v = Object.fromEntries(['studentName', 'rollNumber', 'department', 'yearOfStudy'].map(k => [k, regForm.elements[k].value.trim()]));
  v.studentName = v.studentName.replace(/\s+/g, ' '); v.rollNumber = v.rollNumber.toUpperCase();
  return v;
}
Object.keys(rules).forEach(k => regForm.elements[k].addEventListener('blur', () => setErr(k, rules[k](values()[k]))));

regForm.addEventListener('submit', async e => {
  e.preventDefault();
  const v = values(); let bad = false;
  Object.keys(rules).forEach(k => { const m = rules[k](v[k]); setErr(k, m); if (m) bad = true; });
  const msg = $('#regMsg'); msg.innerHTML = '';
  if (bad) { msg.innerHTML = '<div class="alert error">Please correct the highlighted fields.</div>'; return; }
  const btn = $('#regBtn'); btn.disabled = true; btn.textContent = 'Registering…';
  try {
    const r = await api('/students/register', { method: 'POST', body: v });
    store.set('pm_student', r.student._id);
    msg.innerHTML = '<div class="alert success">Registration successful! Redirecting to your dashboard…</div>';
    setTimeout(() => location.href = 'dashboard.html', 700);
  } catch (err) {
    if (err.details) Object.entries(err.details).forEach(([k, m]) => rules[k] && setErr(k, m));
    msg.innerHTML = `<div class="alert error">${esc(err.message)}</div>`;
    btn.disabled = false; btn.textContent = 'Register';
  }
});

contForm.addEventListener('submit', async e => {
  e.preventDefault();
  const roll = $('#contRoll').value.trim().toUpperCase(); const msg = $('#contMsg');
  if (!roll) { msg.innerHTML = '<div class="alert error">Enter your roll number.</div>'; return; }
  try {
    const r = await api('/students/roll/' + encodeURIComponent(roll));
    store.set('pm_student', r.student._id); location.href = 'dashboard.html';
  } catch (err) { msg.innerHTML = `<div class="alert error">${esc(err.message)}</div>`; }
});
