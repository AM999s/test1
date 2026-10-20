// صفحة «اختبر فهمك»: كل أسئلة المنهج مرتبة حسب الفصل والدرس، مع اختبار عشوائي سريع للصف
import { quizHTML, wireQuiz } from './teach.js';
import { TEACHER } from './config.js';
import { progress, confetti, chime } from './progress.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderQuiz(el, db, chapterId, { onBack, onLesson, onRoom }) {
  const lessons = db.order.map((c) => db.lesson(c)).filter((L) => !chapterId || L.chapter.id === chapterId);
  let scale = 1; try { scale = +localStorage.getItem('fx-scale') || 1; } catch {}
  const count = lessons.reduce((a, L) => a + L.quiz.length, 0);
  const color = chapterId ? db.chapters.find((c) => c.id === chapterId).color : '#f2b45a';
  el.innerHTML = `
  <div class="fxp-scroll qzp" style="--fx-scale:${scale}">
    <header class="fxp-top">
      <button class="fxp-back" data-back aria-label="العودة">→ <span>الرئيسية</span></button>
      <div class="fxp-title"><h1>اختبر فهمك</h1><p>${count} سؤالاً مع تفسير كل إجابة · ${TEACHER}</p></div>
      <div class="fxp-tools">
        <button data-rand title="10 أسئلة عشوائية من الفصل المختار">🎲 اختبار عشوائي</button>
        <button data-all hidden>كل الأسئلة</button>
        <button data-zoom="-1" aria-label="تصغير الخط">A−</button><button data-zoom="1" aria-label="تكبير الخط">A+</button>
      </div>
    </header>
    <nav class="fxp-chips" aria-label="الفصول">
      <a href="#/quiz" class="${!chapterId ? 'on' : ''}">كل الفصول</a>
      ${db.chapters.map((c) => `<a href="#/quiz/${c.id}" style="--c:${c.color}" class="${c.id === chapterId ? 'on' : ''}"><b>${c.id}</b>${esc(c.title)}</a>`).join('')}
    </nav>
    <p class="fxp-help"><b>للمعلم:</b> اعرض السؤال على الصف، واطلب من الطلاب التفكير، ثم اضغط الإجابة التي يختارونها لتظهر صحتها مع التفسير. زر «🎲 اختبار عشوائي» يكوّن مسابقة سريعة من 10 أسئلة.</p>
    <main class="fxp-main" data-main></main>
    <footer class="fxp-foot">الأسئلة مبنية على كتاب فيزياء 2 (نظام المسارات) · ${TEACHER}</footer>
  </div>`;
  el.hidden = false;
  const sc = el.querySelector('.fxp-scroll'); const main = el.querySelector('[data-main]');
  const showAll = () => {
    main.innerHTML = db.chapters.filter((c) => !chapterId || c.id === chapterId).map((c) => `
      <section class="fxp-ch" style="--c:${c.color}">
        <h2><span>${c.id}</span>الفصل ${c.id}: ${esc(c.title)}</h2>
        ${lessons.filter((L) => L.chapter.id === c.id).map((L) => `
        <section class="fxp-lesson" style="--c:${c.color}">
          <header><b>${L.code}</b><h3>${esc(L.title)}</h3><button class="mini-btn" data-card="${L.code}">بطاقة الدرس</button><button class="mini-btn solid" data-room="${L.code}">القاعة ←</button></header>
          ${quizHTML(L)}
        </section>`).join('')}
      </section>`).join('');
    wire(); el.querySelector('[data-all]').hidden = true;
  };
  const showRandom = () => {
    const pool = lessons.flatMap((L) => L.quiz.map((q) => ({ ...q, code: L.code })));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const pick = pool.slice(0, 10);
    main.innerHTML = `<section class="fxp-ch" style="--c:${color}"><h2><span>🎲</span>اختبار عشوائي: ${pick.length} أسئلة</h2>
      <section class="fxp-lesson" style="--c:${color}">${quizHTML({ quiz: pick })}</section></section>`;
    wire(); el.querySelector('[data-all]').hidden = false; sc.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const wire = () => {
    wireQuiz(main, (sc, tot, qz) => {
      const code = qz.closest('.fxp-lesson')?.querySelector('header b')?.textContent;
      if (code && /^\d-\d$/.test(code)) progress.quiz(code, sc, tot);
      if (sc === tot) { confetti(); chime(true); }
    });
    main.querySelectorAll('[data-card]').forEach((b) => (b.onclick = () => onLesson(b.dataset.card)));
    main.querySelectorAll('[data-room]').forEach((b) => (b.onclick = () => onRoom(b.dataset.room)));
  };
  showAll();
  el.querySelector('[data-back]').onclick = onBack;
  el.querySelector('[data-rand]').onclick = showRandom;
  el.querySelector('[data-all]').onclick = showAll;
  el.querySelectorAll('[data-zoom]').forEach((b) => (b.onclick = () => {
    scale = Math.max(0.8, Math.min(1.8, scale + 0.15 * +b.dataset.zoom)); sc.style.setProperty('--fx-scale', scale);
    try { localStorage.setItem('fx-scale', scale); } catch {}
  }));
}
