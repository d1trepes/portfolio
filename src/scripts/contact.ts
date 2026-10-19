// @ts-nocheck
// Блок 4 «Связь» + тёмный футер.
// Дуга-переход, «подложка» с лёгким параллаксом, мини-анимации по скроллу, магнитная круглая кнопка,
// форма-фраза (подсказка печатается сама, поле контакта само узнаёт Telegram/телефон/почту) и отправка.
// Кадр вызывается из общего цикла (hero.ts) — отдельного requestAnimationFrame нет; вне экрана ничего не считает.
import { LEAD_ENDPOINT } from '../data/ring';

export function initContact(F) {
  const $ = (s, r = document) => r.querySelector(s);
  const sec = $('#contact');
  if (!sec) return { frame() {}, measure() {}, top: () => 0 };
  const arc = $('#ctArc'), inner = $('#ctIn'), form = $('#ctForm'), mag = $('#ctMag'), send = $('#ctSend'), label = $('.ct-sl', send);
  const msg = $('#ctMsg'), typeEl = $('#ctType'), done = $('#ctDone'), toast = $('#toast'), root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
  const out3 = (t) => 1 - Math.pow(1 - t, 3);
  const say = (t) => { toast.textContent = t; toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('on'), 2400); };

  // ---------- мини-анимации: у каждого элемента своё окно по положению на экране ----------
  const A = [];
  const add = (el, prop, delay = 0, len = 0.22) => el && A.push({ el, prop, delay, len, y: 0, v: '' });
  sec.querySelectorAll('.ct-eyebrow, .ct-ln > span, .ct-phrase, .ct-kind, .ct-quick .ct-up').forEach((el) => add(el, '--p'));
  sec.querySelectorAll('.ct-f').forEach((el, i) => add(el, '--ln', 0.06 + i * 0.05, 0.3));
  add($('.ct-rule', sec), '--ln', 0, 0.4);
  add(mag, '--p', 0.12, 0.25);
  // футер
  const foot = $('#ft');
  if (foot) foot.querySelectorAll('.ft-up').forEach((el) => add(el, '--p'));
  // строки одного ряда — лесенкой
  const stagger = new Map();
  A.forEach((o) => { if (o.prop !== '--p') return; const key = o.el.closest('.ct-kinds, .ct-quick, .ft-cols, h2') || o.el; const n = stagger.get(key) || 0; stagger.set(key, n + 1); o.delay += n * 0.035; });

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
  const inputs = Object.fromEntries(fields.map((f) => [f.dataset.key, $('input', f)]));
  fields.forEach((f) => {
    const inp = $('input', f), ph = f.dataset.v;
    inp.addEventListener('input', () => { f.dataset.v = inp.value || ph; f.classList.remove('bad'); if (msg.textContent) check(false); });
  });

  // подсказка в поле задачи печатается сама и меняется — сразу видно, что сюда писать
  const examples = ['завода с картой дилеров', 'кофейни с доставкой', 'онлайн-школы английского', 'стоматологии в Минске', 'студии ремонта квартир'];
  const task = inputs.task, taskF = task.closest('.ct-f');
  let ty = { i: 0, n: 0, dir: 1, t: 0, hold: 0 };
  function typeTick(now) {
    if (task.value || reduce) { if (reduce && !task.value && task.placeholder !== examples[0]) task.placeholder = examples[0]; return; }
    if (now < ty.t) return;
    const word = examples[ty.i];
    if (ty.n === 0 && ty.dir > 0 && taskF.dataset.v !== word) taskF.dataset.v = word; // ширина поля — под текущий пример
    if (ty.dir > 0) { ty.n++; ty.t = now + 55 + Math.random() * 40; if (ty.n >= word.length) { ty.dir = -1; ty.t = now + 1700; } }
    else { ty.n--; ty.t = now + 24; if (ty.n <= 0) { ty.dir = 1; ty.i = (ty.i + 1) % examples.length; ty.t = now + 350; } }
    task.placeholder = word.slice(0, ty.n);
  }

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

  // Enter — к следующему полю, в последнем — отправка
  const order = ['name', 'task', 'contact'];
  order.forEach((k, i) => inputs[k].addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (i < order.length - 1) { e.preventDefault(); inputs[order[i + 1]].focus(); }
  }));
  form.querySelectorAll('.ct-kind input').forEach((r) => r.addEventListener('change', () => { if (!inputs.task.value) inputs.task.focus({ preventScroll: true }); }));

  function check(focus = true) {
    const bad = [];
    if (inputs.name.value.trim().length < 2) bad.push('name');
    if (!kindOf(inputs.contact.value)) bad.push('contact');
    fields.forEach((f) => f.classList.toggle('bad', bad.includes(f.dataset.key) && focus));
    msg.textContent = !bad.length ? '' : bad.length === 2 ? 'Оставьте имя и контакт — без них я не смогу ответить' : bad[0] === 'name' ? 'Как к вам обращаться?' : 'Проверьте контакт: @ник в Telegram, телефон или почта';
    if (focus && bad.length) { const f = fields.find((x) => x.dataset.key === bad[0]); f.classList.remove('bad'); void f.offsetWidth; f.classList.add('bad'); inputs[bad[0]].focus({ preventScroll: true }); }
    return !bad.length;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!check()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.company) return; // бот
    data.contactType = kindOf(data.contact);
    data.page = location.pathname; data.ref = new URLSearchParams(location.search).get('utm_source') || '';
    send.classList.add('busy'); label.textContent = 'Отправляю…';
    try {
      if (LEAD_ENDPOINT) {
        const r = await fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error(r.status);
      } else await new Promise((r) => setTimeout(r, 900)); // демо-режим, пока нет сервера
      done.hidden = false; void done.offsetWidth;
      form.classList.add('sent');
    } catch (err) {
      msg.textContent = 'Не отправилось — напишите мне в Telegram, кнопка ниже';
    } finally { send.classList.remove('busy'); label.textContent = 'Отправить'; }
  });
  $('#ctAgain').addEventListener('click', () => {
    form.classList.remove('sent'); form.reset();
    fields.forEach((f) => { f.dataset.v = $('input', f).placeholder || f.dataset.v; });
    fields.find((f) => f.dataset.key === 'name').dataset.v = 'ваше имя';
    fields.find((f) => f.dataset.key === 'contact').dataset.v = '@ник, телефон или почта';
    fields.find((f) => f.dataset.key === 'task').dataset.v = examples[ty.i];
    typeEl.classList.remove('on');
    setTimeout(() => { done.hidden = true; inputs.name.focus({ preventScroll: true }); }, 700);
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

  // ---------- магнитная кнопка ----------
  const M = { x: 0, y: 0, tx: 0, ty: 0, k: '' };
  let px = -1e4, py = -1e4;
  if (fine && !reduce) addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; }, { passive: true });

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

    typeTick(now);

    // магнит: кнопка тянется к курсору, когда он рядом
    if (fine && !reduce) {
      const r = mag.getBoundingClientRect(), cx = r.left + r.width / 2 - M.x, cy = r.top + r.height / 2 - M.y;
      const dx = px - cx, dy = py - cy, R = r.width * 0.5, inside = Math.hypot(dx, dy) < R * 1.7;
      M.tx = inside ? dx * 0.32 : 0; M.ty = inside ? dy * 0.32 : 0;
      M.x = lerp(M.x, M.tx, 0.14); M.y = lerp(M.y, M.ty, 0.14);
      const k = `${M.x.toFixed(1)},${M.y.toFixed(1)}`;
      if (k !== M.k) { M.k = k; mag.style.transform = `translate3d(${M.x.toFixed(1)}px,${M.y.toFixed(1)}px,0)`; label.style.transform = `translate3d(${(M.x * 0.35).toFixed(1)}px,${(M.y * 0.35).toFixed(1)}px,0)`; }
    }

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
