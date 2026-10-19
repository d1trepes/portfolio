// @ts-nocheck
// Блок 4 «Связь» + тёмный футер.
// Дуга-переход, «подложка» с лёгким параллаксом, мини-анимации по скроллу,
// форма-фраза (поля по очереди сами заполняются примерами, поле контакта само узнаёт Telegram/телефон/почту),
// кнопка в уголках, согласие, отправка и поп-ап «Спасибо».
// Кадр вызывается из общего цикла (hero.ts) — отдельного requestAnimationFrame нет; вне экрана ничего не считает.
import { LEAD_ENDPOINT } from '../data/ring';

export function initContact(F) {
  const $ = (s, r = document) => r.querySelector(s);
  const sec = $('#contact');
  if (!sec) return { frame() {}, measure() {}, top: () => 0 };
  const arc = $('#ctArc'), inner = $('#ctIn'), form = $('#ctForm');
  const msg = $('#ctMsg'), typeEl = $('#ctType'), toast = $('#toast'), root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
  const out3 = (t) => 1 - Math.pow(1 - t, 3);
  const say = (t) => { toast.textContent = t; toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('on'), 2400); };

  // ---------- мини-анимации: у каждого элемента своё окно по положению на экране ----------
  const A = [];
  const add = (el, prop, delay = 0, len = 0.22) => el && A.push({ el, prop, delay, len, y: 0, v: '' });
  sec.querySelectorAll('.ct-eyebrow, .ct-in h2 .ct-ln > span, .ct-phrase, .ct-kind, .ct-row .ct-up, .ct-quick .ct-up').forEach((el) => add(el, '--p'));
  sec.querySelectorAll('.ct-f').forEach((el, i) => add(el, '--ln', 0.06 + i * 0.05, 0.3));
  // футер
  const foot = $('#ft');
  if (foot) foot.querySelectorAll('.ft-up').forEach((el) => add(el, '--p'));
  // строки одного ряда — лесенкой
  const stagger = new Map();
  A.forEach((o) => { if (o.prop !== '--p') return; const key = o.el.closest('.ct-kinds, .ct-row, .ct-quick, .ft-cols, h2') || o.el; const n = stagger.get(key) || 0; stagger.set(key, n + 1); o.delay += n * 0.035; });

  const G = { top: 0, h: 1, vh: 1, ftTop: 0, ftH: 1 };
  function measure() {
    G.vh = innerHeight;
    const r = sec.getBoundingClientRect(); G.top = r.top + scrollY; G.h = r.height;
    if (foot) { const fr = foot.getBoundingClientRect(); G.ftTop = fr.top + scrollY; G.ftH = fr.height; }
    // позиции элементов без учёта текущих сдвигов
    const keep = inner.style.transform; inner.style.transform = 'none';
    A.forEach((o) => { o.y = o.el.getBoundingClientRect().top + scrollY; });
    inner.style.transform = keep;
    fitBig();
    lastArc = lastPar = '';
  }

  // ---------- форма: поля подстраивают ширину под текст ----------
  const fields = [...form.querySelectorAll('.ct-f')];
  const byKey = Object.fromEntries(fields.map((f) => [f.dataset.key, f]));
  const inputs = Object.fromEntries(fields.map((f) => [f.dataset.key, $('input', f)]));
  const HINT = { name: 'ваше имя', task: 'кофейни с доставкой', contact: '@ник, телефон или почта' };
  const agree = $('#ctAgree'), agreeL = agree.closest('.ct-agree'), box = $('#ctSendBox');
  const kindsEls = [...form.querySelectorAll('.ct-kind')];

  // ---------- поля сами «заполняются» примерами — по очереди: имя → вид сайта → задача → контакт ----------
  // Как будто кто-то заполняет форму у вас на глазах. Как только человек трогает форму — показ останавливается,
  // а в пустых полях остаются спокойные подсказки.
  const SETS = [
    { name: 'Алексей', kind: 1, task: 'завода с картой дилеров', contact: '@alexey_m' },
    { name: 'Марина', kind: 0, task: 'кофейни с доставкой', contact: '+375 29 123-45-67' },
    { name: 'Дмитрий', kind: 2, task: 'оптовой компании', contact: 'd.ivanov@mail.ru' },
    { name: 'Ольга', kind: 0, task: 'стоматологии в Минске', contact: '@olga_dent' },
  ];
  const ORDER = ['name', 'kind', 'task', 'contact'];
  // Показ идёт всегда, по кругу. Поле участвует, только пока оно пустое и человек не стоит в нём курсором;
  // пока человек заполняет форму, ширина пустых полей не меняется, чтобы текст фразы не прыгал.
  const D = { set: 0, step: 0, n: 0, t: 0, phase: 'wait' };
  const live = (k) => !inputs[k].value && document.activeElement !== inputs[k];
  const busyForm = () => form.contains(document.activeElement);
  function setPh(k, text) { const inp = inputs[k]; if (inp.placeholder !== text) inp.placeholder = text; }
  function demoKind(i) { kindsEls.forEach((el, j) => el.classList.toggle('demo', j === i)); }
  const kindChosen = () => !!form.querySelector('.ct-kind input:checked');
  function demoTick(now) {
    if (reduce || now < D.t) return;
    const S = SETS[D.set];
    if (D.phase === 'wait') { // начало круга: пустые поля очищаются, ширина — под примеры этого круга
      const freeze = busyForm();
      ['name', 'task', 'contact'].forEach((k) => { if (!live(k)) return; setPh(k, ''); if (!freeze) byKey[k].dataset.v = S[k]; });
      demoKind(-1); D.step = 0; D.n = 0; D.phase = 'type'; D.t = now + 500; return;
    }
    if (D.phase === 'type') {
      const k = ORDER[D.step];
      if (k === 'kind') { if (!kindChosen()) demoKind(S.kind); D.step++; D.t = now + 650; return; }
      if (!live(k)) { byKey[k].classList.remove('demo'); D.n = 0; D.step++; D.t = now; if (D.step >= ORDER.length) { D.phase = 'hold'; D.t = now + 2400; } return; }
      const word = S[k]; byKey[k].classList.add('demo');
      D.n++; setPh(k, word.slice(0, D.n));
      if (D.n >= word.length) {
        byKey[k].classList.remove('demo'); D.n = 0; D.step++;
        if (D.step >= ORDER.length) { D.phase = 'hold'; D.t = now + 2400; } else D.t = now + 380;
      } else D.t = now + 55 + Math.random() * 45;
      return;
    }
    if (D.phase === 'hold') { // всё «заполнено» — быстро стираем и показываем следующий пример
      ['name', 'task', 'contact'].forEach((k) => { if (live(k)) setPh(k, ''); });
      demoKind(-1); D.set = (D.set + 1) % SETS.length; D.phase = 'wait'; D.t = now + 350;
    }
  }
  if (reduce) ['name', 'task', 'contact'].forEach((k) => setPh(k, HINT[k]));
  // встал в пустое поле — в нём спокойная подсказка, что писать
  ['name', 'task', 'contact'].forEach((k) => inputs[k].addEventListener('focus', () => {
    byKey[k].classList.remove('demo');
    if (!inputs[k].value) { setPh(k, HINT[k]); byKey[k].dataset.v = HINT[k]; }
  }));
  form.querySelectorAll('.ct-kind input').forEach((r) => r.addEventListener('change', () => demoKind(-1)));

  fields.forEach((f) => {
    const inp = $('input', f), k = f.dataset.key;
    inp.addEventListener('input', () => { f.dataset.v = inp.value || HINT[k]; f.classList.remove('bad'); if (msg.textContent) check(false); ready(); });
  });

  // поле контакта само понимает, что ввели
  const kindOf = (v) => {
    v = v.trim();
    if (!v) return '';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Почта';
    if (/^(https?:\/\/)?(t\.me|telegram\.me)\/[a-zA-Z0-9_]{4,}$/i.test(v) || /^@[a-zA-Z][a-zA-Z0-9_]{3,31}$/.test(v)) return 'Telegram';
    const digits = v.replace(/\D/g, '');
    if (/^\+?[\d\s()\-]+$/.test(v) && digits.length >= 9 && digits.length <= 15) return 'Телефон';
    if (/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(v)) return 'Telegram';
    return '';
  };
  inputs.contact.addEventListener('input', () => {
    const k = kindOf(inputs.contact.value);
    if (k) typeEl.textContent = k + ' ✓';
    typeEl.classList.toggle('on', !!k);
  });

  // Enter — к следующему полю
  const order = ['name', 'task', 'contact'];
  order.forEach((k, i) => inputs[k].addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (i < order.length - 1) { e.preventDefault(); inputs[order[i + 1]].focus(); }
  }));
  form.querySelectorAll('.ct-kind input').forEach((r) => r.addEventListener('change', () => { if (!inputs.task.value) inputs.task.focus({ preventScroll: true }); }));

  // уголки вокруг кнопки защёлкиваются, когда всё нужное заполнено
  const nameOk = () => inputs.name.value.trim().length >= 2 && /[a-zа-яё]/i.test(inputs.name.value);
  const isReady = () => nameOk() && !!kindOf(inputs.contact.value) && agree.checked;
  function ready() { box.classList.toggle('ready', isReady()); }
  agree.addEventListener('change', () => { agreeL.classList.remove('bad'); if (msg.textContent) check(false); ready(); });

  function check(focus = true) {
    const bad = [];
    if (!nameOk()) bad.push('name');
    if (!kindOf(inputs.contact.value)) bad.push('contact');
    if (!agree.checked) bad.push('agree');
    fields.forEach((f) => f.classList.toggle('bad', bad.includes(f.dataset.key) && focus));
    agreeL.classList.toggle('bad', bad.includes('agree') && focus);
    const f = bad.filter((b) => b !== 'agree');
    msg.textContent = !bad.length ? '' : f.length === 2 ? 'Оставьте имя и контакт — без них я не смогу ответить'
      : f[0] === 'name' ? 'Как к вам обращаться?' : f[0] === 'contact' ? 'Проверьте контакт: @ник в Telegram, телефон или почта'
      : 'Поставьте галочку согласия — без неё заявку отправить нельзя';
    if (focus && bad.length) {
      const k = bad[0], el = k === 'agree' ? agreeL : byKey[k];
      el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad');
      (k === 'agree' ? agree : inputs[k]).focus({ preventScroll: true });
    }
    return !bad.length;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!check()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.company) return; // бот
    data.contactType = kindOf(data.contact);
    data.page = location.pathname; data.ref = new URLSearchParams(location.search).get('utm_source') || '';
    box.classList.add('busy');
    try {
      if (LEAD_ENDPOINT) {
        const r = await fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error(r.status);
      } else await new Promise((r) => setTimeout(r, 900)); // демо-режим, пока нет сервера
      openPop(data.name);
      form.reset(); typeEl.classList.remove('on');
      fields.forEach((f) => { f.dataset.v = HINT[f.dataset.key]; });
      ready();
    } catch (err) {
      msg.textContent = 'Не отправилось — напишите мне в Telegram, кнопка ниже';
    } finally { box.classList.remove('busy'); }
  });

  // ---------- поп-ап «Спасибо» ----------
  const pop = $('#ctPop');
  document.body.appendChild(pop); // поверх шапки и всего сайта
  const popWhen = $('#ctPopWhen'), popName = $('#ctPopName');
  let lastFocus = null;
  function openPop(name) {
    const first = (name || '').trim().split(/\s+/)[0];
    popName.textContent = first ? `${first.slice(0, 18)}!` : 'что написали';
    popWhen.textContent = whenNote();
    lastFocus = document.activeElement;
    pop.hidden = false; void pop.offsetWidth; pop.classList.add('on');
    F.lenis && F.lenis.stop();
    setTimeout(() => $('.ct-pop-x', pop).focus({ preventScroll: true }), 300);
  }
  function closePop() {
    if (pop.hidden) return;
    pop.classList.remove('on');
    F.lenis && F.lenis.start();
    setTimeout(() => { pop.hidden = true; }, 600);
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }
  pop.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closePop));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(); });
  // фокус не уходит из окна, пока оно открыто
  pop.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...pop.querySelectorAll('a,button')]; const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });

  // быстрые пути
  document.querySelectorAll('[data-tg-me]').forEach((a) => a.addEventListener('click', (e) => {
    if (a.getAttribute('href') !== '#') return;
    e.preventDefault(); say('Здесь откроется чат со мной в Telegram');
  }));
  document.querySelectorAll('[data-mail]').forEach((b) => b.addEventListener('click', async (e) => {
    e.preventDefault();
    const m = b.dataset.mail;
    try { await navigator.clipboard.writeText(m); say('Почта скопирована: ' + m); } catch (err) { location.href = 'mailto:' + m; }
  }));

  // местное время в Минске: живая подсказка, когда я отвечу
  const timeEl = $('#ctTime');
  const fmt = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Minsk', hour: '2-digit', minute: '2-digit' });
  const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Minsk', hour: 'numeric', hour12: false });
  function whenNote() {
    const h = +hourFmt.format(new Date()) % 24;
    return h >= 9 && h < 19 ? 'обычно в течение пары часов' : h >= 19 && h < 23 ? 'сегодня вечером или завтра утром' : 'утром, как проснусь';
  }
  function tick() {
    const d = new Date(), h = +hourFmt.format(d) % 24;
    const note = h >= 9 && h < 19 ? 'на связи, отвечу в течение пары часов' : h >= 19 && h < 23 ? 'отвечу сегодня или завтра утром' : 'отвечу утром';
    timeEl.textContent = `Минск, сейчас ${fmt.format(d)} — ${note}`;
    timeEl.classList.toggle('off', !(h >= 9 && h < 23));
    document.querySelectorAll('[data-clock]').forEach((el) => (el.textContent = fmt.format(d)));
  }
  tick(); setInterval(tick, 30000);

  // ---------- футер: огромная строка подгоняется ровно по ширине ----------
  const big = $('#ftBig'), win = $('#ftWin');
  function fitBig() {
    if (!big) return;
    big.style.fontSize = '100px'; big.style.width = 'max-content'; big.style.justifyContent = 'flex-start';
    const cs = getComputedStyle(big.parentElement);
    const w = big.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), sw = big.getBoundingClientRect().width;
    big.style.width = big.style.justifyContent = '';
    big.style.fontSize = Math.max(28, (100 * w) / sw - 0.4) + 'px';
  }
  // «Наверх»
  document.querySelectorAll('[data-top]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    F.lenis ? F.lenis.scrollTo(0, { duration: 2 }) : scrollTo({ top: 0, behavior: 'smooth' });
  }));
  // линза над картинкой футера: под ней — тот же кадр линиями
  const lensBox = $('#ftWinIn'), lines = $('#ftLines');
  const WL = { x: 0, y: 0, tx: 0, ty: 0, r: 0, tr: 0 };
  if (win && fine) {
    win.addEventListener('pointermove', (e) => { const r = win.getBoundingClientRect(); WL.tx = e.clientX - r.left; WL.ty = e.clientY - r.top; if (!WL.tr) { WL.x = WL.tx; WL.y = WL.ty; } WL.tr = Math.min(r.height * 0.42, 110); });
    win.addEventListener('pointerleave', () => { WL.tr = 0; });
  }

  // ---------- кадр ----------
  let lastArc = '', lastPar = '', dark = null;
  function frame(now) {
    const y = scrollY, top = G.top - y;
    const near = top < G.vh * 1.2 && top > -(G.h + (foot ? G.ftH : 0) + G.vh);
    // шапка светлеет над тёмным блоком и футером
    const hd = top < 34;
    if (hd !== dark) { dark = hd; root.classList.toggle('hdr-dark', hd); }
    if (!near) return;

    // дуга: при входе блока на экран — полная, к моменту, когда блок дошёл до верхней трети, — ровная
    const pa = reduce ? 1 : clamp((G.vh - top) / (G.vh * 0.95), 0, 1);
    const sa = (1 - pa).toFixed(3);
    if (sa !== lastArc) { arc.style.transform = `scaleY(${sa})`; lastArc = sa; }
    // содержимое лежит «под» страницей: в начале чуть выше и догоняет к моменту, когда блок встал вверху
    const pp = clamp((G.vh - top) / G.vh, 0, 1);
    const par = reduce ? '0' : (-(1 - pp) * G.vh * 0.22).toFixed(1);
    if (par !== lastPar) { inner.style.transform = `translate3d(0,${par}px,0)`; lastPar = par; }

    // мини-анимации: элемент начинает, когда его верх на 92% высоты экрана; при прокрутке назад — отыгрывают обратно
    const shift = +par;
    for (const o of A) {
      const sy = o.y - y + (o.el.closest('#ctIn') ? shift : 0);
      const p = reduce ? 1 : out3(clamp(((G.vh * 0.94 - sy) / G.vh - o.delay) / o.len, 0, 1));
      const v = p.toFixed(3);
      if (v !== o.v) { o.v = v; o.el.style.setProperty(o.prop, v); }
    }

    demoTick(now);

    // футер: окно с картинкой раскрывается по скроллу, кадр внутри чуть едет; линза
    if (win) {
      const wr = win.getBoundingClientRect();
      const pw = reduce ? 1 : out3(clamp((G.vh - wr.top) / (wr.height * 1.3 + 30), 0, 1)); // к моменту, когда строка целиком на экране, окно открыто
      const ck = pw.toFixed(3);
      if (ck !== win._k) { win._k = ck; win.style.setProperty('--o', ck); lensBox.style.transform = `translate3d(0,${((1 - pw) * 12).toFixed(1)}%,0) scale(${(1.12 - pw * 0.12).toFixed(3)})`; }
      if (lines) {
        WL.x = lerp(WL.x, WL.tx, 0.3); WL.y = lerp(WL.y, WL.ty, 0.3); WL.r = lerp(WL.r, WL.tr, 0.16); if (WL.r < 0.4) WL.r = 0;
        const c = `circle(${WL.r.toFixed(1)}px at ${WL.x.toFixed(1)}px ${WL.y.toFixed(1)}px)`;
        if (c !== lines._c) { lines._c = c; lines.style.clipPath = c; win.style.setProperty('--lx', WL.x.toFixed(1) + 'px'); win.style.setProperty('--ly', WL.y.toFixed(1) + 'px'); win.style.setProperty('--lr', WL.r.toFixed(1) + 'px'); }
      }
    }
  }

  measure();
  document.fonts && document.fonts.ready.then(measure);
  return { frame, measure, top: () => G.top };
}
