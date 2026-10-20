// البحث الشامل (Ctrl+K): الدروس، المعروضات، القوانين، أسئلة الاختبار — بنتائج فورية
const norm = (s) => String(s || '').toLowerCase().replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/\$[^$]*\$/g, ' ').replace(/[\\{}[\]^_]/g, ' ');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KIND = { problem: ['🧮', 'مسألة'], explorer: ['🔭', 'مستكشف'], history: ['📜', 'لوحة تاريخية'] };

let index = null, el = null, sel = 0, results = [], goFn = null;

function build(db) {
  const out = [];
  for (const code of db.order) {
    const L = db.lesson(code); const ch = L.chapter;
    out.push({ icon: '📘', kind: 'درس', title: `${L.code} · ${L.title}`, sub: `الفصل ${ch.id}: ${ch.title}`, href: `#/lesson/${code}`, color: ch.color, text: norm(L.title + ' ' + L.context + ' ' + L.main.label) });
    out.push({ icon: '🏛', kind: 'قاعة', title: `قاعة ${L.code}`, sub: L.sim.title, href: `#/room/${code}`, color: ch.color, text: norm('قاعه غرفه ' + L.sim.title + ' ' + L.sim.desc + ' ' + L.title) });
    for (const ex of L.exhibits) {
      const [ic, k] = KIND[ex.kind] || ['◆', 'معروض'];
      out.push({ icon: ic, kind: k, title: ex.title, sub: `${L.code} · ${ex.tag || ''}`, href: `#/room/${code}/${ex.id}`, color: ch.color, text: norm(ex.title + ' ' + ex.tag + ' ' + (ex.statement || ex.body || '') + ' ' + (ex.insight || '')) });
    }
    for (const f of L.formulas) out.push({ icon: 'ƒ', kind: 'قانون', title: f.name, sub: f.simple, href: `#/formulas/${ch.id}`, color: ch.color, text: norm(f.name + ' ' + f.simple + ' ' + f.tip) });
    for (const q of L.quiz) out.push({ icon: '?', kind: 'سؤال', title: q.q, sub: `اختبر فهمك · ${L.code}`, href: `#/quiz/${ch.id}`, color: ch.color, text: norm(q.q + ' ' + q.options.join(' ') + ' ' + q.why) });
  }
  return out;
}

function search(q) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return index.filter((x) => x.kind === 'درس').slice(0, 13);
  const scored = [];
  for (const it of index) {
    const t = norm(it.title); let sc = 0;
    for (const w of words) { if (t.includes(w)) sc += t.startsWith(w) ? 6 : 4; else if (it.text.includes(w)) sc += 1; else { sc = -1; break; } }
    if (sc > 0) scored.push([sc + (it.kind === 'درس' ? 1.5 : it.kind === 'قانون' ? 1 : 0), it]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, 30).map((x) => x[1]);
}

function render() {
  const list = el.querySelector('.sr-list');
  if (!results.length) { list.innerHTML = '<p class="sr-empty">لا نتائج. جرّب كلمة أخرى مثل «العزم» أو «الزخم» أو «كبلر».</p>'; return; }
  list.innerHTML = results.map((r, i) => `<a href="${r.href}" class="sr-item ${i === sel ? 'on' : ''}" data-i="${i}" style="--c:${r.color}"><i>${r.icon}</i><div><b>${esc(r.title)}</b><small>${esc(r.sub || '')}</small></div><span>${r.kind}</span></a>`).join('');
  list.querySelectorAll('.sr-item').forEach((a) => (a.onclick = (e) => { e.preventDefault(); pick(+a.dataset.i); }));
  list.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
}

function pick(i) { const r = results[i]; if (!r) return; close(); goFn(r.href); }

export function openSearch(db, go) {
  goFn = go; index ??= build(db);
  if (!el) {
    el = document.createElement('div'); el.className = 'search-layer'; el.hidden = true;
    el.innerHTML = `<div class="search-box" role="dialog" aria-label="البحث">
      <div class="sr-in"><span>🔍</span><input type="search" placeholder="ابحث عن درس أو قانون أو مسألة أو سؤال…" aria-label="بحث"><kbd>Esc</kbd></div>
      <div class="sr-list"></div>
      <p class="sr-foot"><span>↑↓ للتنقل · Enter للفتح</span><span>Ctrl + K للبحث من أي مكان</span></p></div>`;
    document.body.appendChild(el);
    const inp = el.querySelector('input');
    inp.oninput = () => { sel = 0; results = search(inp.value); render(); };
    inp.onkeydown = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
      else if (e.key === 'Escape') close();
      e.stopPropagation();
    };
    el.onclick = (e) => { if (e.target === el) close(); };
  }
  el.hidden = false; const inp = el.querySelector('input'); inp.value = ''; sel = 0; results = search(''); render();
  requestAnimationFrame(() => { el.classList.add('open'); inp.focus(); });
}

export function close() { if (!el) return; el.classList.remove('open'); el.hidden = true; }
export const isOpen = () => el && !el.hidden;
