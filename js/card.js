// بطاقة الدرس: لوحة فيزياء بيضاء أنيقة
import { tex, sym } from './fmt.js';
import { TEACHER } from './config.js';
import { progress, ring, confetti, chime } from './progress.js';
import { formulasHTML, wireFormulas, keyedFormulas, ideasHTML, mythsHTML, quizHTML, wireQuiz, labHTML } from './teach.js';

export function renderCard(layer, L, { onEnter, onClose, onNav, hasPrev, hasNext }) {
  const problems = L.exhibits.filter((e) => e.kind === 'problem').length;
  const pg = progress.lesson(L);
  layer.innerHTML = `
  <article class="board" style="--c:${L.chapter.color}" role="dialog" aria-modal="true" aria-labelledby="boardTitle" data-lesson="${L.code}">
    <div class="board-top">
      <span class="board-chapter"><i></i>الفصل ${L.chapter.id} · ${L.chapter.title}<em class="board-teacher">${TEACHER}</em></span>
      <div class="board-actions">
        <button class="icon-btn" data-nav="prev" aria-label="الدرس السابق" ${hasPrev ? '' : 'disabled'}>→</button>
        <button class="icon-btn" data-nav="next" aria-label="الدرس التالي" ${hasNext ? '' : 'disabled'}>←</button>
        <button class="icon-btn" data-close aria-label="إغلاق">✕</button>
      </div>
    </div>
    <div class="board-title"><span class="code">${L.code}</span><h2 id="boardTitle">${L.title}</h2><span class="board-ring" title="تقدّمك في هذا الدرس">${ring(pg.pct, L.chapter.color, 54)}</span></div>
    <div class="board-prog"><span>👣 زرت <b>${pg.seen}</b> من ${pg.total} معروضات</span><span>⭐ <b>${pg.stars}</b> من ${pg.maxStars} نجمة</span><span>🏅 الاختبار: <b>${pg.quiz ? `${pg.quiz.score}/${pg.quiz.total}` : '—'}</b></span></div>

    <div class="eq-stage">
      <div class="eq-main" dir="ltr">${tex(L.main.latex, true)}</div>
      <span class="eq-label">${L.main.label}</span>
    </div>

    <nav class="board-tabs" role="tablist" aria-label="أقسام الدرس">
      <button role="tab" data-tab="fx" aria-selected="true">القوانين بسهولة</button>
      <button role="tab" data-tab="vars" aria-selected="false">المتغيرات</button>
      <button role="tab" data-tab="ideas" aria-selected="false">أهم الأفكار</button>
      <button role="tab" data-tab="myths" aria-selected="false">أخطاء شائعة</button>
      <button role="tab" data-tab="lab" aria-selected="false">تجربة صفية</button>
      <button role="tab" data-tab="quiz" aria-selected="false">اختبر فهمك</button>
    </nav>
    <section class="tab-pane" data-pane="fx">
      <div class="pane-bar"><span>اضغط على أي رمز في مثلث القانون لتغطيه وترى القانون المطلوب.</span><button class="mini-btn" data-hideall>اختبر حفظك</button></div>
      ${formulasHTML(L, { compact: true })}
    </section>
    <section class="tab-pane" data-pane="vars" hidden>
      <div class="board-grid">
        <section class="panel">
          <h3>المتغيرات ووحدات القياس</h3>
          <table class="vars">
            <thead><tr><th>الرمز</th><th>المعنى</th><th>الوحدة</th></tr></thead>
            <tbody>${L.vars.map((v) => `<tr><td class="sym">${sym(v.symbol)}</td><td>${meaning(v.meaning)}</td><td class="unit">${v.unit}</td></tr>`).join('')}</tbody>
          </table>
        </section>
        <section class="panel">
          <h3>معادلات مرتبطة من الدرس</h3>
          <div class="rel">${L.related.map((e) => `<div class="rel-item"><span>${e.label}</span><span class="k m">${tex(e.latex)}</span></div>`).join('')}</div>
        </section>
      </div>
    </section>
    <section class="tab-pane" data-pane="ideas" hidden><div class="panel">${ideasHTML(L)}</div></section>
    <section class="tab-pane" data-pane="myths" hidden>${mythsHTML(L)}</section>
    <section class="tab-pane" data-pane="lab" hidden>${labHTML(L)}</section>
    <section class="tab-pane" data-pane="quiz" hidden>${quizHTML(L)}</section>

    <p class="context">${L.context}<small>السياق التاريخي مستند إلى ويكيبيديا</small></p>

    <footer class="board-foot">
      <div class="stats"><span><b>${L.exhibits.length}</b>معروضات</span><span><b>${problems}</b>مسائل محلولة</span><span><b>1</b>محاكاة ثلاثية الأبعاد</span></div>
      <div class="foot-btns"><a class="ghost-btn" href="#/formulas/${L.chapter.id}">لوحة قوانين الفصل</a><button class="enter-btn" data-enter>ادخل غرفة المحاكاة <span class="arrow">←</span></button></div>
    </footer>
  </article>`;
  layer.hidden = false; layer.classList.remove('closing');
  const board = layer.querySelector('.board');
  board.querySelector('[data-close]').onclick = onClose;
  board.querySelector('[data-enter]').onclick = onEnter;
  board.querySelectorAll('[data-nav]').forEach((b) => (b.onclick = () => onNav(b.dataset.nav)));
  layer.onclick = (e) => { if (e.target === layer) onClose(); };
  // التبويبات
  const tabs = board.querySelectorAll('[data-tab]');
  tabs.forEach((t) => (t.onclick = () => {
    tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    board.querySelectorAll('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== t.dataset.tab));
  }));
  wireFormulas(board, keyedFormulas([L])); wireQuiz(board, (sc, tot) => { progress.quiz(L.code, sc, tot); if (sc === tot) { confetti(); chime(true); } });
  const hideAll = board.querySelector('[data-hideall]');
  hideAll.onclick = () => { const on = board.classList.toggle('fx-hide'); hideAll.textContent = on ? 'أظهر القوانين' : 'اختبر حفظك'; board.querySelectorAll('.fx').forEach((f) => f.classList.remove('shown')); };
  board.querySelector('[data-enter]').focus({ preventScroll: true });
}

export function closeCard(layer) {
  return new Promise((res) => {
    if (layer.hidden) return res();
    layer.classList.add('closing');
    setTimeout(() => { layer.hidden = true; layer.innerHTML = ''; layer.classList.remove('closing'); res(); }, 280);
  });
}

// القيم العددية بعد «=» تُعرض من اليسار إلى اليمين
function meaning(t) {
  const i = t.indexOf(' = ');
  return i < 0 ? t : `${t.slice(0, i)} = <span dir="ltr" class="num-ltr">${t.slice(i + 3)}</span>`;
}
