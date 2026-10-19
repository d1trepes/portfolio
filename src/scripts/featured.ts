// @ts-nocheck
// Блок 2 «Избранные проекты»: закреплённый 3D-слайдер.
// Скролл двигает проекты; при движении карточки изгибаются и разворачиваются, в покое — ровные.
// Первый экран (hero.ts) сажает панели из кольца ровно в позиции карточек этого слайдера.

export function initFeatured() {
  const $ = (s, r = document) => r.querySelector(s);
  const sec = $('#featured'), fs = $('#fs'), zone = $('#fsZone'), tintEl = $('#tint'), cardsBox = $('#fsCards');
  const tints = [...tintEl.children];
  const cards = [...document.querySelectorAll('#fsCards .card')];
  const titles = [...document.querySelectorAll('.fs-t1 .ft, .fs-t2 .ft, .fs-info .fi')];
  const dots = [...document.querySelectorAll('#fsDots button')];
  const num = $('#fsNum'), open = $('#fsOpen'), bar = $('#fsBar'), root = document.documentElement, meta = document.querySelector('meta[name=theme-color]');
  const n = cards.length;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const N = innerWidth < 900 ? 6 : 8;
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sstep = (t) => t * t * (3 - 2 * t);
  const q = (v, st) => Math.round(v / st) * st; // округление: меньше лишних перерисовок

  // карточки → тонкие вертикальные полосы, как панели кольца (так их можно изгибать)
  const C = cards.map((el, i) => {
    const rig = el.querySelector('.card-rig');
    const html = el.querySelector('.card-flat').innerHTML;
    const bg = el.dataset.bg || '#D9D9D5';
    const sl = [];
    for (let k = 0; k < N; k++) {
      const s = document.createElement('div');
      s.className = 'csl' + (k === 0 ? ' first' : '') + (k === N - 1 ? ' last' : '');
      s.innerHTML = `<div class="f"><div class="in">${html}</div><div class="dm"></div></div>`;
      rig.appendChild(s);
      sl.push({ el: s, inner: s.querySelector('.in'), k, tr: '', sh: '' });
    }
    const shd = document.createElement('div'); shd.className = 'shd'; rig.prepend(shd);
    el.classList.add('ready');
    return { el, i, sl, bg, light: el.dataset.tone === 'light', url: el.getAttribute('href'), tr: '', dim: '', z: '', lift: 0, tx: 0, ty: 0 };
  });

  const S = { W: 600, H: 328, sw: 60, cx: 0, cy: 0, sp: 500, step: 600, hold: 300, docTop: 0, stTop: 0, vw: 1, vh: 1 };
  const xOff = (d) => { const a = Math.abs(d); return Math.sign(d) * (Math.min(a, 1) * S.sp + Math.max(0, a - 1) * S.sp * 0.82); };
  const scl = (d) => { const a = Math.abs(d); return a <= 1 ? 1 - 0.28 * a : 0.72 - (a - 1) * 0.1; };

  function measure(stage) {
    S.vw = document.documentElement.clientWidth; S.vh = innerHeight;
    const fr = fs.getBoundingClientRect(), zr = zone.getBoundingClientRect();
    const mobile = S.vw < 900;
    const maxW = mobile ? S.vw - 48 : Math.min(S.vw * 0.46, 900);
    S.W = Math.max(200, Math.min(maxW, zr.height * 1.83));
    S.H = S.W / 1.83; S.sw = S.W / N;
    S.cx = zr.left - fr.left + zr.width / 2; S.cy = zr.top - fr.top + zr.height / 2;
    S.sp = S.W * (mobile ? 0.84 : 0.92);
    S.step = S.vh * 0.85;
    S.hold = S.vh * 0.4; // «пауза» в начале блока: карточка встаёт на место и стоит, листание начинается не сразу (в featured.css тоже +40svh)
    const sr = sec.getBoundingClientRect();
    S.docTop = sr.top + scrollY;
    S.stTop = sr.top - (stage ? stage.getBoundingClientRect().top : 0);
    const rad = S.W * 0.05;
    C.forEach((c) => {
      c.el.style.width = S.W + 'px'; c.el.style.height = S.H + 'px';
      c.sl.forEach((o) => {
        o.el.style.width = (S.sw + 1.6) + 'px'; o.el.style.height = S.H + 'px'; o.el.style.setProperty('--rad', rad + 'px');
        o.inner.style.width = S.W + 'px'; o.inner.style.height = S.H + 'px'; o.inner.style.setProperty('--u', S.W / 100 + 'px'); o.inner.style.left = (-o.k * S.sw) + 'px';
        o.tr = '';
      });
      c.tr = '';
    });
    dirty = true;
  }

  // где стоят карточки в покое на первом проекте — туда приземляются панели из кольца (координаты stage)
  function slot(id) {
    const c = C.find((c) => c.el.dataset.id === id); if (!c) return null;
    const d = c.i, s = scl(d), w = S.W * s, h = S.H * s;
    const x = S.cx + xOff(d) - w / 2, y = S.stTop + S.cy - h / 2;
    return { x, y, w, h, off: x > S.vw || x + w < 0, el: c.el, url: c.url };
  }

  // ---------- навигация ----------
  const api = { lenis: null, measure, slot, frame, docTop: () => S.docTop,
    // для перехода в «Обо мне»: где кончается блок и где стоит последняя карточка
    exit: () => ({ end: S.docTop + S.hold + (n - 1) * S.step + S.vh * 0.3, x: S.cx, y: S.cy, W: S.W, H: S.H, rad: S.W * 0.05, el: C[n - 1].el }) };
  function go(i) {
    i = clamp(i, 0, n - 1);
    const y = i === 0 ? S.docTop : S.docTop + S.hold + i * S.step;
    snapping = true; snapT = performance.now();
    if (api.lenis) api.lenis.scrollTo(y, { duration: reduce ? 0 : 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete: () => { snapping = false; } });
    else { scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }
  }
  dots.forEach((b) => b.addEventListener('click', () => go(+b.dataset.i)));

  let swiped = false;
  C.forEach((c) => c.el.addEventListener('click', (e) => {
    if (swiped) { e.preventDefault(); swiped = false; return; }
    if (c.i !== idx) { e.preventDefault(); go(c.i); }
  }));
  // свайп по карточкам на телефоне
  let sx = 0, sy = 0, st = 0;
  fs.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; sx = e.clientX; sy = e.clientY; st = performance.now(); }, { passive: true });
  fs.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch') return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && performance.now() - st < 700) { swiped = true; setTimeout(() => (swiped = false), 400); go(idx + (dx < 0 ? 1 : -1)); }
  }, { passive: true });
  let touching = false;
  addEventListener('touchstart', () => (touching = true), { passive: true });
  addEventListener('touchend', () => (touching = false), { passive: true });
  addEventListener('touchcancel', () => (touching = false), { passive: true });
  addEventListener('keydown', (e) => {
    if (!inPin) return;
    if (e.key === 'ArrowRight' && idx < n - 1) { e.preventDefault(); go(idx + 1); }
    if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); go(idx - 1); }
  });

  // наклон активной карточки к курсору + подсказка
  const tip = document.createElement('div'); tip.className = 'fs-tip'; document.body.appendChild(tip);
  let hov = null, px = 0, py = 0;
  C.forEach((c) => {
    c.el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; hov = c; tip.textContent = c.i === idx ? 'Открыть кейс' : c.i > idx ? 'Следующий проект' : 'Предыдущий проект'; tip.classList.add('on'); });
    c.el.addEventListener('pointerleave', () => { if (hov === c) hov = null; tip.classList.remove('on'); });
  });
  let tX = 0, tY = 0;
  addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    if (hov && hov.i === idx && fine && !reduce) {
      const r = hov.el.getBoundingClientRect();
      tX = clamp(((px - r.left) / r.width - 0.5) * 2, -1, 1); tY = clamp(((py - r.top) / r.height - 0.5) * 2, -1, 1);
    } else { tX = tY = 0; }
    if (tip.classList.contains('on')) tip.style.transform = `translate3d(${px + 16}px,${py + 18}px,0)`;
  }, { passive: true });

  // ---------- кадр ----------
  let fsm = 0, fPrev = 0, vs = 0, idx = -1, dirty = true, lastY = -1, dir = 0, lastMove = 0, snapping = false, snapT = 0, inPin = false;
  let tintOp = '', tintMix = '', pre = null, hdrLight = null;
  function setIdx(i) {
    if (i === idx) return; idx = i;
    titles.forEach((t) => { const j = +t.dataset.i; t.dataset.s = j < i ? 'prev' : j > i ? 'next' : 'cur'; });
    dots.forEach((b, j) => (j === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    num.textContent = String(i + 1).padStart(2, '0');
    open.setAttribute('href', C[i].url);
    fs.dataset.tone = C[i].light ? 'light' : 'dark';
    cardsBox.style.setProperty('--dimc', C[i].bg);
    if (meta && !pre) meta.content = C[i].bg;
    if (hov) tip.textContent = hov.i === i ? 'Открыть кейс' : hov.i > i ? 'Следующий проект' : 'Предыдущий проект';
  }

  function frame(now, dt) {
    const y = scrollY;
    const endPin = S.docTop + S.hold + (n - 1) * S.step + S.vh * 0.3;
    const near = y > S.docTop - S.vh * 1.3 && y < endPin + S.vh * 1.2;
    if (y !== lastY) { dir = y > lastY ? 1 : -1; lastY = y; lastMove = now; }

    // цвет фона: появляется на подходе к блоку, уходит после него
    const fT = clamp((y - S.docTop - S.hold) / S.step, 0, n - 1);
    inPin = y >= S.docTop - 2 && y <= endPin;
    const enter = clamp((y - (S.docTop - S.vh * 0.62)) / (S.vh * 0.58), 0, 1);
    const exit = clamp(1 - (y - endPin) / (S.vh * 0.5), 0, 1);
    const op = sstep(Math.min(enter, exit));

    if (!near && !dirty && Math.abs(fsm - fT) < 0.001) { if (tintOp !== '0') { tintEl.style.opacity = 0; tintOp = '0'; root.classList.remove('hdr-light'); hdrLight = false; } return; }

    // плавное следование за скроллом и скорость (для изгиба)
    fsm = reduce ? fT : lerp(fsm, fT, 0.2); if (Math.abs(fsm - fT) < 0.0005) fsm = fT;
    const v = dt > 0 ? (fsm - fPrev) / dt : 0; fPrev = fsm;
    vs = reduce ? 0 : lerp(vs, v, 0.14); if (Math.abs(vs) < 0.002) vs = 0;
    const m = clamp(Math.abs(vs) / 2.2, 0, 1);
    const B = clamp(vs * 0.34, -0.72, 0.72);

    setIdx(clamp(Math.round(fsm), 0, n - 1));

    // цвета: только прозрачность слоёв, без перекраски страницы
    const i0 = Math.floor(fsm), i1 = Math.min(n - 1, i0 + 1), t = sstep(fsm - i0);
    const o = q(op, 0.01).toFixed(2);
    if (o !== tintOp) { tintEl.style.opacity = o; tintOp = o; }
    const mixKey = i0 + ':' + q(t, 0.01).toFixed(2);
    if (mixKey !== tintMix) {
      tintMix = mixKey;
      tints.forEach((el, j) => { el.style.opacity = j === i0 ? 1 : j === i1 ? q(t, 0.01).toFixed(2) : 0; });
    }
    const isPre = op < 0.5;
    if (isPre !== pre) { pre = isPre; if (isPre) fs.setAttribute('data-pre', ''); else { fs.removeAttribute('data-pre'); if (meta) meta.content = C[idx].bg; } if (isPre && meta) meta.content = '#F3F3F1'; }
    const hl = !isPre && C[idx].light;
    if (hl !== hdrLight) { hdrLight = hl; root.classList.toggle('hdr-light', hl); }
    const bt = `scaleX(${(fT / Math.max(1, n - 1)).toFixed(3)})`; if (bt !== bar._t) { bar.style.transform = bt; bar._t = bt; }

    // мягкая доводка до ближайшего проекта, когда скролл остановился
    if (!snapping && inPin && !touching && now - lastMove > 170) {
      const target = Math.round(fT);
      if (Math.abs(fT - target) > 0.004 && fT < n - 1 + 1e-3 && y <= S.docTop + S.hold + (n - 1) * S.step + 2) go(target);
    }
    // остановились на полпути с первого экрана (листая вниз) — мягко доводим, чтобы карточки сели на место
    if (!snapping && !touching && dir > 0 && now - lastMove > 220 && y > S.docTop * 0.45 && y < S.docTop - 2) go(0);
    if (snapping && now - snapT > 1600) snapping = false;


    C.forEach((c) => {
      const d = c.i - fsm, ad = Math.abs(d), act = c.i === idx && hov === c ? 1 : 0;
      c.lift = lerp(c.lift, act, 0.1); c.tx = lerp(c.tx, act ? tX : 0, 0.12); c.ty = lerp(c.ty, act ? tY : 0, 0.12);
      if (Math.abs(c.lift - act) < 0.001) c.lift = act;
      const s = scl(d) * (1 - 0.07 * m);
      const z = -m * 140 + c.lift * 46;
      const ry = -clamp(d, -1.2, 1.2) * 26 * m + c.tx * 7 * c.lift;
      const rx = -c.ty * 5 * c.lift;
      const X = S.cx + xOff(d) - S.W / 2, Y = S.cy - S.H / 2;
      const tr = `translate3d(${X.toFixed(2)}px,${Y.toFixed(2)}px,${z.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) scale(${s.toFixed(4)})`;
      if (tr !== c.tr) { c.el.style.transform = tr; c.tr = tr; }
      const dim = q(Math.min(ad, 1) * 0.5, 0.05).toFixed(2);
      if (dim !== c.dim) { c.el.style.setProperty('--dim', dim); c.dim = dim; }
      const zi = String(10 - Math.round(ad * 2)); if (zi !== c.z) { c.el.style.zIndex = zi; c.z = zi; }

      // изгиб: полосы раскладываются по дуге, длина дуги = ширине карточки
      const Bc = B * (1 - 0.35 * Math.min(ad, 1));
      c.sl.forEach((o) => {
        const u = (o.k + 0.5) / N - 0.5;
        let x = u * S.W, zz = 0, a = 0;
        if (Math.abs(Bc) > 1e-3) { const R = S.W / Bc; a = u * Bc; x = R * Math.sin(a); zz = -R * (1 - Math.cos(a)); }
        const t2 = `translate3d(${(x + S.W / 2 - S.sw / 2 - 0.8).toFixed(2)}px,0,${zz.toFixed(2)}px) rotateY(${a.toFixed(4)}rad)`;
        if (t2 !== o.tr) { o.el.style.transform = t2; o.tr = t2; }
      });
    });
    dirty = false;
  }

  return api;
}
