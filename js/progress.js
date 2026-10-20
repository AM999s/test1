// رحلة الطالب: حفظ التقدم محلياً (المعروضات التي زارها، النجوم، نتائج الاختبارات) + مؤثرات الاحتفال
const KEY = 'museum-progress-v1';
let data = load();

function load() {
  try { return { visited: {}, stars: {}, quiz: {}, rooms: {}, last: null, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { visited: {}, stars: {}, quiz: {}, rooms: {}, last: null }; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} dispatchEvent(new CustomEvent('museum-progress')); }

export const progress = {
  get: () => data,
  visit(exId) { if (!data.visited[exId]) { data.visited[exId] = Date.now(); save(); return true; } return false; },
  enterRoom(code) { data.rooms[code] = Date.now(); data.last = code; save(); },
  star(exId, n) { if ((data.stars[exId] || 0) < n) { data.stars[exId] = n; save(); return true; } return false; },
  quiz(code, score, total) { const b = data.quiz[code]; if (!b || score > b.score) { data.quiz[code] = { score, total }; save(); } },
  reset() { data = { visited: {}, stars: {}, quiz: {}, rooms: {}, last: null }; save(); },
  /** تقدم درس: نسبة المعروضات المزارة + النجوم + أفضل اختبار */
  lesson(L) {
    const ids = L.exhibits.map((e) => e.id); const seen = ids.filter((id) => data.visited[id]).length;
    const stars = ids.reduce((a, id) => a + (data.stars[id] || 0), 0);
    const maxStars = L.exhibits.filter((e) => e.kind === 'problem' || e.kind === 'explorer').length * 3;
    const q = data.quiz[L.code];
    const pct = Math.round(100 * (0.6 * seen / Math.max(1, ids.length) + 0.25 * stars / Math.max(1, maxStars) + 0.15 * (q ? q.score / q.total : 0)));
    return { seen, total: ids.length, stars, maxStars, quiz: q, pct };
  },
  totals(lessons) {
    const all = lessons.map((L) => progress.lesson(L));
    return { pct: Math.round(all.reduce((a, x) => a + x.pct, 0) / Math.max(1, all.length)), stars: all.reduce((a, x) => a + x.stars, 0),
      maxStars: all.reduce((a, x) => a + x.maxStars, 0), seen: all.reduce((a, x) => a + x.seen, 0), total: all.reduce((a, x) => a + x.total, 0),
      quizzes: Object.keys(data.quiz).length, rooms: Object.keys(data.rooms).length };
  },
};

/** حلقة تقدم صغيرة (SVG) */
export function ring(pct, color = '#f2b45a', size = 44) {
  const r = 18, C = 2 * Math.PI * r;
  return `<svg class="pring" viewBox="0 0 44 44" width="${size}" height="${size}" aria-label="التقدم ${pct}٪"><circle cx="22" cy="22" r="${r}" fill="rgba(5,7,15,.72)" stroke="rgba(255,255,255,.14)" stroke-width="4"/>
    <circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}" transform="rotate(-90 22 22)"/>
    <text x="22" y="26" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="Plex Arabic, sans-serif">${pct}٪</text></svg>`;
}

/* ─── مؤثرات ─── */
export function toast(html, { icon = '✦', ms = 3200 } = {}) {
  let box = document.querySelector('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<i>${icon}</i><div>${html}</div>`; box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, ms);
}

export function confetti(n = 120) {
  const cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.appendChild(cv);
  const W = cv.width = innerWidth, H = cv.height = innerHeight; const g = cv.getContext('2d');
  const cols = ['#f2b45a', '#5fb6e8', '#e8735f', '#7fd18b', '#b48cf0', '#f08ab4', '#ffffff'];
  const ps = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 10, s: 5 + Math.random() * 7, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] }));
  let t0 = performance.now();
  const step = (now) => {
    const k = (now - t0) / 1000; g.clearRect(0, 0, W, H);
    for (const p of ps) { p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.globalAlpha = Math.max(0, 1 - k / 2.6); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
    if (k < 2.6) requestAnimationFrame(step); else cv.remove();
  };
  requestAnimationFrame(step);
}

let actx = null;
export function chime(ok = true) {
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)();
    const notes = ok ? [660, 880, 1320] : [300, 220];
    notes.forEach((f, i) => { const o = actx.createOscillator(), gn = actx.createGain(); const t = actx.currentTime + i * 0.11; o.type = ok ? 'triangle' : 'sine'; o.frequency.value = f;
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.12, t + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + 0.3); });
  } catch {}
}
