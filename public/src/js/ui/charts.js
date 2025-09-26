/* =============================================================================
   Ethics Testbed — charts.js (ESM, zero dependencies)
   Lightweight SVG renderers:
     - renderBars(host, data, opts)            // horizontal bar chart
     - renderGroupedBars(host, groups, opts)   // grouped bars by series
     - renderRadar(host, axes, valueMap, opts) // radar/spider for module weights
   All charts are responsive via ResizeObserver and re-render on container resize.
   ============================================================================= */

'use strict'

/* -------------------------- Small SVG helpers --------------------------- */
const NS = 'http://www.w3.org/2000/svg'
const createEl = (name, attrs = {}) => {
  const el = document.createElementNS(NS, name)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
  return el
}

const clear = el => {
  if (!el) return
  let node = el.firstChild
  while (node) {
    const next = node.nextSibling
    el.removeChild(node)
    node = next
  }
}

const clamp01 = x => Math.max(0, Math.min(1, x))
const fmt = n => (typeof n === 'number' ? (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(3)).replace(/\.?0+$/, '') : String(n))

/* --------------------------- Resize handling ---------------------------- */
const ro = new ResizeObserver(entries => {
  for (const e of entries) {
    const host = e.target
    const r = host.__chartRenderFn
    if (typeof r === 'function') r()
  }
})

/* --------------------------- Color palette ------------------------------ */
/* Uses CSS variables if present; falls back to sane defaults */
function colors () {
  const cs = getComputedStyle(document.documentElement)
  const jade = cs.getPropertyValue('--jade')?.trim() || '#00A86B'
  const ink = cs.getPropertyValue('--ink')?.trim() || '#0b1220'
  const fog = cs.getPropertyValue('--fog')?.trim() || '#f0f3f7'
  const muted = cs.getPropertyValue('--muted')?.trim() || '#6b7280'
  const seq = [
    jade, '#5B8DEF', '#F97316', '#10B981', '#EF4444', '#8B5CF6',
    '#22C55E', '#EAB308', '#06B6D4', '#EC4899'
  ]
  return { jade, ink, fog, muted, seq }
}

/* ------------------------ Text measurement cache ------------------------ */
const hiddenSvg = createEl('svg', { width: 0, height: 0, style: 'position:absolute;left:-9999px;top:-9999px' })
document.body.appendChild(hiddenSvg)
function textSize (text, font = '12px Inter, system-ui, sans-serif') {
  const t = createEl('text', { x: 0, y: 0 })
  t.style.font = font
  t.textContent = text
  hiddenSvg.appendChild(t)
  const bb = t.getBBox()
  hiddenSvg.removeChild(t)
  return { w: bb.width, h: bb.height }
}

/* ============================ Horizontal Bars =========================== */
/**
 * renderBars(host, data, opts?)
 * @param {HTMLElement} host
 * @param {[label:string, value:number][]} data - any order; values can be any real numbers
 * @param {object} opts
 *   - {number}   [pad=12]         : inner vertical gap
 *   - {number}   [barH=20]        : bar height
 *   - {number}   [axis=40]        : left axis width (label column)
 *   - {boolean}  [showValues=true]: show numeric value at right
 *   - {boolean}  [normalize=false]: if true, values are scaled by max(|v|)
 *   - {string}   [title]          : optional chart title
 */
