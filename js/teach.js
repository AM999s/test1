// أدوات المعلم المشتركة: بطاقات القوانين المبسّطة، مثلث القانون التفاعلي، الأفكار والأخطاء الشائعة، والاختبار القصير
import { tex } from './fmt.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** يعزل المقاطع اللاتينية/الرياضية داخل النص العربي حتى تُعرض بالترتيب الصحيح */
const LT = 'A-Za-z0-9_√²³⁰¹⁴⁵⁶⁷⁸⁹⁻₀₁₂ΔθωατπΣ';
const RUN = new RegExp(`[${LT}](?:[${LT}×·.,=+−\\-÷/∝() ]*[${LT})])?`, 'g');
export const bidi = (s) => esc(s).replace(RUN, (m) => (/[=×÷/+−·]/.test(m) && m.length > 2 && (m.split('(').length === m.split(')').length) ? `<bdi dir="ltr">${m}</bdi>` : m));

/* ─── مثلث القانون ─── */
function triangle(tri, id) {
  const [top, left, right] = tri;
  return `<div class="tri" data-tri="${id}">
    <svg viewBox="0 0 200 172" aria-hidden="true"><path d="M100 6 L194 166 L6 166 Z" /><path d="M41 106 H159 M100 106 V166" /></svg>
    <button class="tv t-top" data-k="0" title="${esc(top[1])}">${tex(top[0])}</button>
    <button class="tv t-left" data-k="1" title="${esc(left[1])}">${tex(left[0])}</button>
    <button class="tv t-right" data-k="2" title="${esc(right[1])}">${tex(right[0])}</button>
    <span class="t-x">×</span>
  </div>
  <div class="tri-out" data-out="${id}"><span>غطِّ الرمز المطلوب بإصبعك ↑</span></div>`;
}

function triFormula(tri, k) {
  const [t, l, r] = tri.map((x) => x[0]);
  if (k === 0) return [`${t} = ${l}\\times ${r}`, tri[0][1]];
  if (k === 1) return [`${l} = \\dfrac{${t}}{${r}}`, tri[1][1]];
  return [`${r} = \\dfrac{${t}}{${l}}`, tri[2][1]];
}

/** بطاقة قانون واحدة */
export function formulaCard(f, i, { code = '', compact = false } = {}) {
  const id = `${code}-${i}`;
  return `<article class="fx ${compact ? 'compact' : ''}" data-fx="${id}">
    <header class="fx-head"><span class="fx-n">${i + 1}</span><h4>${esc(f.name)}</h4>${f.units ? `<span class="fx-unit" dir="ltr">${esc(f.units)}</span>` : ''}</header>
    <button class="fx-eq" data-reveal aria-label="إظهار القانون" dir="ltr">${tex(f.latex, true)}<span class="fx-cover">اضغط لإظهار القانون</span></button>
    <p class="fx-simple"><b>بالعربي:</b> ${bidi(f.simple)}</p>
    <p class="fx-tip"><b>حيلة الحفظ</b>${bidi(f.tip)}</p>
    ${f.tri ? `<div class="fx-tri">${triangle(f.tri, id)}</div>` : ''}
  </article>`;
}

export function formulasHTML(L, opts = {}) {
  return `<div class="fx-grid">${(L.formulas || []).map((f, i) => formulaCard(f, i, { code: L.code, ...opts })).join('')}</div>`;
}

/** يربط التفاعل: مثلثات القوانين وإخفاء/إظهار القانون (وضع «اختبر حفظك») */
export function wireFormulas(root, formulasByKey) {
  root.querySelectorAll('.tri').forEach((t) => {
    const id = t.dataset.tri; const f = formulasByKey[id]; if (!f?.tri) return;
    const out = root.querySelector(`[data-out="${id}"]`);
    t.querySelectorAll('.tv').forEach((b) => (b.onclick = (e) => {
      e.stopPropagation(); const k = +b.dataset.k; const on = b.classList.contains('cover');
      t.querySelectorAll('.tv').forEach((x) => x.classList.remove('cover'));
      if (on) { out.innerHTML = '<span>غطِّ الرمز المطلوب بإصبعك ↑</span>'; return; }
      b.classList.add('cover'); const [ltx, name] = triFormula(f.tri, k);
      out.innerHTML = `<small>لإيجاد ${esc(name)}:</small><div dir="ltr">${tex(ltx, true)}</div>`;
    }));
  });
  root.querySelectorAll('[data-reveal]').forEach((b) => (b.onclick = () => b.closest('.fx').classList.toggle('shown')));
}

