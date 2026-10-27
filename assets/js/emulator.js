/* Tessera emulators in the browser. Each <div class="emulator" data-src="..."> loads one distilled network
   (analysis/emulator/distil_site.py in the tessera repo): a small MLP from the parameters (and z) and log10 M to a
   distribution function or the quantiles of a relation. Its inputs are sliders; the curve is redrawn against the
   fiducial cosmology at every change. */
(function () {
  'use strict';

  // ---------- network ----------
  function prepare(em) {
    em.net.layers = em.net.layers.map(L => ({ W: Float64Array.from(L.W), b: Float64Array.from(L.b), nin: L.shape[0], nout: L.shape[1] }));
    return em;
  }
  const TRANSFORMS = { log10_1p: v => Math.log10(1 + v) };

  // outputs (rows x K) for raw input rows: the inputs in em.inputs order, then the coordinate
  function forward(em, rows) {
    const net = em.net, tf = em.inputs.map(p => TRANSFORMS[p.transform] || null), last = net.layers.length - 1;
    return rows.map(r => {
      let x = Float64Array.from(r, (v, i) => ((tf[i] ? tf[i](v) : v) - net.in_mu[i]) / net.in_sig[i]);
      net.layers.forEach((L, k) => {
        const y = Float64Array.from(L.b);
        for (let i = 0; i < L.nin; i++) {
          const xi = x[i], off = i * L.nout;
          for (let j = 0; j < L.nout; j++) y[j] += xi * L.W[off + j];
        }
        if (k < last) for (let j = 0; j < L.nout; j++) y[j] /= 1 + Math.exp(-y[j]);     // SiLU
        x = y;
      });
      return Array.from(x, (v, j) => v * net.out_sig[j] + net.out_mu[j]);
    });
  }

  const interp = (x, xs, ys) => {
    if (x <= xs[0]) return ys[0];
    for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
    return ys[ys.length - 1];
  };

  // the coordinate range at these input values: per snapshot redshift, linear between them
  function coordRange(em, values) {
    const c = em.coord, L = c.limits;
    if (!L) return [c.lo, c.hi];
    const v = values[em.inputs.findIndex(p => p.name === L.input)];
    return [interp(v, L.at, L.lo), interp(v, L.at, L.hi)];
  }

  // log10 curves on n points: {x, y} for a distribution, {x, y (median), lo, hi} for a relation, whose outputs are
  // the median log10 y and the log10 of its widths above (84-50%) and below (50-16%)
  function curve(em, values, n = 120) {
    const [a, b] = coordRange(em, values);
    const x = Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
    const out = forward(em, x.map(c => values.concat([c])));
    if (em.kind === 'distribution') return { x, y: out.map(o => o[0]) };
    return { x, y: out.map(o => o[0]), lo: out.map(o => o[0] - 10 ** o[2]), hi: out.map(o => o[0] + 10 ** o[1]) };
  }

  if (typeof module !== 'undefined') module.exports = { prepare, forward, coordRange, curve };
  if (typeof document === 'undefined') return;

  // ---------- helpers ----------
  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === 'class') el.className = attrs[k];
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'html') el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  };
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const pow10 = e => '10' + String(e).split('').map(c => SUP[c]).join('');
  const fmtVal = v => String(parseFloat(v.toPrecision(3)));
  const withUnit = (label, unit) => unit ? `${label} [${unit}]` : label;

  // ticks on a log10 axis: decades when it spans several, else 1-2-5 style steps labelled plainly
  function logTicks(lo, hi) {
    const out = [];
    if (hi - lo > 2.2) {
      const step = Math.ceil((hi - lo) / 7);
      for (let e = Math.ceil(lo / step) * step; e <= hi + 1e-9; e += step) out.push([e, pow10(e)]);
      return out;
    }
    for (let e = Math.floor(lo); e <= Math.ceil(hi); e++)
      for (const m of (hi - lo > 0.8 ? [1, 2, 5] : [1, 1.5, 2, 3, 4, 5, 6, 8])) {
        const t = e + Math.log10(m);
        if (t >= lo - 1e-9 && t <= hi + 1e-9) out.push([t, fmtVal(10 ** t)]);
      }
    return out;
  }
  function linTicks(lo, hi, n) {
    const span = hi - lo || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || mag * 10;
    const out = [];
    for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(parseFloat(t.toPrecision(10)));
    return out;
  }

  // ---------- plot ----------
  const COL = { cur: '#1e49c9', band: 'rgba(30,73,201,0.16)', fid: '#5d6b83', fidBand: 'rgba(93,107,131,0.12)',
    grid: '#e3e8f0', frame: '#d6dce7', text: '#5d6b83', ink: '#0f1e38' };

  function draw(canvas, em, cur, fid, view) {
    const W = canvas.clientWidth || 700, H = Math.round(Math.min(W * 0.75, 540)), dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
    const m = { l: 62, r: 12, t: 8, b: 26 }, gap = 10, hMain = Math.round((H - m.t - m.b - gap) * 0.7);
    const top = [m.t, m.t + hMain], bot = [m.t + hMain + gap, H - m.b];
    const [xlo, xhi] = view.x;
    const X = v => m.l + (v - xlo) / (xhi - xlo) * (W - m.l - m.r);
    const panelY = ([a, b], lo, hi) => v => b - (v - lo) / (hi - lo) * (b - a);

    // the current curve over the fiducial at the same z, on the current curve's points
    const ratio = cur.x.map((x, i) => 10 ** (cur.y[i] - interp(x, fid.x, fid.y)));
    const rmin = Math.min(...ratio), rmax = Math.max(...ratio);
    const half = Math.max(0.05, (rmax - rmin) / 2 * 1.15), mid = (rmax + rmin) / 2;
    const rlo = Math.min(mid - half, 0.97), rhi = Math.max(mid + half, 1.03);
    const Ym = panelY(top, view.y[0], view.y[1]), Yr = panelY(bot, rlo, rhi);

    ctx.lineWidth = 1; ctx.font = '12px "Instrument Sans", sans-serif'; ctx.fillStyle = COL.text;
    ctx.strokeStyle = COL.grid; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const [t, lab] of logTicks(xlo, xhi)) {
      for (const [a, b] of [top, bot]) { ctx.beginPath(); ctx.moveTo(X(t), a); ctx.lineTo(X(t), b); ctx.stroke(); }
      ctx.fillText(lab, X(t), bot[1] + 6);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const [t, lab] of logTicks(view.y[0], view.y[1])) { ctx.beginPath(); ctx.moveTo(m.l, Ym(t)); ctx.lineTo(W - m.r, Ym(t)); ctx.stroke(); ctx.fillText(lab, m.l - 7, Ym(t)); }
    for (const t of linTicks(rlo, rhi, 4)) { ctx.beginPath(); ctx.moveTo(m.l, Yr(t)); ctx.lineTo(W - m.r, Yr(t)); ctx.stroke(); ctx.fillText(fmtVal(t), m.l - 7, Yr(t)); }
    ctx.strokeStyle = COL.frame;
    for (const [a, b] of [top, bot]) ctx.strokeRect(m.l, a, W - m.l - m.r, b - a);

    const clip = ([a, b]) => { ctx.save(); ctx.beginPath(); ctx.rect(m.l, a, W - m.l - m.r, b - a); ctx.clip(); };
    const line = (xs, ys, Y, colour, width, dash) => {
      ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.setLineDash(dash || []); ctx.beginPath();
      xs.forEach((x, i) => (i ? ctx.lineTo(X(x), Y(ys[i])) : ctx.moveTo(X(x), Y(ys[i])))); ctx.stroke(); ctx.setLineDash([]);
    };
    clip(top);
    for (const [c, fill] of [[fid, COL.fidBand], [cur, COL.band]]) {
      if (!c.lo) continue;
      ctx.fillStyle = fill; ctx.beginPath();
      c.x.forEach((x, i) => (i ? ctx.lineTo(X(x), Ym(c.hi[i])) : ctx.moveTo(X(x), Ym(c.hi[i]))));
      for (let i = c.x.length - 1; i >= 0; i--) ctx.lineTo(X(c.x[i]), Ym(c.lo[i]));
      ctx.fill();
    }
    line(fid.x, fid.y, Ym, COL.fid, 1.5, [5, 4]);
    line(cur.x, cur.y, Ym, COL.cur, 2.2);
    ctx.restore();
    clip(bot);
    line([xlo, xhi], [1, 1], Yr, COL.fid, 1, [5, 4]);
    line(cur.x, ratio, Yr, COL.cur, 2);
    ctx.restore();
    ctx.fillStyle = COL.text; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(em.kind === 'relation' ? 'median / fiducial' : 'ratio to fiducial', m.l + 6, bot[0] + 4);
  }

  // fixed axes, so the curve moves rather than the frame: the coordinate over every redshift, the y range of the
  // fiducial at every snapshot redshift
  function axes(em, fidValues) {
    const c = em.coord, L = c.limits;
    const zi = L ? em.inputs.findIndex(p => p.name === L.input) : -1;
    let lo = Infinity, hi = -Infinity;
    for (const z of L ? L.at : [null]) {
      const v = fidValues.slice(); if (zi >= 0) v[zi] = z;
      const k = curve(em, v, 40);
      for (const arr of [k.y, k.lo, k.hi]) if (arr) for (const y of arr) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
    }
    const pad = em.kind === 'distribution' ? [1.0, 0.5] : [0.1, 0.1];
    return { x: [c.lo - 0.15, c.hi + 0.15], y: [lo - pad[0], hi + pad[1]] };
  }

  // ---------- widget ----------
  async function init(root) {
    let em;
    try { em = prepare(await (await fetch(root.dataset.src)).json()); }
    catch (e) { root.replaceChildren(h('p', { class: 'emu-error' }, 'Could not load the emulator.')); return; }

    const fidValues = em.inputs.map(p => p.fiducial), values = fidValues.slice();
    const zi = em.coord.limits ? em.inputs.findIndex(p => p.name === em.coord.limits.input) : -1;
    const view = axes(em, fidValues);
    const canvas = h('canvas', { class: 'emu-canvas', role: 'img', 'aria-label': `${em.name} emulator plot` });
    const shown = [];
    let fidCurve = null, fidKey = null, pending = false;

    function render() {
      pending = false;
      const fv = fidValues.slice(); if (zi >= 0) fv[zi] = values[zi];      // the fiducial cosmology at the same z
      if (fv.join() !== fidKey) { fidCurve = curve(em, fv); fidKey = fv.join(); }
      draw(canvas, em, curve(em, values), fidCurve, view);
      values.forEach((v, i) => { shown[i].textContent = fmtVal(v); });
    }
    const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(render); } };

    const sliders = em.inputs.map((p, i) => {
      const input = h('input', { type: 'range', min: p.lo, max: p.hi, step: (p.hi - p.lo) / 400, value: values[i], id: `emu-${em.name}-${p.name}` });
      input.addEventListener('input', () => { values[i] = parseFloat(input.value); schedule(); });
      shown[i] = h('output', { for: input.id });
      return h('div', { class: 'emu-slider' }, h('label', { for: input.id, html: p.label }), input, shown[i]);
    });
    const reset = h('button', { class: 'cat-btn', type: 'button', onclick: () => {
      fidValues.forEach((v, i) => { values[i] = v; sliders[i].querySelector('input').value = v; }); schedule();
    } }, 'Reset to fiducial');

    const V = em.validation, A = V.all;
    const what = em.kind === 'relation' ? 'its 16th, 50th and 84th percentiles agree' : 'the mass function agrees';
    const at = V.by_z ? ` at the ${V.by_z.length} snapshot redshifts it was trained on; between them the network interpolates in z` : '';
    const note = h('p', { class: 'emu-note' },
      `Distilled from the full Tessera emulator: at ${V.n_held_out} held-out parameter points ${what} with it to ` +
      `${A.rms.toFixed(4)} dex rms (99% within ${A.p99.toFixed(4)} dex, at worst ${A.max.toFixed(4)} dex)${at}. ` +
      'The sliders span the design box; the dashed curve is the fiducial (Planck 2018) cosmology.');

    root.replaceChildren(
      h('div', { class: 'emu-body' },
        h('div', { class: 'emu-controls' }, sliders, reset),
        h('div', { class: 'emu-plot' },
          h('div', { class: 'emu-ylabel', html: withUnit(em.y_label, em.y_unit) }), canvas,
          h('div', { class: 'emu-xlabel', html: withUnit(em.coord.label, em.coord.unit) }))),
      note);
    render();
    new ResizeObserver(schedule).observe(canvas);
  }

  document.querySelectorAll('.emulator[data-src]').forEach(init);
})();