export function renderBars (host, data, opts = {}) {
  if (!host) return
  const {
    pad = 12, barH = 20, axis = 40,
    showValues = true, normalize = false, title
  } = opts

  const { seq, muted, fog, ink } = colors()

  host.classList.add('chart-bars')
  if (!host.__observed) { ro.observe(host); host.__observed = true }

  host.__chartRenderFn = () => {
    const rect = host.getBoundingClientRect()
    const width = Math.max(220, rect.width || 220)
    const rows = data?.length || 0
    const hTitle = title ? (textSize(title).h + 8) : 0
    const height = hTitle + pad + rows * (barH + pad) + pad

    clear(host)
    const svg = createEl('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height })
    host.appendChild(svg)

    // Title
    if (title) {
      const t = createEl('text', { x: axis, y: hTitle - 4, fill: ink })
      t.style.font = '600 14px Inter, system-ui, sans-serif'
      t.textContent = title
      svg.appendChild(t)
    }

    // Value domain
    const vals = data.map(([, v]) => v)
    const absMax = Math.max(1e-9, ...vals.map(v => Math.abs(v)))
    const max = normalize ? absMax : Math.max(1e-9, ...vals)
    const min = normalize ? 0 : Math.min(0, ...vals)
    const innerW = width - axis - pad * 2
    const y0 = (i) => hTitle + pad + i * (barH + pad)

    // Grid baseline
    const baselineX = axis + pad + (min < 0 ? (-min / (max - min)) * innerW : 0)
    const grid = createEl('line', { x1: baselineX, y1: hTitle, x2: baselineX, y2: height - pad, stroke: fog, 'stroke-width': 1 })
    svg.appendChild(grid)

    data.forEach(([label, value], i) => {
      const y = y0(i)
      // label
      const tl = createEl('text', { x: axis - 6, y: y + barH * 0.7, fill: muted, 'text-anchor': 'end' })
      tl.style.font = '12px Inter, system-ui, sans-serif'
      tl.textContent = label
      svg.appendChild(tl)

      const v = value
      const nx = (x) => axis + pad + ((x - min) / (max - min)) * innerW
      const x1 = nx(Math.min(v, 0))
      const x2 = nx(Math.max(v, 0))
      const bar = createEl('rect', { x: x1, y, width: Math.max(1, x2 - x1), height: barH, rx: barH / 2, fill: seq[i % seq.length] })
      svg.appendChild(bar)

      if (showValues) {
        const tv = createEl('text', { x: x2 + 6, y: y + barH * 0.7, fill: muted })
        tv.style.font = '12px Inter, system-ui, sans-serif'
        tv.textContent = fmt(v)
        svg.appendChild(tv)
      }
    })
  }

  host.__chartRenderFn()
}

/* ============================== Grouped Bars ============================ */
/**
 * renderGroupedBars(host, groups, opts?)
 * @param {HTMLElement} host
 * @param {{label:string, series:[string, number][]}[]} groups
 *   Example:
 *     [
 *       {label:"Cons",  series:[["a1",0.8],["a2",0.4],["a3",0.6]]},
 *       {label:"Rawls", series:[["a1",0.3],["a2",0.7],["a3",0.5]]}
 *     ]
 * @param {object} opts
 *   - {number}  [pad=12]
 *   - {number}  [barW=16]
 *   - {number}  [gap=8]     // gap between series within a group
 *   - {number}  [axis=48]   // left axis width
 *   - {string}  [title]
 *   - {boolean} [normalized=true] // assume 0..1
 *   - {string[]} [seriesOrder]     // custom series order by label
 */
export function renderGroupedBars (host, groups, opts = {}) {
  if (!host) return
  const {
    pad = 12, barW = 16, gap = 8, axis = 48,
    title, normalized = true, seriesOrder
  } = opts
  const { seq, ink, muted, fog } = colors()

  host.classList.add('chart-grouped-bars')
  if (!host.__observed) { ro.observe(host); host.__observed = true }

  host.__chartRenderFn = () => {
    const rect = host.getBoundingClientRect()
    const width = Math.max(280, rect.width || 280)
    const hTitle = title ? (textSize(title).h + 8) : 0

    // Determine the set of series keys (actions) and consistent order
    const set = new Set()
    groups?.forEach(g => g.series.forEach(([s]) => set.add(s)))
    let keys = Array.from(set)
    if (Array.isArray(seriesOrder) && seriesOrder.length) {
      keys = seriesOrder.filter(k => set.has(k))
    }

    const groupH = barW + pad + 6 // bar + spacing + label
    const height = hTitle + pad + groups.length * (groupH) + pad + 8

    clear(host)
    const svg = createEl('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height })
    host.appendChild(svg)

    if (title) {
      const t = createEl('text', { x: axis, y: hTitle - 4, fill: ink })
      t.style.font = '600 14px Inter, system-ui, sans-serif'
      t.textContent = title
      svg.appendChild(t)
    }

    const innerW = width - axis - pad * 2

    // Grid backdrop
    ;[0, 0.25, 0.5, 0.75, 1].forEach(p => {
      const x = axis + pad + p * innerW
      const ln = createEl('line', { x1: x, y1: hTitle, x2: x, y2: height - pad, stroke: fog, 'stroke-width': 1 })
      svg.appendChild(ln)
      const tx = createEl('text', { x, y: height - 4, fill: muted, 'text-anchor': 'middle' })
      tx.style.font = '11px Inter, system-ui, sans-serif'
      tx.textContent = fmt(p)
      svg.appendChild(tx)
    })

    const y0 = i => hTitle + pad + i * (groupH)

    groups.forEach((g, gi) => {
      // Label
      const tl = createEl('text', { x: axis - 6, y: y0(gi) + barW * 0.75, fill: muted, 'text-anchor': 'end' })
      tl.style.font = '12px Inter, system-ui, sans-serif'
      tl.textContent = g.label
      svg.appendChild(tl)

      // Series bars
      const map = new Map(g.series)
      keys.forEach((k, si) => {
        const v = map.get(k) ?? 0
        const x = axis + pad
        const w = innerW * (normalized ? clamp01(v) : v)
        const y = y0(gi) + si * 0 // single row; color encodes series
        const r = createEl('rect', { x, y: y0(gi), width: Math.max(1, w), height: barW, rx: barW / 2, fill: seq[si % seq.length], opacity: 0.95 })
        svg.appendChild(r)
      })
    })

    // Legend (series keys)
    const legY = hTitle + 4
    let legX = width - pad - 8
    keys.slice().reverse().forEach((k) => {
      const label = k // action id; you may pass mapped labels from caller
      const size = textSize(label, '11px Inter, system-ui, sans-serif')
      legX -= size.w + 18
      const swatch = createEl('rect', { x: legX, y: legY - 10, width: 10, height: 10, rx: 2, fill: seq[(keys.indexOf(k)) % seq.length] })
      const tt = createEl('text', { x: legX + 14, y: legY - 1, fill: muted })
      tt.style.font = '11px Inter, system-ui, sans-serif'
      tt.textContent = label
      svg.appendChild(swatch)
      svg.appendChild(tt)
      legX -= 10
    })
  }

  host.__chartRenderFn()
}

/* ================================ Radar ================================== */
/**
 * renderRadar(host, axes, valueMap, opts?)
 * @param {HTMLElement} host
 * @param {string[]} axes e.g., ["Consequentialism","Rawls","Virtue"]
 * @param {Object} valueMap e.g., { Consequentialism:0.5, Rawls:0.25, Virtue:0.25 }
 * @param {object} opts
 *   - {number}  [levels=4]      : number of grid rings
 *   - {number}  [margin=10]     : outer margin
 *   - {string}  [title]
 *   - {boolean} [filled=true]   : fill the polygon
 */
export function renderRadar (host, axes, valueMap, opts = {}) {
  if (!host) return
  const { levels = 4, margin = 10, title, filled = true } = opts
  const { jade, seq, muted, ink, fog } = colors()

  host.classList.add('chart-radar')
  if (!host.__observed) { ro.observe(host); host.__observed = true }

  host.__chartRenderFn = () => {
    const rect = host.getBoundingClientRect()
    const size = Math.max(180, Math.min(rect.width || 240, 420))
    const hTitle = title ? (textSize(title).h + 6) : 0
    const W = size; const H = size + hTitle
    const cx = W / 2; const cy = hTitle + (H - hTitle) / 2
    const R = Math.min(W, H - hTitle) / 2 - margin

    clear(host)
    const svg = createEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H })
    host.appendChild(svg)

    if (title) {
      const t = createEl('text', { x: W / 2, y: hTitle - 2, fill: ink, 'text-anchor': 'middle' })
      t.style.font = '600 14px Inter, system-ui, sans-serif'
      t.textContent = title
      svg.appendChild(t)
    }

    const n = Math.max(3, axes.length)
    const angle = i => (-Math.PI / 2) + (i * 2 * Math.PI / n) // start at top
    const point = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]

    // Grid rings
    for (let l = 1; l <= levels; l++) {
      const r = (l / levels) * R
      const ring = axes.map((_, i) => point(i, r)).map(([x, y]) => `${x},${y}`).join(' ')
      const poly = createEl('polygon', { points: ring, fill: 'none', stroke: fog, 'stroke-width': 1 })
      svg.appendChild(poly)
    }

    // Axes lines + labels
    axes.forEach((name, i) => {
      const [x, y] = point(i, R)
      const ln = createEl('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: fog, 'stroke-width': 1 })
      svg.appendChild(ln)

      const labPad = 10
      const lx = cx + (R + labPad) * Math.cos(angle(i))
      const ly = cy + (R + labPad) * Math.sin(angle(i))
      const tt = createEl('text', { x: lx, y: ly, fill: muted, 'text-anchor': labelAnchor(lx, cx) })
      tt.style.font = '12px Inter, system-ui, sans-serif'
      tt.textContent = name
      svg.appendChild(tt)
    })

    // Data polygon
    const vals = axes.map(a => clamp01(valueMap[a] ?? 0))
    const pts = vals.map((v, i) => point(i, v * R)).map(([x, y]) => `${x},${y}`).join(' ')
    const polyFill = filled ? (seq[0]) : 'none'
    const polyOpacity = filled ? 0.15 : 0.0

    const region = createEl('polygon', { points: pts, fill: polyFill, 'fill-opacity': polyOpacity, stroke: seq[0], 'stroke-width': 2 })
    svg.appendChild(region)

    // Points
    vals.forEach((v, i) => {
      const [x, y] = point(i, v * R)
      const dot = createEl('circle', { cx: x, cy: y, r: 3, fill: seq[0], stroke: 'white', 'stroke-width': 1 })
      svg.appendChild(dot)
    })
  }

  host.__chartRenderFn()
}