export function keyedFormulas(lessons) {
  const m = {}; for (const L of lessons) (L.formulas || []).forEach((f, i) => (m[`${L.code}-${i}`] = f)); return m;
}

/* ─── الأفكار، الأخطاء الشائعة، هل تعلم ─── */
export function ideasHTML(L) {
  return `<ol class="ideas">${(L.ideas || []).map((t) => `<li>${bidi(t)}</li>`).join('')}</ol>`;
}
export function mythsHTML(L) {
  return `<div class="myths">${(L.myths || []).map(([a, b]) => `<div class="myth"><p class="m-wrong"><i>✗</i><span><b>خطأ شائع:</b> ${bidi(a)}</span></p><p class="m-right"><i>✓</i><span><b>الصحيح:</b> ${bidi(b)}</span></p></div>`).join('')}</div>
    ${(L.facts || []).length ? `<div class="facts">${L.facts.map((t) => `<p class="fact"><i>✦</i><span><b>هل تعلم؟</b> ${bidi(t)}</span></p>`).join('')}</div>` : ''}`;
}

/* ─── تجربة صفية ─── */
export function labHTML(L) {
  const b = L.lab; if (!b) return '';
  return `<div class="lab"><h4><i>⚗</i>${esc(b.title)}</h4>
    <div class="lab-mats"><b>الأدوات:</b>${b.materials.map((m) => `<span>${bidi(m)}</span>`).join('')}</div>
    <ol class="lab-steps">${b.steps.map((t) => `<li>${bidi(t)}</li>`).join('')}</ol>
    <p class="lab-ask"><b>ناقش:</b> ${bidi(b.ask)}</p></div>`;
}

/* ─── الاختبار القصير ─── */
export function quizHTML(L) {
  const qs = L.quiz || [];
  return `<div class="quiz" data-quiz>
    <div class="qz-score"><span>النتيجة</span><b data-score>0 / ${qs.length}</b><button class="qz-reset" data-qreset>إعادة</button></div>
    ${qs.map((q, i) => `<section class="qz" data-q="${i}" data-a="${q.answer}">
      <p class="qz-q"><span>${i + 1}</span>${bidi(q.q)}</p>
      <div class="qz-opts">${q.options.map((o, j) => `<button data-o="${j}"><i>${'أبجد'[j]}</i><span>${bidi(o)}</span></button>`).join('')}</div>
      <p class="qz-why" hidden>${bidi(q.why)}</p>
    </section>`).join('')}
  </div>`;
}

export function wireQuiz(root, onScore) {
  root.querySelectorAll('[data-quiz]').forEach((qz) => {
    const total = qz.querySelectorAll('.qz').length; let score = 0;
    const upd = () => (qz.querySelector('[data-score]').textContent = `${score} / ${total}`);
    qz.querySelectorAll('.qz').forEach((s) => {
      const a = +s.dataset.a;
      s.querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => {
        if (s.classList.contains('done')) return;
        s.classList.add('done'); const ok = +b.dataset.o === a; if (ok) score++;
        b.classList.add(ok ? 'right' : 'wrong'); s.querySelector(`[data-o="${a}"]`).classList.add('right');
        const why = s.querySelector('.qz-why'); why.hidden = false; why.classList.toggle('ok', ok);
        why.innerHTML = `<b>${ok ? 'إجابة صحيحة!' : 'ليست صحيحة.'}</b> ${why.innerHTML.replace(/^<b>.*?<\/b> /, '')}`;
        upd();
        if (qz.querySelectorAll('.qz.done').length === total) onScore?.(score, total, qz);
      }));
    });
    qz.querySelector('[data-qreset]').onclick = () => {
      score = 0; upd();
      qz.querySelectorAll('.qz').forEach((s) => { s.classList.remove('done'); s.querySelectorAll('[data-o]').forEach((b) => b.classList.remove('right', 'wrong')); const w = s.querySelector('.qz-why'); w.hidden = true; w.innerHTML = w.innerHTML.replace(/^<b>.*?<\/b> /, ''); });
    };
  });
}
