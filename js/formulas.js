// «لوحة القوانين»: كل قوانين المنهج مبسّطة ومرتّبة حسب الفصل، مع مثلث القانون ووضع «اختبر حفظك» ووضع العرض
import { formulaCard, wireFormulas, keyedFormulas } from './teach.js';
import { TEACHER } from './config.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderFormulas(el, db, chapterId, { onBack, onLesson, onRoom }) {
  const lessons = db.order.map((c) => db.lesson(c));
  let scale = 1; try { scale = +localStorage.getItem('fx-scale') || 1; } catch {}
  const chs = db.chapters.filter((c) => !chapterId || c.id === chapterId);
  const count = lessons.filter((L) => !chapterId || L.chapter.id === chapterId).reduce((a, L) => a + L.formulas.length, 0);
  el.innerHTML = `
  <div class="fxp-scroll" style="--fx-scale:${scale}">
    <header class="fxp-top">
      <button class="fxp-back" data-back aria-label="العودة">→ <span>الرئيسية</span></button>
      <div class="fxp-title"><h1>لوحة القوانين</h1><p>${count} قانوناً مبسّطاً · ${TEACHER}</p></div>
      <div class="fxp-tools">
        <button data-hide aria-pressed="false" title="إخفاء القوانين لاختبار الحفظ">اختبر حفظك</button>
        <button data-zoom="-1" aria-label="تصغير الخط">A−</button><button data-zoom="1" aria-label="تكبير الخط">A+</button>
        <button data-print title="طباعة اللوحة">طباعة</button>
      </div>
    </header>
    <nav class="fxp-chips" aria-label="الفصول">
      <a href="#/formulas" class="${!chapterId ? 'on' : ''}">كل الفصول</a>
      ${db.chapters.map((c) => `<a href="#/formulas/${c.id}" style="--c:${c.color}" class="${c.id === chapterId ? 'on' : ''}"><b>${c.id}</b>${esc(c.title)}</a>`).join('')}
    </nav>
    <p class="fxp-help"><b>كيف تستخدم اللوحة؟</b> في كل بطاقة: القانون كما في الكتاب، ثم صياغته بالعربي، ثم حيلة لحفظه. في <b>مثلث القانون</b> اضغط الرمز المطلوب لتغطيه فيظهر القانون مرتباً لإيجاده. زر «اختبر حفظك» يخفي القوانين: يذكر الطالب القانون ثم تضغط البطاقة لإظهاره.</p>
    <main class="fxp-main">
      ${chs.map((c) => `
      <section class="fxp-ch" style="--c:${c.color}">
        <h2><span>${c.id}</span>الفصل ${c.id}: ${esc(c.title)}</h2>
        ${lessons.filter((L) => L.chapter.id === c.id).map((L) => `
        <section class="fxp-lesson">
          <header><b>${L.code}</b><h3>${esc(L.title)}</h3><button class="mini-btn" data-card="${L.code}">بطاقة الدرس</button><button class="mini-btn solid" data-room="${L.code}">القاعة ←</button></header>
          <div class="fx-grid">${L.formulas.map((f, i) => formulaCard(f, i, { code: L.code })).join('')}</div>
        </section>`).join('')}
      </section>`).join('')}
    </main>
    <footer class="fxp-foot">القوانين مطابقة لكتاب فيزياء 2 (نظام المسارات) بصياغة مبسّطة · ${TEACHER}</footer>
  </div>`;
  el.hidden = false;
  const sc = el.querySelector('.fxp-scroll');
  wireFormulas(el, keyedFormulas(lessons));
  el.querySelector('[data-back]').onclick = onBack;
  el.querySelectorAll('[data-card]').forEach((b) => (b.onclick = () => onLesson(b.dataset.card)));
  el.querySelectorAll('[data-room]').forEach((b) => (b.onclick = () => onRoom(b.dataset.room)));
  const hide = el.querySelector('[data-hide]');
  hide.onclick = () => { const on = sc.classList.toggle('fx-hide'); hide.setAttribute('aria-pressed', String(on)); hide.textContent = on ? 'أظهر القوانين' : 'اختبر حفظك'; el.querySelectorAll('.fx').forEach((f) => f.classList.remove('shown')); };
  el.querySelectorAll('[data-zoom]').forEach((b) => (b.onclick = () => {
    scale = Math.max(0.8, Math.min(1.8, scale + 0.15 * +b.dataset.zoom)); sc.style.setProperty('--fx-scale', scale);
    try { localStorage.setItem('fx-scale', scale); } catch {}
  }));
  el.querySelector('[data-print]').onclick = () => window.print();
}
