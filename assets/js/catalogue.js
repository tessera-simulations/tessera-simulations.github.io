/* Tessera run catalogue viewer: filter, sort, pivot and plot the suite table client-side. */
(function () {
  'use strict';

  const root = document.getElementById('catalogue');
  if (!root) return;
  const DATA_URL = root.dataset.src;
  const LAYERS_URL = root.dataset.layers;
  const PAGE = 50;

  const STATUS_COLOURS = {
    'not selected': '#d6dce7', 'selected': '#b4c0d6', 'ics': '#c9b7e8', 'started': '#f2b84b',
    'completed': '#a9dcf7', 'structure': '#6fc0ee', 'trees': '#3fa9e6', 'masks': '#2d7fd6',
    'galaxies': '#0a2a7a',
  };
  const DEFAULT_COLS = ['parent_idx', 'label', 'status', 'Omega_m', 'Omega_b', 'h', 'n_s', 'sigma_8',
    'w_0', 'w_a', 'target_percentile', 'log10_1p_delta', 'n_highres', 'walltime_h', 'shark_layers', 'seds_layers'];
  const PRESETS = [
    ['All design points', ''],
    ['Selected regions', 'status != "not selected"'],
    ['Zooms with trees and masks', 'masks'],
    ['All galaxy layers complete', 'n_layers > 0 and seds_layers == n_layers'],
    ['Not yet run', 'status == "selected" or status == "ics"'],
    ['Started, not finished', 'status == "started"'],
    ['Ω_m > 0.3', 'Omega_m > 0.3'],
    ['Near ΛCDM dark energy', 'abs(w_0 + 1) < 0.15 and abs(w_a) < 0.3'],
    ['Dense regions (> 90th percentile)', 'target_percentile > 90'],
    ['Underdense regions (< 10th percentile)', 'target_percentile < 10'],
  ];

  let meta, cols, rows, names, colIndex, layersData = null;
  let state = { q: '', sort: 'parent_idx', dir: 1, page: 0, visible: new Set(DEFAULT_COLS), view: 'table', statuses: new Set() };
  let filtered = [];

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
  const set = (el, ...kids) => { el.replaceChildren(); for (const kid of kids.flat(Infinity)) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); return el; };
  const fmtInt = n => n.toLocaleString('en-GB');
  function fmt(v, type) {
    if (v == null) return '–';
    if (type === 'bool') return v ? '✓' : '–';
    if (type === 'int') return fmtInt(v);
    if (type === 'float') {
      if (Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0)) return v.toExponential(3);
      return String(parseFloat(v.toPrecision(5)));
    }
    return String(v);
  }
  const colOf = n => cols[colIndex[n]];
  const labelOf = n => (colOf(n) || {}).label || n;

  function compileQuery(src) {
    let s = (src || '').trim();
    if (!s) return () => true;
    s = s.replace(/\band\b/gi, '&&').replace(/\bor\b/gi, '||').replace(/\bnot\b/gi, '!')
      .replace(/(^|[^=!<>])=(?!=)/g, '$1==');
    const fn = new Function('abs', 'log10', 'sqrt', 'min', 'max', ...names, 'return (' + s + ');');
    const M = Math;
    return row => fn(M.abs, M.log10, M.sqrt, M.min, M.max, ...row);
  }

  function applyFilter() {
    const err = root.querySelector('.cat-error');
    err.textContent = '';
    let pred;
    try { pred = compileQuery(state.q); }
    catch (e) { err.textContent = 'Query not understood: ' + e.message; filtered = []; return; }
    const si = colIndex.status;
    const out = [];
    for (const r of rows) {
      if (state.statuses.size && !state.statuses.has(r[si])) continue;
      let ok;
      try { ok = pred(r); } catch (e) { ok = false; }
      if (ok) out.push(r);
    }
    filtered = out;
    sortRows();
  }

  function sortRows() {
    const i = colIndex[state.sort], d = state.dir;
    const type = cols[i].type;
    filtered.sort((a, b) => {
      const x = a[i], y = b[i];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      if (type === 'str') return d * String(x).localeCompare(String(y));
      return d * (x < y ? -1 : x > y ? 1 : 0);
    });
  }

  function writeUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.statuses.size) p.set('status', [...state.statuses].join(','));
    if (state.view !== 'table') p.set('view', state.view);
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }
  function readUrl() {
    const p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    if (p.get('status')) state.statuses = new Set(p.get('status').split(','));
    if (p.get('view')) state.view = p.get('view');
    state.row = p.get('row');
  }

  // ---------- rendering ----------
  function render() {
    root.querySelector('.cat-count').textContent = `${fmtInt(filtered.length)} of ${fmtInt(rows.length)} design points`;
    root.querySelectorAll('.cat-tab').forEach(b => b.setAttribute('aria-selected', b.dataset.view === state.view));
    root.querySelectorAll('.cat-view').forEach(v => v.hidden = v.dataset.view !== state.view);
    if (state.view === 'table') renderTable();
    else if (state.view === 'pivot') renderPivot();
    else renderPlot();
    writeUrl();
  }

  function renderTable() {
    const wrap = root.querySelector('.cat-table-wrap');
    const vis = cols.filter(c => state.visible.has(c.name));
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
    state.page = Math.min(state.page, pages - 1);
    const slice = filtered.slice(state.page * PAGE, (state.page + 1) * PAGE);
    const thead = h('tr', null, vis.map(c => {
      const active = c.name === state.sort;
      return h('th', {
        class: (c.type === 'str' ? '' : 'num ') + (active ? 'sorted' : ''), title: c.label + (c.unit ? ' [' + c.unit + ']' : ''),
        onclick: () => { if (active) state.dir = -state.dir; else { state.sort = c.name; state.dir = 1; } state.page = 0; sortRows(); render(); }
      }, c.label, active ? h('span', { class: 'arrow' }, state.dir > 0 ? ' ▲' : ' ▼') : null);
    }));
    const tbody = slice.map(r => h('tr', { onclick: () => openDetail(r), tabindex: 0, onkeydown: e => { if (e.key === 'Enter') openDetail(r); } },
      vis.map(c => {
        const v = r[colIndex[c.name]];
        if (c.name === 'status') return h('td', null, statusTag(v));
        return h('td', { class: c.type === 'str' ? '' : 'num' }, fmt(v, c.type));
      })));
    set(wrap, h('table', { class: 'cat-table' }, h('thead', null, thead), h('tbody', null, tbody)));
    const pg = root.querySelector('.cat-pager');
    set(pg, 
      h('button', { class: 'cat-btn', disabled: state.page === 0, onclick: () => { state.page--; render(); } }, 'Previous'),
      h('span', null, `Page ${state.page + 1} of ${pages}`),
      h('button', { class: 'cat-btn', disabled: state.page >= pages - 1, onclick: () => { state.page++; render(); } }, 'Next'),
    );
  }

  function statusTag(v) {
    const s = h('span', { class: 'cat-status' }, h('i', { style: 'background:' + (STATUS_COLOURS[v] || '#999') }), v);
    return s;
  }

  // ---------- pivot ----------
  function keysFor(name, data, bins) {
    const i = colIndex[name], c = cols[i];
    if (c.type === 'str' || c.type === 'bool') {
      let vals = [...new Set(data.map(r => r[i]))];
      if (name === 'status') vals.sort((a, b) => meta.status_order.indexOf(a) - meta.status_order.indexOf(b));
      else vals.sort();
      return { keyOf: r => r[i] == null ? '(none)' : String(r[i]), keys: vals.map(v => v == null ? '(none)' : String(v)) };
    }
    const vals = data.map(r => r[i]).filter(v => v != null);
    const distinct = [...new Set(vals)].sort((a, b) => a - b);
    if (distinct.length <= 12) {
      return { keyOf: r => r[i] == null ? '(none)' : String(r[i]), keys: distinct.map(String).concat(vals.length < data.length ? ['(none)'] : []) };
    }
    const lo = Math.min(...vals), hi = Math.max(...vals), w = (hi - lo) / bins || 1;
    const edges = Array.from({ length: bins + 1 }, (_, k) => lo + k * w);
    const lab = k => `${fmt(edges[k], 'float')} – ${fmt(edges[k + 1], 'float')}`;
    const keys = Array.from({ length: bins }, (_, k) => lab(k));
    if (vals.length < data.length) keys.push('(none)');
    return { keyOf: r => { const v = r[i]; if (v == null) return '(none)'; const k = Math.min(bins - 1, Math.floor((v - lo) / w)); return lab(k); }, keys };
  }

  function renderPivot() {
    const view = root.querySelector('.cat-view[data-view=pivot]');
    const rf = view.querySelector('[name=prow]').value, cf = view.querySelector('[name=pcol]').value;
    const agg = view.querySelector('[name=pagg]').value, vf = view.querySelector('[name=pval]').value;
    const bins = Math.max(2, Math.min(20, parseInt(view.querySelector('[name=pbins]').value, 10) || 6));
    const R = keysFor(rf, filtered, bins), C = cf === '(none)' ? null : keysFor(cf, filtered, bins);
    const vi = colIndex[vf];
    const cells = new Map();
    const push = (k, r) => { if (!cells.has(k)) cells.set(k, []); cells.get(k).push(r); };
    for (const r of filtered) {
      const rk = R.keyOf(r), ck = C ? C.keyOf(r) : 'all';
      push(rk + '\u0000' + ck, r); push(rk + '\u0000\u0001', r); push('\u0001\u0000' + ck, r); push('\u0001\u0000\u0001', r);
    }
    const reduce = list => {
      if (!list) return null;
      if (agg === 'count') return list.length;
      const v = list.map(r => r[vi]).filter(x => x != null);
      if (!v.length) return null;
      if (agg === 'sum') return v.reduce((a, b) => a + b, 0);
      if (agg === 'mean') return v.reduce((a, b) => a + b, 0) / v.length;
      if (agg === 'min') return Math.min(...v);
      if (agg === 'max') return Math.max(...v);
      if (agg === 'median') { const s = v.slice().sort((a, b) => a - b); return s[(s.length - 1) >> 1]; }
      return null;
    };
    const ckeys = C ? C.keys : ['all'];
    const vtype = agg === 'count' ? 'int' : colOf(vf).type;
    let maxv = 0;
    const grid = R.keys.map(rk => ckeys.map(ck => { const v = reduce(cells.get(rk + '\u0000' + ck)); if (v != null) maxv = Math.max(maxv, Math.abs(v)); return v; }));
    const cell = (v, total) => h('td', { class: 'num' + (total ? ' total' : ''), style: (!total && v != null && maxv > 0) ? `background: rgba(30,73,201,${(0.05 + 0.4 * Math.abs(v) / maxv).toFixed(2)})` : '' }, fmt(v, vtype));
    const table = h('table', { class: 'cat-table cat-pivot' },
      h('thead', null, h('tr', null, h('th', null, labelOf(rf) + (C ? ' \\ ' + labelOf(cf) : '')), ckeys.map(k => h('th', { class: 'num' }, k)), h('th', { class: 'num' }, 'Total'))),
      h('tbody', null,
        R.keys.map((rk, a) => h('tr', null, h('th', null, rk), grid[a].map(v => cell(v, false)), cell(reduce(cells.get(rk + '\u0000\u0001')), true))),
        h('tr', { class: 'total' }, h('th', null, 'Total'), ckeys.map(ck => cell(reduce(cells.get('\u0001\u0000' + ck)), true)), cell(reduce(cells.get('\u0001\u0000\u0001')), true))));
    set(view.querySelector('.cat-pivot-out'), table);
  }

  // ---------- plot ----------
  function niceTicks(lo, hi, n) {
    const span = hi - lo || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || mag * 10;
    const out = [];
    for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(parseFloat(t.toPrecision(10)));
    return out;
  }
  let plotPts = [];
  function renderPlot() {
    const view = root.querySelector('.cat-view[data-view=plot]');
    const xf = view.querySelector('[name=px]').value, yf = view.querySelector('[name=py]').value;
    const canvas = view.querySelector('canvas');
    const xi = colIndex[xf], yi = colIndex[yf], si = colIndex.status;
    const pts = filtered.filter(r => r[xi] != null && r[yi] != null);
    const W = canvas.clientWidth || 900, H = Math.round(W * 0.58), dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    const m = { l: 64, r: 16, t: 14, b: 48 };
    if (!pts.length) { ctx.fillStyle = '#5d6b83'; ctx.font = '14px sans-serif'; ctx.fillText('No rows to plot.', m.l, 40); plotPts = []; return; }
    let xlo = Infinity, xhi = -Infinity, ylo = Infinity, yhi = -Infinity;
    for (const r of pts) { xlo = Math.min(xlo, r[xi]); xhi = Math.max(xhi, r[xi]); ylo = Math.min(ylo, r[yi]); yhi = Math.max(yhi, r[yi]); }
    const padx = (xhi - xlo || 1) * 0.04, pady = (yhi - ylo || 1) * 0.04;
    xlo -= padx; xhi += padx; ylo -= pady; yhi += pady;
    const X = v => m.l + (v - xlo) / (xhi - xlo) * (W - m.l - m.r);
    const Y = v => H - m.b - (v - ylo) / (yhi - ylo) * (H - m.t - m.b);
    ctx.strokeStyle = '#e3e8f0'; ctx.lineWidth = 1; ctx.fillStyle = '#5d6b83'; ctx.font = '12px "Instrument Sans", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const t of niceTicks(xlo, xhi, 8)) { ctx.beginPath(); ctx.moveTo(X(t), m.t); ctx.lineTo(X(t), H - m.b); ctx.stroke(); ctx.fillText(fmt(t, 'float'), X(t), H - m.b + 6); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const t of niceTicks(ylo, yhi, 6)) { ctx.beginPath(); ctx.moveTo(m.l, Y(t)); ctx.lineTo(W - m.r, Y(t)); ctx.stroke(); ctx.fillText(fmt(t, 'float'), m.l - 8, Y(t)); }
    ctx.strokeStyle = '#d6dce7'; ctx.strokeRect(m.l, m.t, W - m.l - m.r, H - m.t - m.b);
    ctx.fillStyle = '#0f1e38'; ctx.font = '600 13px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(labelOf(xf) + (colOf(xf).unit ? ' [' + colOf(xf).unit + ']' : ''), (m.l + W - m.r) / 2, H - 4);
    ctx.save(); ctx.translate(14, (m.t + H - m.b) / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'top'; ctx.fillText(labelOf(yf) + (colOf(yf).unit ? ' [' + colOf(yf).unit + ']' : ''), 0, 0); ctx.restore();
    // draw low-status first so completed runs sit on top
    const order = meta.status_order;
    const sorted = pts.slice().sort((a, b) => order.indexOf(a[si]) - order.indexOf(b[si]));
    plotPts = [];
    const rad = pts.length > 3000 ? 2.2 : 3;
    for (const r of sorted) {
      const x = X(r[xi]), y = Y(r[yi]);
      ctx.fillStyle = STATUS_COLOURS[r[si]] || '#999';
      ctx.globalAlpha = r[si] === 'not selected' ? 0.55 : 0.85;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, 2 * Math.PI); ctx.fill();
      plotPts.push([x, y, r]);
    }
    ctx.globalAlpha = 1;
    const legend = view.querySelector('.cat-legend');
    const present = new Set(pts.map(r => r[si]));
    set(legend, order.filter(s => present.has(s)).map(s => h('span', null, h('i', { style: 'background:' + STATUS_COLOURS[s] }), s)));
    view.querySelector('.cat-plot-note').textContent = `${fmtInt(pts.length)} points. Click a point to open its record.`;
  }
  function nearestPoint(ev) {
    const canvas = ev.currentTarget, rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    let best = null, bd = 64;
    for (const [px, py, r] of plotPts) { const d = (px - x) ** 2 + (py - y) ** 2; if (d < bd) { bd = d; best = r; } }
    return best;
  }

  // ---------- detail ----------
  async function openDetail(r) {
    const dlg = root.querySelector('dialog');
    const pid = r[colIndex.parent_idx];
    const p = new URLSearchParams(location.search); p.set('row', pid);
    history.replaceState(null, '', location.pathname + '?' + p.toString());
    dlg.addEventListener('close', () => { const q = new URLSearchParams(location.search); q.delete('row'); const qs = q.toString(); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); }, { once: true });
    const body = dlg.querySelector('.cat-detail');
    const groups = {};
    cols.forEach((c, i) => { (groups[c.group] = groups[c.group] || []).push([c, r[i]]); });
    set(body, 
      h('h2', null, r[colIndex.label] || `Design row ${pid}`),
      h('p', { class: 'cat-detail-status' }, statusTag(r[colIndex.status]), ' ', h('span', { class: 'muted' }, `parent ${pid}, block ${r[colIndex.block]}`)),
      Object.entries(groups).map(([g, items]) => h('section', null, h('h3', null, g),
        h('dl', null, items.map(([c, v]) => h('div', null, h('dt', null, c.label, c.unit ? h('span', { class: 'muted' }, ' ' + c.unit) : null), h('dd', null, fmt(v, c.type))))))),
      h('section', { class: 'cat-layers' }, h('h3', null, 'galaxy layers'), h('p', { class: 'muted' }, 'Loading…')),
    );
    dlg.showModal();
    try {
      if (!layersData) layersData = await (await fetch(LAYERS_URL)).json();
      const L = layersData.layers[String(pid)];
      const sec = body.querySelector('.cat-layers');
      if (!L || !L.length) { set(sec, h('h3', null, 'galaxy layers'), h('p', { class: 'muted' }, 'No galaxy-formation layers staged for this region.')); return; }
      const names = layersData.names;
      set(sec, h('h3', null, 'galaxy layers'),
        h('p', { class: 'muted' }, 'Each layer is a SHARK run on the same merger trees with a different galaxy-formation parameter row, followed by Synthesizer photometry.'),
        h('div', { class: 'table-wrap' }, h('table', { class: 'cat-table' },
          h('thead', null, h('tr', null, h('th', null, 'Layer'), h('th', null, 'Model'), h('th', null, 'SHARK'), h('th', null, 'SEDs'), names.map(n => h('th', { class: 'num' }, n.replace('shark_', ''))))),
          h('tbody', null, L.map(l => h('tr', null, h('td', null, l.layer), h('td', null, l.model || '–'), h('td', null, l.sfh ? '✓' : '–'), h('td', null, l.seds ? '✓' : '–'),
            (l.params || names.map(() => null)).map(v => h('td', { class: 'num' }, fmt(v, 'float')))))))));
    } catch (e) {
      body.querySelector('.cat-layers p').textContent = 'Could not load the layer table.';
    }
  }

  // ---------- download ----------
  function downloadCsv() {
    const esc = v => v == null ? '' : (typeof v === 'string' && /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : String(v));
    const lines = [cols.map(c => c.name).join(',')].concat(filtered.map(r => r.map(esc).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `tessera_${meta.suite}_catalogue.csv` });
    document.body.append(a); a.click(); a.remove();
  }

  // ---------- build UI ----------
  function build() {
    const fieldOptions = (pred, selected) => cols.filter(pred).map(c => h('option', { value: c.name, selected: c.name === selected }, c.label));
    const numeric = c => c.type === 'float' || c.type === 'int';

    const summary = h('div', { class: 'cat-summary' },
      [['Design points', meta.n_rows], ['Regions selected', meta.n_selected],
       ['Zooms with trees and masks', rows.filter(r => r[colIndex.masks]).length],
       ['All galaxy layers complete', rows.filter(r => r[colIndex.n_layers] > 0 && r[colIndex.seds_layers] === r[colIndex.n_layers]).length]]
        .map(([k, v]) => h('div', { class: 'cat-stat' }, h('div', { class: 'num' }, fmtInt(v)), h('div', { class: 'lab' }, k))));

    const qInput = h('input', { type: 'text', name: 'q', value: state.q, spellcheck: 'false', autocomplete: 'off',
      placeholder: 'e.g. Omega_m > 0.3 and status == "galaxies"' });
    const presets = h('select', { 'aria-label': 'Preset filters', onchange: e => { qInput.value = e.target.value; state.q = e.target.value; state.page = 0; applyFilter(); render(); e.target.selectedIndex = 0; } },
      h('option', { value: '' }, 'Presets…'), PRESETS.map(([k, v]) => h('option', { value: v }, k)));
    const form = h('form', { class: 'cat-query', onsubmit: e => { e.preventDefault(); state.q = qInput.value; state.page = 0; applyFilter(); render(); } },
      h('label', { for: 'cat-q' }, 'Filter'), qInput, h('button', { class: 'cat-btn primary', type: 'submit' }, 'Apply'), presets);
    qInput.id = 'cat-q';

    const chips = h('div', { class: 'cat-chips' }, h('span', { class: 'muted' }, 'Status'), meta.status_order.filter(s => meta.status_counts[s]).map(s => {
      const b = h('button', { type: 'button', class: 'cat-chip', 'aria-pressed': state.statuses.has(s),
        onclick: () => { if (state.statuses.has(s)) state.statuses.delete(s); else state.statuses.add(s); b.setAttribute('aria-pressed', state.statuses.has(s)); state.page = 0; applyFilter(); render(); } },
        h('i', { style: 'background:' + STATUS_COLOURS[s] }), s, ' ', h('small', null, fmtInt(meta.status_counts[s])));
      return b;
    }));

    const colPanel = h('details', { class: 'cat-cols' }, h('summary', null, 'Columns'),
      h('div', { class: 'cat-cols-grid' }, [...new Set(cols.map(c => c.group))].map(g => h('fieldset', null, h('legend', null, g),
        cols.filter(c => c.group === g).map(c => h('input', { type: 'checkbox', checked: state.visible.has(c.name),
          onchange: e => { if (e.target.checked) state.visible.add(c.name); else state.visible.delete(c.name); render(); } })).map((inp, k) => h('label', null, inp, ' ', cols.filter(c => c.group === g)[k].label))))));

    const toolbar = h('div', { class: 'cat-toolbar' },
      h('span', { class: 'cat-count' }), h('span', { class: 'cat-error', role: 'alert' }),
      h('span', { class: 'spacer' }),
      h('button', { class: 'cat-btn', type: 'button', onclick: downloadCsv }, 'Download CSV'), colPanel);

    const tabs = h('div', { class: 'cat-tabs', role: 'tablist' }, ['table', 'pivot', 'plot'].map(v =>
      h('button', { class: 'cat-tab', role: 'tab', 'data-view': v, type: 'button', onclick: () => { state.view = v; render(); } }, v[0].toUpperCase() + v.slice(1))));

    const tableView = h('div', { class: 'cat-view', 'data-view': 'table' }, h('div', { class: 'cat-table-wrap table-wrap' }), h('div', { class: 'cat-pager' }));

    const rerender = () => render();
    const pivotView = h('div', { class: 'cat-view', 'data-view': 'pivot' },
      h('div', { class: 'cat-controls' },
        h('label', null, 'Rows ', h('select', { name: 'prow', onchange: rerender }, fieldOptions(c => c.name !== 'label', 'status'))),
        h('label', null, 'Columns ', h('select', { name: 'pcol', onchange: rerender }, h('option', { value: '(none)' }, '(none)'), fieldOptions(c => c.name !== 'label', 'seds_layers'))),
        h('label', null, 'Value ', h('select', { name: 'pagg', onchange: rerender }, ['count', 'mean', 'median', 'sum', 'min', 'max'].map(a => h('option', { value: a }, a)))),
        h('label', null, 'of ', h('select', { name: 'pval', onchange: rerender }, fieldOptions(numeric, 'walltime_h'))),
        h('label', null, 'Bins ', h('input', { type: 'number', name: 'pbins', value: 6, min: 2, max: 20, onchange: rerender }))),
      h('p', { class: 'muted small' }, 'Numeric fields with more than twelve distinct values are binned equally over the filtered range. Cells are shaded by value.'),
      h('div', { class: 'cat-pivot-out table-wrap' }));

    const canvas = h('canvas', { class: 'cat-canvas', onclick: e => { const r = nearestPoint(e); if (r) openDetail(r); },
      onmousemove: e => { const r = nearestPoint(e); e.currentTarget.title = r ? `${r[colIndex.label] || 'row ' + r[colIndex.parent_idx]} (${r[colIndex.status]})` : ''; } });
    const plotView = h('div', { class: 'cat-view', 'data-view': 'plot' },
      h('div', { class: 'cat-controls' },
        h('label', null, 'x ', h('select', { name: 'px', onchange: rerender }, fieldOptions(numeric, 'Omega_m'))),
        h('label', null, 'y ', h('select', { name: 'py', onchange: rerender }, fieldOptions(numeric, 'sigma_8'))),
        h('span', { class: 'cat-legend' })),
      canvas, h('p', { class: 'muted small cat-plot-note' }));

    const dlg = h('dialog', { class: 'cat-dialog' }, h('button', { class: 'cat-btn cat-close', type: 'button', onclick: () => dlg.close() }, 'Close'), h('div', { class: 'cat-detail' }));
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

    set(root, summary, form, chips, toolbar, tabs, tableView, pivotView, plotView, dlg,
      h('p', { class: 'muted small' }, `Catalogue generated ${new Date(meta.generated_utc).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} from the ${meta.suite} suite files and the run directories on COSMA. Status is inferred from the files present on disk.`));
    window.addEventListener('resize', () => { if (state.view === 'plot') renderPlot(); });
  }

  // ---------- load ----------
  fetch(DATA_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => {
    meta = d.meta; cols = d.columns; rows = d.rows;
    colIndex = {}; cols.forEach((c, i) => colIndex[c.name] = i);
    names = cols.map(c => c.name);
    readUrl();
    build();
    applyFilter();
    render();
    if (state.row != null) { const r = rows[parseInt(state.row, 10)]; if (r) openDetail(r); }
  }).catch(e => {
    set(root, h('p', { class: 'cat-error' }, 'The catalogue could not be loaded (' + e.message + ').'));
  });
})();