function labelAnchor (x, cx) {
  const dx = x - cx
  if (Math.abs(dx) < 4) return 'middle'
  return dx < 0 ? 'end' : 'start'
}

/* ============================== Convenience ============================== */
/* These helpers are optional sugar to wire engine outputs quickly. */

/**
 * barsFromAggregate(host, aggregateMap, labeler?)
 * Renders a horizontal bar chart from Map<actionId, score>.
 */
export function barsFromAggregate (host, aggregateMap, labeler = (id) => id) {
  if (!aggregateMap) return
  const rows = [...aggregateMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, v]) => [labeler(id), v])
  renderBars(host, rows, { title: 'Aggregate score', showValues: true, normalize: false })
}

/**
 * groupedBarsFromModules(host, cons, rawls, virtue, labeler?)
 * Expects Maps over the same admissible action set, values already normalized (0..1).
 */
export function groupedBarsFromModules (host, cons, rawls, virtue, labeler = (id) => id) {
  const actions = Array.from(new Set([
    ...cons?.keys?.() ? cons.keys() : [],
    ...rawls?.keys?.() ? rawls.keys() : [],
    ...virtue?.keys?.() ? virtue.keys() : []
  ]))
  const seriesOrder = actions

  const toRow = (name, map) => ({
    label: name,
    series: actions.map(a => [labeler(a), map.get(a) ?? 0])
  })

  const groups = [
    toRow('Consequentialism', cons || new Map()),
    toRow('Rawls', rawls || new Map()),
    toRow('Virtue', virtue || new Map())
  ]

  renderGroupedBars(host, groups, { title: 'Module scores (normalized over A*)', seriesOrder, normalized: true })
}

