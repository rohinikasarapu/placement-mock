// Shared helpers for all student pages.
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};

async function api(path, { method = 'GET', body, token, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (token) h['X-Attempt-Token'] = token;
  let res;
  try {
    res = await fetch('/api' + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch (e) {
    const err = new Error('Cannot reach the server. Check your connection.'); err.network = true; throw err;
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const e = data && data.error ? data.error : {};
    const err = new Error(e.message || 'Request failed'); err.status = res.status; err.code = e.code; err.details = e.details; err.data = e; throw err;
  }
  return data;
}

function toast(msg, type = '') {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; box.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
// All dates shown to users are in IST (Asia/Kolkata), matching the server-side scheduling rules.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = d => { if (!d) return '—'; const [y, m, day] = String(d).slice(0, 10).split('-'); return `${day}-${MON[+m - 1]}-${y}`; };            // 'YYYY-MM-DD' -> 18-Nov-2026
const fmtDate = d => {
  if (!d) return '—';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).formatToParts(new Date(d)).map(x => [x.type, x.value]));
  return `${p.day}-${MON[+p.month - 1]}-${p.year}, ${p.hour}:${p.minute} ${String(p.dayPeriod).toUpperCase()}`;                                     // 18-Nov-2026, 10:30 AM
};
const fmtDur = sec => { const m = Math.floor(sec / 60), s = sec % 60; return (m ? m + ' min ' : '') + s + ' sec'; };

// ---------- college branding ----------
const COLLEGE = "Vignan's Institute of Engineering for Women";
// Official logo: the server serves /img/college-logo from whichever file the college supplied in public/img (png/jpg/svg/webp).
// If no file has been added yet, the image is removed and the header shows the college name only.
const logoFallback = img => img.remove();
const brandHtml = (href, sub) => `<a class="brand" href="${href}"><img class="brand-logo" src="img/college-logo" alt="${esc(COLLEGE)} logo" onerror="this.remove()">
  <span class="brand-text"><b>${esc(COLLEGE)}</b><small>${esc(sub || 'Placement Mock Test Portal')}</small></span></a>`;
function siteHeader({ href = 'index.html', sub, nav = '', student } = {}) {
  return `<header class="site-header"><div class="container">${brandHtml(href, sub)}<nav class="site-nav" aria-label="Main">
    ${student ? `<span class="who">${esc(student.studentName)}<small>${esc(student.rollNumber)}</small></span>` : ''}${nav}</nav></div></header>`;
}
const siteFooter = () => `<footer class="site-footer"><div class="container">${esc(COLLEGE)} &middot; Online Placement Mock Test Portal</div></footer>`;
const topbar = (active, student) => siteHeader({ href: student ? 'dashboard.html' : 'index.html', student: student && student.studentName ? student : null,
  nav: student ? '<a href="dashboard.html">Dashboard</a><button onclick="logout()">Sign out</button>' : '' });
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function modal({ title, html, actions }) {
  return new Promise(resolve => {
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h3>${esc(title)}</h3><div>${html}</div><div class="actions"></div></div>`;
    const box = back.querySelector('.actions');
    actions.forEach(a => {
      const b = document.createElement('button'); b.className = 'btn ' + (a.cls || 'secondary'); b.textContent = a.label;
      b.onclick = () => { back.remove(); resolve(a.value); }; box.appendChild(b);
    });
    document.body.appendChild(back);
    const first = box.querySelector('.btn:last-child'); if (first) first.focus();
  });
}
const confirmBox = (title, html, okLabel = 'Confirm', cls = 'btn') =>
  modal({ title, html, actions: [{ label: 'Cancel', value: false }, { label: okLabel, value: true, cls: cls === 'btn' ? '' : cls }] });

function requireStudentId() {
  const id = store.get('pm_student');
  if (!id) { location.replace('index.html'); return null; }
  return id;
}
function logout() { store.del('pm_student'); store.del('pm_attempt'); location.href = 'index.html'; }
