// @ts-nocheck
// Блок 3 «Обо мне»: линза над головой (как на первом экране), лёгкий наклон головы за курсором,
// досчитывающие цифры и переход из слайдера — последняя карточка сжимается в круг и садится на лицо линзой.
// Кадр вызывается из общего цикла первого экрана (hero.ts), отдельного requestAnimationFrame нет.

export function initAbout(F) {
  const $ = (s) => document.querySelector(s);
  const sec = $('#about');
  if (!sec) return { frame() {}, measure() {}, top: () => 0 };
  const tilt = $('#abTilt'), photo = $('#abPhoto'), layer = $('#abLayer'), lens = $('#abLens'), ring = $('#abRing');
  const nums = [...document.querySelectorAll('#abFacts b')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const HX = 0.38; // центр головы в отражённом фото — доля ширины
  // путь, по которому линза сама проезжает по лицу (доли фото, уже с учётом отражения)
  const P0 = { x: 1 - 0.4, y: 0.46 }, P1 = { x: 1 - 0.52, y: 0.3 };

  // силуэт головы (тот же файл, что на первом экране) — линза включается только над головой
  let sil = null; const SW = 200, SH = 188;
  { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = SW; c.height = SH; const x = c.getContext('2d'); x.drawImage(im, 0, 0, SW, SH); try { sil = x.getImageData(0, 0, SW, SH).data; } catch (e) {} }; im.src = '/hero/sil.webp'; }
  const G = { x: 0, y: 0, w: 1, h: 1, top: 0, secH: 1, R: 70, mobile: false, vw: 1, vh: 1 };
  function onHead(px, py) {
    if (px < 0 || py < 0 || px > G.w || py > G.h * 0.8) return false;
    if (!sil) return true;
    const fx = 1 - px / G.w; // фото отражено
    return sil[(Math.floor(py / G.h * SH) * SW + Math.floor(clamp(fx, 0, 0.999) * SW)) * 4 + 3] > 90;
  }

  // карточка-«капля» для перехода
  const blob = document.createElement('div'); blob.className = 'ab-blob';
  blob.innerHTML = '<div class="bg"></div><div class="in"></div>';
  document.body.appendChild(blob);
  const blobIn = blob.querySelector('.in'), blobBg = blob.querySelector('.bg');
  let X = null, blobOn = false, card = null;

  function measure() {
    G.vw = document.documentElement.clientWidth; G.vh = innerHeight;
    G.mobile = innerWidth < 900;
    const sr = sec.getBoundingClientRect();
    G.top = sr.top + scrollY; G.secH = sr.height;
    if (G.mobile) {
      tilt.style.left = tilt.style.top = tilt.style.width = tilt.style.height = '';
      const tr = tilt.getBoundingClientRect();
      G.x = tr.left - sr.left; G.y = tr.top - sr.top; G.w = tr.width; G.h = tr.height;
    } else {
      let ph = sr.height * 0.9, pw = ph * 1086 / 1018;
      const maxW = G.vw * (G.vw > 1800 ? 0.54 : 0.5); if (pw > maxW) { pw = maxW; ph = pw * 1018 / 1086; }
      G.w = pw; G.h = ph; G.x = G.vw * 0.26 - pw * HX; // голова слева, лицом к тексту
      G.y = sr.height - ph; // низ фото у низа блока и растворяется, как на первом экране
      tilt.style.left = G.x + 'px'; tilt.style.top = G.y + 'px'; tilt.style.width = pw + 'px'; tilt.style.height = ph + 'px';
    }
    G.R = G.mobile ? 58 : clamp(G.w * 0.095, 62, 90);
    // содержимое последней карточки слайдера — для «капли»
    X = F.exit && F.exit();
    if (X) {
      card = X.el;
      blobIn.innerHTML = `<div style="position:relative;width:${X.W}px;height:${X.H}px;--u:${X.W / 100}px">${X.el.querySelector('.card-flat').innerHTML}</div>`;
    }
    lastClip = ''; tiltKey = '';
  }

  // ---------- линза ----------
  const L = { x: 0, y: 0, tx: 0, ty: 0, r: 0, show: 0, user: false, t0: -1 };
  addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    if (e.pointerType === 'touch' || !arrived) return;
    const lx = e.clientX - G.x, ly = e.clientY - (G.top - scrollY + G.y);
    const on = onHead(lx, ly) && !e.target.closest('a,button,.hdr,.ab-facts');
    if (on !== onState) { onState = on; sec.classList.toggle('on-head', on); }
    if (on) { L.tx = lx; L.ty = ly; L.show = 1; if (!L.user) { L.user = true; } }
    else if (L.user) L.show = 0;
  }, { passive: true });
  let px = 0, py = 0, onState = false;
  function touch(e) {
    const t = e.touches[0], r = tilt.getBoundingClientRect();
    L.tx = t.clientX - r.left; L.ty = t.clientY - r.top; L.user = true; L.show = 1;
  }
  sec.addEventListener('touchstart', touch, { passive: true });
  sec.addEventListener('touchmove', touch, { passive: true });

  // ---------- появление и цифры ----------
  // всё запускается, когда блок полностью приехал (а не пока он выезжает из-под слайдера)
  let shown = false, countT = -1;
  function show(now) { if (shown) return; shown = true; sec.classList.add('in'); countT = now; }
  // ушли обратно в слайдер — сбрасываем, чтобы при следующем приезде анимации проиграли снова
  function reset() {
    if (!shown) return; shown = false; countT = -1; sec.classList.remove('in');
    nums.forEach((b) => (b.textContent = '0' + b.dataset.suf));
  }
  // цифры досчитывают лесенкой — после того, как над каждой прорисовалась линия (задержки как в about.css)
  function counts(now) {
    if (countT < 0) return;
    let done = true;
    nums.forEach((b, i) => {
      const t = reduce ? 1 : clamp((now - countT - 700 - i * 140) / 1300, 0, 1), e = 1 - Math.pow(1 - t, 3);
      if (t < 1) done = false;
      const v = Math.round(+b.dataset.n * e) + b.dataset.suf; if (b.textContent !== v) b.textContent = v;
    });
    if (done) countT = -1;
  }
  nums.forEach((b) => (b.textContent = '0' + b.dataset.suf));

  // ---------- кадр ----------
  let arrived = false, lastClip = '', tiltKey = '', ry = 0, rx = 0, riseKey = '', lastY = -1, lastMove = 0, dir = 0, snapT = 0;
  function frame(now) {
    const y = scrollY;
    counts(now);
    if (!X) return;
    const span = Math.max(1, G.top - X.end);
    const k = clamp((y - X.end) / span, 0, 1);
    const top = G.top - y; // верх блока на экране
    if (y !== lastY) { dir = y > lastY ? 1 : -1; lastY = y; lastMove = now; }
    // «приехал» — с запасом: при масштабе экрана в Windows прокрутка может не дойти до конца на долю пикселя
    const landed = k >= 0.985 || top <= 2;

    // голова поднимается снизу и проявляется, пока «капля» летит к лицу
    const rise = reduce ? 1 : ease(clamp((k - 0.2) / 0.65, 0, 1));
    const rk = rise.toFixed(3);
    if (rk !== riseKey) { riseKey = rk; photo.style.transform = `translate3d(0,${((1 - rise) * 70).toFixed(1)}px,0) scaleX(-1)`; photo.style.opacity = rk; }

    // остановились посреди перехода — мягко доводим: дальше в блок или назад к слайдеру
    const lenis = F.lenis;
    if (lenis && !reduce && k > 0.02 && !landed && now - lastMove > 200 && now - snapT > 1300) {
      snapT = now;
      lenis.scrollTo(k > 0.5 || dir > 0 && k > 0.3 ? G.top : X.end, { duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) });
    }

    // переход: карточка → круг → линза
    const blobWant = !reduce && k > 0 && !landed, wasBlob = blobOn;
    if (blobWant) {
      const es = ease(clamp(k * 1.2, 0, 1)), e = ease(k);
      const sx = X.x, sy = X.y - (y - X.end); // карточка уезжает вверх вместе со слайдером
      const tx = G.x + G.w * P0.x, ty = top + G.y + G.h * P0.y;
      const cx = lerp(sx, tx, e), cy = lerp(sy, ty, e);
      const w = lerp(X.W, G.R * 2, es), h = lerp(X.H, G.R * 2, es), rad = lerp(X.rad, G.R, es);
      blob.style.width = w.toFixed(1) + 'px'; blob.style.height = h.toFixed(1) + 'px'; blob.style.borderRadius = rad.toFixed(1) + 'px';
      blob.style.transform = `translate3d(${(cx - w / 2).toFixed(1)}px,${(cy - h / 2).toFixed(1)}px,0)`;
      blobIn.style.opacity = (1 - clamp(es / 0.42, 0, 1)).toFixed(2);
      blobIn.style.transform = `scale(${Math.max(w / X.W, h / X.H).toFixed(4)}) translate(-50%,-50%)`;
      blobBg.style.opacity = (1 - clamp((es - 0.45) / 0.4, 0, 1)).toFixed(2);
      blob.style.setProperty('--rg', clamp((es - 0.5) / 0.4, 0, 1).toFixed(2));
    }
    if (blobWant !== blobOn) {
      blobOn = blobWant; blob.style.visibility = blobWant ? 'visible' : 'hidden';
      card && card.classList.toggle('ab-gone', blobWant);
    }

    // блок «приехал»: линза живёт, пока он на экране
    const nowArrived = landed && top > -G.secH * 0.6;
    if (k < 0.35 && top > G.vh * 0.5) reset();
    if (nowArrived !== arrived) {
      arrived = nowArrived;
      if (arrived) {
        // линза появляется ровно там, где села «капля», и проезжает по лицу
        if (!L.user) { L.x = L.tx = G.w * P0.x; L.y = L.ty = G.h * P0.y; L.t0 = now; }
        if (wasBlob) L.r = G.R; // «капля» уже стала кольцом нужного размера
        L.show = 1;
        show(now);
      } else { sec.classList.remove('on-head'); onState = false; }
    }
    const near = top < G.vh && top > -G.secH;
    if (!near && L.r < 0.5) return;

    if (arrived && !L.user) {
      const t = reduce ? 1 : clamp((now - L.t0) / 2200, 0, 1), e = ease(t);
      L.tx = G.w * lerp(P0.x, P1.x, e); L.ty = G.h * lerp(P0.y, P1.y, e);
      if (!fine && t >= 1) { const tt = (now - L.t0) / 1000; L.tx = G.w * (P1.x + Math.sin(tt * 0.5) * 0.1); L.ty = G.h * (0.34 + Math.sin(tt * 0.8) * 0.08); }
      L.x = L.tx; L.y = L.ty;
    } else { L.x = lerp(L.x, L.tx, 0.5); L.y = lerp(L.y, L.ty, 0.5); }
    const fadeOut = 1 - clamp(-top / (G.secH * 0.4), 0, 1);
    L.r = lerp(L.r, arrived ? G.R * L.show * fadeOut : 0, 0.16); if (L.r < 0.3) L.r = 0;
    const clip = `circle(${L.r.toFixed(1)}px at ${(G.w - L.x).toFixed(1)}px ${L.y.toFixed(1)}px)`; // фото отражено — x зеркалим
    if (clip !== lastClip) {
      layer.style.clipPath = clip; lastClip = clip;
      ring.style.width = ring.style.height = (L.r * 2).toFixed(1) + 'px';
      lens.style.opacity = L.r > 2 ? 1 : 0;
      lens.style.transform = `translate3d(${L.x.toFixed(1)}px,${L.y.toFixed(1)}px,0)`;
    }

    // лёгкий наклон головы за курсором (только мышь)
    if (fine && !reduce && !G.mobile && near) {
      const dx = clamp((px - (G.x + G.w / 2)) / (G.vw / 2), -1, 1), dy = clamp((py - (top + G.y + G.h / 2)) / G.vh, -1, 1);
      ry = lerp(ry, dx * 5, 0.06); rx = lerp(rx, -dy * 3, 0.06);
      const key = `perspective(1400px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
      if (key !== tiltKey) { tilt.style.transform = key; tiltKey = key; }
    }
  }

  return { frame, measure, top: () => G.top };
}
