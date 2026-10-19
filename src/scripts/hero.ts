// @ts-nocheck
// Первый экран: кольцо панелей вокруг головы, линза-курсор и переход проектов в «Избранные проекты».
import Lenis from 'lenis';
import { panelHTML } from './panel';

export function initHero() {
  const PANELS = JSON.parse(document.getElementById('panels-data').textContent);
  const N = 10, TAU = Math.PI * 2, SPAN = 40 * Math.PI / 180, dA = SPAN / N, FRONT = .3;
  const HEAD = { x: .62, top: .098 }; // центр головы по горизонтали — доля ширины фото
  const $ = (s) => document.querySelector(s);
  const stage = $('#stage'), hero = $('#hero'), photo = $('#photo'), layer = $('#layer'), lens = $('#lens'), ring = $('#ring'), hint = $('#hint');
  const rigF = $('#rigFront'), rigB = $('#rigBack'), sceneF = $('#sceneFront'), sceneB = $('#sceneBack'), featured = $('#featured'), toast = $('#toast');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

  function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('on'), 2200); }
  // Пока бота нет — показываем подсказку вместо перехода.
  document.querySelectorAll('[data-tg]').forEach((a) => a.addEventListener('click', (e) => {
    if (a.getAttribute('href') !== '#') return;
    e.preventDefault(); say('Здесь откроется бот: t.me/…?start=site_hero');
  }));

  // силуэт головы — чтобы линза включалась только над ней
  let silData = null; const SW = 200, SH = 188;
  { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = SW; c.height = SH; const x = c.getContext('2d'); x.drawImage(im, 0, 0, SW, SH); try { silData = x.getImageData(0, 0, SW, SH).data; } catch (e) {} }; im.src = '/hero/sil.webp'; }
  function onHead(px, py) {
    if (px < 0 || py < 0 || px > G.photo.w || py > G.photo.h * .8) return false;
    if (!silData) return true;
    return silData[(Math.floor(py / G.photo.h * SH) * SW + Math.floor(px / G.photo.w * SW)) * 4 + 3] > 90;
  }

  let hoverP = null;
  // подсказка у курсора над панелью-проектом
  const tip = document.createElement('div'); tip.className = 'ring-tip'; tip.textContent = 'Открыть кейс'; stage.appendChild(tip);
  addEventListener('pointermove', (e) => { if (!tip.classList.contains('on')) return; const r = stage.getBoundingClientRect(); tip.style.transform = `translate3d(${e.clientX - r.left + 16}px,${e.clientY - r.top + 18}px,0)`; }, { passive: true });
  const slices = [];
  PANELS.forEach((p) => {
    p.slices = [];
    if (p.type === 'p') {
      p.slot = document.querySelector(`.fcard[data-id="${p.id}"]`);
      p.url = p.slot.getAttribute('href');
    }
    for (let k = 0; k < N; k++) {
      const s = document.createElement('div');
      s.className = 'slice' + (k === 0 ? ' first' : '') + (k === N - 1 ? ' last' : '') + (p.type === 'p' ? ' proj' : '');
      s.innerHTML = `<div class="f"><div class="in">${panelHTML(p)}</div></div><div class="b"></div>`;
      if (p.type === 'p') {
        s.addEventListener('pointerenter', () => { hoverP = p; p.slices.forEach((o) => o.el.classList.add('hot')); tip.classList.add('on'); });
        s.addEventListener('pointerleave', () => { if (hoverP === p) hoverP = null; p.slices.forEach((o) => o.el.classList.remove('hot')); tip.classList.remove('on'); });
        s.addEventListener('click', () => { location.href = p.url; });
      }
      const o = { el: s, inner: s.querySelector('.in'), f: s.firstChild, b: s.lastChild, k, p, front: null, shade: '' };
      p.slices.push(o); slices.push(o);
    }
  });

  const G = { photo: { x: 0, y: 0, w: 1, h: 1 } };
  let dirty = true;
  function measure() {
    const mobile = innerWidth < 900, vw = document.documentElement.clientWidth;
    const hr = hero.getBoundingClientRect();
    let ph, pw;
    if (mobile) {
      const sideB = document.querySelector('.side--r').getBoundingClientRect().bottom - hr.top;
      ph = clamp((hr.height - sideB - 24) / 0.9, 300, 700); pw = ph * 1086 / 1018;
      if (pw > vw * 1.25) { pw = vw * 1.25; ph = pw * 1018 / 1086; }
    } else {
      ph = hr.height * .9; pw = ph * 1086 / 1018;
      const maxW = vw * (vw > 1800 ? .54 : .5); if (pw > maxW) { pw = maxW; ph = pw * 1018 / 1086; }
    }
    photo.style.width = pw + 'px'; photo.style.left = (vw / 2 - pw * HEAD.x) + 'px';
    const st = stage.getBoundingClientRect(), pr = photo.getBoundingClientRect();
    const ox = -st.left, oy = -st.top;
    G.heroH = hr.height; G.hx = hr.left + ox; G.hy = hr.top + oy;
    G.photo = { x: pr.left + ox, y: pr.top + oy, w: pr.width, h: pr.height };
    G.cx = G.photo.x + G.photo.w * HEAD.x; G.cy = G.photo.y + G.photo.h * (mobile ? .64 : .66);
    G.R = clamp(G.photo.w * (mobile ? .44 : .4), 140, 380);
    G.sw = 2 * G.R * Math.tan(dA / 2); G.W = G.sw * N; G.H = G.W / 1.83; G.rad = G.W * .05;
    G.lensR = mobile ? 58 : clamp(G.photo.w * .095, 62, 90);
    [sceneF, sceneB].forEach((s) => s.style.perspectiveOrigin = `${G.cx}px ${G.cy}px`);
    slices.forEach((o) => {
      o.el.style.width = (G.sw + 1.6) + 'px'; o.el.style.height = G.H + 'px'; o.el.style.setProperty('--rad', G.rad + 'px');
      o.inner.style.width = G.W + 'px'; o.inner.style.height = G.H + 'px'; o.inner.style.left = (-o.k * G.sw) + 'px';
    });
    PANELS.forEach((p) => { if (!p.slot) return; const r = p.slot.getBoundingClientRect(); p.fx = r.left + ox; p.fy = r.top + oy; p.fw = r.width; p.fh = r.height; });
    G.travel = Math.max(300, (PANELS[0].fy - G.hy) - innerHeight * .3);
    dirty = true;
  }

  // линза = курсор над головой
  const L = { x: 0, y: 0, tx: 0, ty: 0, r: 0, show: 0, user: false };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = hero.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const on = onHead(x - (G.photo.x - G.hx), y - (G.photo.y - G.hy)) && !e.target.closest('.slice,.btn,.hdr,.services');
    hero.classList.toggle('on-head', on);
    if (on) { L.tx = x; L.ty = y; L.show = 1; if (!L.user) { L.user = true; L.x = x; L.y = y; hint.classList.remove('on'); } }
    else if (L.user) L.show = 0;
  }, { passive: true });
  function touch(e) { const t = e.touches[0], r = hero.getBoundingClientRect(); L.tx = t.clientX - r.left; L.ty = t.clientY - r.top; L.user = true; L.show = 1; hint.classList.remove('on'); }
  hero.addEventListener('touchstart', touch, { passive: true });
  hero.addEventListener('touchmove', touch, { passive: true });

  let lenis = null;
  if (!reduce) { try { lenis = new Lenis({ lerp: .085, smoothWheel: true }); } catch (e) { lenis = null; } }
  const goProjects = (e) => { e.preventDefault(); const y = featured.getBoundingClientRect().top + scrollY - 40; lenis ? lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: 'smooth' }); };
  $('#toProjects').addEventListener('click', goProjects);
  document.querySelectorAll('#pill a:not([aria-current])').forEach((a) => a.addEventListener('click', goProjects));

  let last = performance.now(), start = last, ang = .35, speed = 0, lastP = -1, lastClip = '', Ps = 0, heroOn = true;
  new IntersectionObserver(([en]) => { heroOn = en.isIntersecting; }).observe(hero);
  function frame(now) {
    if (lenis) lenis.raf(now);
    const dt = Math.min(50, now - last) / 1000; last = now;
    const y = scrollY;
    const P = clamp(y / G.travel, 0, 1); Ps = reduce ? P : lerp(Ps, P, .18); if (Math.abs(Ps - P) < .002) Ps = P;
    const p = ease(Ps);
    const want = reduce ? 0 : (hoverP ? 0 : .11) * (1 - Ps);
    speed = lerp(speed, want, .05); ang += speed * dt;

    if ((p < 1 && (heroOn || p > 0)) || lastP !== p || dirty) {
      const tz = -6 * (1 - p), tx = -10 * (1 - p);
      rigF.style.transform = rigB.style.transform = `translate3d(${G.cx}px,${G.cy}px,0) rotateZ(${tz}deg) rotateX(${tx}deg)`;
      const decoA = clamp(1 - p * 2.4, 0, 1), land = clamp((p - .86) / .13, 0, 1);
      PANELS.forEach((pn, i) => {
        const base = wrap(ang + i * TAU / PANELS.length), proj = pn.type === 'p', s = proj ? pn.fw / G.W : 1;
        const panelFront = Math.cos(base) > FRONT;
        pn.lift = lerp(pn.lift || 0, hoverP === pn ? 1 : 0, .12); if (Math.abs(pn.lift - (hoverP === pn ? 1 : 0)) < .001) pn.lift = hoverP === pn ? 1 : 0;
        pn.slices.forEach((o) => {
          const off = (o.k - (N - 1) / 2) * dA, phR = base + off;
          const R = G.R * (1 + .05 * pn.lift); let X = R * Math.sin(phR), Y = 0, Z = R * Math.cos(phR), ph = phR, S = 1, front = panelFront;
          if (proj && p > 0) {
            const fxC = pn.fx + (o.k + .5) * G.sw * s - G.cx, fyC = pn.fy + pn.fh / 2 - G.cy;
            X = lerp(X, fxC, p); Y = lerp(0, fyC, p); Z = lerp(Z, 0, p); ph = lerp(phR, 0, p); S = lerp(1, s, p); front = panelFront || p > .45;
          }
          o.el.style.transform = `translate3d(${(X - G.sw / 2).toFixed(2)}px,${(Y - G.H / 2).toFixed(2)}px,${Z.toFixed(2)}px) rotateY(${ph.toFixed(4)}rad) scale(${S.toFixed(4)})`;
          const l = Math.round(236 + 8 * Math.cos(ph + .55) + 8 * (1 - Math.abs(Math.sin(ph)) * .6));
          const sh = `rgb(${l},${l},${l - 2})`; if (sh !== o.shade) { o.el.style.setProperty('--sh', sh); o.shade = sh; }
          const a = proj ? 1 - land : decoA; if (a !== o.a) { o.f.style.opacity = o.b.style.opacity = a; o.el.style.visibility = a > 0 ? 'visible' : 'hidden'; o.a = a; }
          if (front !== o.front) { (front ? rigF : rigB).appendChild(o.el); o.front = front; }
        });
      });
      PANELS.forEach((pn) => { if (pn.slot) { pn.slot.style.opacity = land; pn.slot.style.visibility = land > 0 ? 'visible' : 'hidden'; } });
      lastP = p; dirty = false;
    }

    if (heroOn) {
      const pxo = G.photo.x - G.hx, pyo = G.photo.y - G.hy;
      if (!L.user) {
        const t = reduce ? 1 : clamp((now - start - 1000) / 2200, 0, 1), e = ease(t);
        L.tx = pxo + G.photo.w * lerp(.4, .52, e); L.ty = pyo + G.photo.h * lerp(.46, .3, e);
        if (!fine && t >= 1) { const tt = (now - start) / 1000; L.tx = pxo + G.photo.w * (.52 + Math.sin(tt * .5) * .1); L.ty = pyo + G.photo.h * (.34 + Math.sin(tt * .8) * .08); }
        L.show = now - start > 1000 ? 1 : 0; if (t >= 1 && fine) hint.classList.add('on');
        L.x = L.tx; L.y = L.ty;
      } else { L.x = lerp(L.x, L.tx, .5); L.y = lerp(L.y, L.ty, .5); }
      L.r = lerp(L.r, G.lensR * L.show * (1 - clamp(y / (G.heroH * .4), 0, 1)), .16);
      const clip = `circle(${L.r.toFixed(1)}px at ${(L.x - pxo).toFixed(1)}px ${(L.y - pyo).toFixed(1)}px)`;
      if (clip !== lastClip) {
        layer.style.clipPath = clip; lastClip = clip;
        ring.style.width = ring.style.height = (L.r * 2).toFixed(1) + 'px';
        lens.style.opacity = L.r > 2 ? 1 : 0;
        lens.style.transform = `translate3d(${L.x.toFixed(1)}px,${L.y.toFixed(1)}px,0)`;
        hint.style.transform = `translate3d(${(L.x + G.lensR + 14).toFixed(1)}px,${(L.y - 16).toFixed(1)}px,0)`;
      }
    }
    requestAnimationFrame(frame);
  }
  measure(); addEventListener('resize', measure);
  document.fonts && document.fonts.ready.then(measure);
  requestAnimationFrame(frame);
}
