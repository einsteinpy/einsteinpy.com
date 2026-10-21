(function(){
  // theme: the initial value is set in <head> (no flash); the toggle overrides it for this visitor
  const root = document.documentElement;
  document.getElementById('theme').onclick = () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', root.dataset.theme); } catch(e){}
  };


  const navEl = document.getElementById('main-menu'), menuBtn = document.getElementById('menu');
  if (menuBtn) menuBtn.onclick = () => { const o = navEl.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); };

  document.querySelectorAll('.copy').forEach(b => b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'copied'; }
    catch(e){ b.textContent = 'select & copy'; }
    setTimeout(() => b.textContent = 'copy', 1500);
  });

  // render the symbolic output with KaTeX; fall back to raw TeX if it can't load
  function renderMath(){
    document.querySelectorAll('.tex[data-tex]').forEach(el => {
      try { katex.render(el.dataset.tex, el, {displayMode: !el.parentElement.classList.contains('check'), throwOnError: false}); }
      catch(e){ el.textContent = el.dataset.tex; }
    });
  }
  if (document.querySelector('.tex[data-tex]')) {
  const kjs = document.createElement('script');
  kjs.src = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js';
  kjs.onload = renderMath;
  kjs.onerror = () => document.querySelectorAll('.tex[data-tex]').forEach(el => el.textContent = el.dataset.tex);
  document.head.appendChild(kjs);
  }

  // ---- hero: periapsis precession of a timelike Schwarzschild orbit (G = c = M = 1) ----
  // Binet form of the geodesic equation:  u'' + u = 1/h^2 + 3u^2,  u = 1/r, integrated in phi with RK4.
  // The 3u^2 term is the relativistic correction: it makes the ellipse rotate (periapsis advance).
  (function(){
    const cv = document.getElementById('space'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = 900, H = 738, CX = W/2, CY = H/2, S = 11;               // S: pixels per unit of M
    cv.width = W; cv.height = H;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const L2 = 26, f = u => 1/L2 - u + 3*u*u;                        // h^2 = 26 M^2
    const MONO = '12px "JetBrains Mono", ui-monospace, monospace';

    let u = 1/18, du = 0, phi = 0;                                      // start at periapsis, r = 18M
    const trail = [], peri = [{phi: 0, r: 18}];
    let advance = null;                                                 // measured periapsis advance per orbit (rad)

    function step(h){
      const k1u = du, k1d = f(u), k2u = du + h/2*k1d, k2d = f(u + h/2*k1u);
      const k3u = du + h/2*k2d, k3d = f(u + h/2*k2u), k4u = du + h*k3d, k4d = f(u + h*k3u);
      const dPrev = du;
      u += h/6*(k1u + 2*k2u + 2*k3u + k4u); du += h/6*(k1d + 2*k2d + 2*k3d + k4d); phi += h;
      if (dPrev > 0 && du <= 0 && phi > 1){                             // u at a maximum -> periapsis
        peri.push({phi, r: 1/u});
        if (peri.length > 7) peri.shift();
        const n = peri.length;
        advance = (peri[n-1].phi - peri[n-2].phi) - 2*Math.PI;
        const tag = document.querySelector('.stage .tag');
        if (tag) tag.textContent = `Schwarzschild geodesic · periapsis advance ≈ ${(advance*180/Math.PI).toFixed(1)}° per orbit`;
      }
      const r = 1/u;
      trail.push([CX + r*S*Math.cos(phi), CY - r*S*Math.sin(phi)]);
      if (trail.length > 3700) trail.shift();
    }

    const pt = (r, a) => [CX + r*S*Math.cos(a), CY - r*S*Math.sin(a)];
    function draw(){
      ctx.fillStyle = '#01020a'; ctx.fillRect(0, 0, W, H);
      // reference polar grid
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(148,163,200,.10)';
      for (const r of [10, 20, 30]){ ctx.beginPath(); ctx.arc(CX, CY, r*S, 0, 7); ctx.stroke(); }
      for (let a = 0; a < 12; a++){ const [x, y] = pt(33, a*Math.PI/6); ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(x, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(148,163,200,.45)'; ctx.font = MONO;
      for (const r of [10, 20, 30]) ctx.fillText(r + ' M', CX + r*S + 6, CY - 6);

      // periapsis rays: where the ellipse points, one per orbit; older ones fade
      peri.forEach((p, i) => {
        const age = (peri.length - 1 - i), a = Math.max(.15, 1 - age*.2);
        const [x, y] = pt(p.r, p.phi);
        ctx.setLineDash(i === peri.length - 1 ? [] : [4, 5]);
        ctx.strokeStyle = `rgba(255,184,107,${a*.75})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(...pt(p.r + 5, p.phi)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(255,184,107,${a})`; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 7); ctx.fill();
      });
      // advance angle between the two most recent periapses
      if (peri.length >= 2){
        const p0 = peri[peri.length-2], p1 = peri[peri.length-1];
        const a0 = p0.phi % (2*Math.PI), a1 = a0 + advance;
        ctx.strokeStyle = 'rgba(255,184,107,.9)'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(CX, CY, 84, -a1, -a0); ctx.stroke();
        ctx.fillStyle = '#ffb86b'; ctx.font = MONO;
        const mid = a0 + advance/2, [tx, ty] = [CX + 104*Math.cos(mid), CY - 104*Math.sin(mid)];
        ctx.fillText('Δφ', tx - 8, ty + 4);
      }

      // trail: older -> fainter
      for (let i = 1; i < trail.length; i++){
        const k = i/trail.length;
        ctx.strokeStyle = `rgba(${Math.round(110 + 60*k)},${Math.round(150 + 90*k)},${Math.round(255 - 30*k)},${.08 + .87*k*k})`;
        ctx.lineWidth = .8 + 1.6*k;
        ctx.beginPath(); ctx.moveTo(trail[i-1][0], trail[i-1][1]); ctx.lineTo(trail[i][0], trail[i][1]); ctx.stroke();
      }
      // central mass: event horizon r = 2M, with the ISCO (6M) for scale
      ctx.setLineDash([2, 5]); ctx.strokeStyle = 'rgba(148,163,200,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(CX, CY, 6*S, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(148,163,200,.55)'; ctx.font = MONO; ctx.fillText('ISCO 6M', CX + 6*S*0.72 + 4, CY + 6*S*0.72 + 12);
      ctx.fillStyle = '#000'; ctx.strokeStyle = 'rgba(200,210,255,.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(CX, CY, 2*S, 0, 7); ctx.fill(); ctx.stroke();
      // orbiting body
      if (trail.length){
        const [x, y] = trail[trail.length-1];
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#7c8cff'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      }
    }

    if (reduce){ for (let i = 0; i < 2000 && phi < 6.2*2*Math.PI; i++) step(0.012); draw(); }
    else (function tick(){ for (let k = 0; k < 3; k++) step(0.012); draw(); requestAnimationFrame(tick); })();
  })();
})();