/**
 * radarFromCredences(host, credences) — visualize credence weights
 */
export function radarFromCredences (host, credences) {
  const axes = ['Consequentialism', 'Rawls', 'Virtue']

  /* eslint-disable camelcase */
  const { p_cons = 0.5, p_rawls = 0.25, p_virtue = 0.25 } = credences || {}
  const pCons = p_cons
  const pRawls = p_rawls
  const pVirtue = p_virtue
  /* eslint-enable camelcase */

  const sum = (pCons + pRawls + pVirtue) || 1
  const values = {
    Consequentialism: pCons / sum,
    Rawls: pRawls / sum,
    Virtue: pVirtue / sum
  }
  renderRadar(host, axes, values, { title: 'Credence weights', levels: 4, filled: true })
}

/* ============================ Minimal Styles =============================
   You can copy these to site.css for nicer defaults; left as comments so this
   module stays JS-only.

.chart-bars, .chart-grouped-bars, .chart-radar { width: 100%; display:block; }
.chart-bars svg, .chart-grouped-bars svg, .chart-radar svg { display:block; width:100%; height:auto; }
@media (prefers-color-scheme: dark) {
  .chart-bars text, .chart-grouped-bars text, .chart-radar text { fill: var(--muted, #9aa4b2); }
}
============================================================================ */
