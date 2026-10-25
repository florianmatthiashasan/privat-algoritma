/** Deterministic, single item, uncapacitated. Zero initial/final net stock.
 * End-of-period holding/backlog charges; no variable production cost or lost sales.
 */
export function validateRows(rows, { allowBacklog = false } = {}) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 120) throw new Error('Dönem sayısı 1–120 olmalıdır.')
  for (const [i, row] of rows.entries()) {
    for (const field of ['demand', 'setup', 'holding', ...(allowBacklog ? ['backlog'] : [])]) {
      if (!Number.isFinite(row?.[field]) || row[field] < 0 || row[field] > 1e9) throw new Error(`${i + 1}. dönem: ${field} sonlu, 0–1.000.000.000 arasında olmalıdır.`)
    }
  }
}

export function planFromProduction(rows, production, options = {}) {
  validateRows(rows, options)
  if (production.length !== rows.length || production.some(x => !Number.isFinite(x) || x < 0)) throw new Error('Geçersiz üretim planı.')
  const unitCost = options.unitCost ?? 0
  if (!Number.isFinite(unitCost) || unitCost < 0 || unitCost > 1e9) throw new Error('Birim üretim maliyeti 0–1.000.000.000 arasında olmalıdır.')
  let net = 0; let setupCost = 0; let stockCost = 0; let backlogCost = 0
  const balanceTolerance = 64 * Number.EPSILON * Math.max(1, rows.reduce((sum, row) => sum + row.demand, 0))
  const stock = rows.map((row, t) => {
    net += production[t] - row.demand
    if (!options.allowBacklog && net < -balanceTolerance) throw new Error('Yok satmasız planda negatif stok oluştu.')
    if (production[t] > 0) setupCost += row.setup
    stockCost += Math.max(0, net) * row.holding
    backlogCost += Math.max(0, -net) * (row.backlog ?? 0)
    return net
  })
  // FOQ/EOQ may end with leftover stock by definition (fixed lot sizes).
  if (net < -balanceTolerance || (!options.allowEndStock && net > balanceTolerance)) throw new Error('Ufuk sonunda tüm talep karşılanmalı ve net stok sıfır olmalıdır.')
  return { production, stock, endStock: Math.max(0, net), inventory: stock.map(x => Math.max(0, x)), backlog: stock.map(x => Math.max(0, -x)), maxBacklog: Math.max(0, ...stock.map(x => -x)), backlogUnitPeriods: stock.reduce((sum, x) => sum + Math.max(0, -x), 0), productionCost: unitCost * production.reduce((a, b) => a + b, 0), grandTotal: setupCost + stockCost + backlogCost + unitCost * production.reduce((a, b) => a + b, 0), lots: production.flatMap((q, t) => q > 0 ? [[t, t]] : []), setupCost, stockCost, backlogCost, total: setupCost + stockCost + backlogCost }
}
const quantity = (rows, start, end) => rows.slice(start, end + 1).reduce((s, r) => s + r.demand, 0)
export function holdingCost(rows, start, end) {
  let rate = 0; let cost = 0
  for (let t = start + 1; t <= end; t++) { rate += rows[t - 1].holding; cost += rows[t].demand * rate }
  return cost
}
export function lotsToPlan(rows, lots, options = {}) {
  const production = Array(rows.length).fill(0)
  for (const [start, end] of lots) production[start] += quantity(rows, start, end)
  return { ...planFromProduction(rows, production, options), lots: lots.filter(([s, e]) => quantity(rows, s, e) > 0) }
}
export function l4l(rows, options = {}) {
  const plan = planFromProduction(rows, rows.map(r => r.demand), options)
  return options.trace ? { ...plan, trace: rows.map((r, t) => ({ period: t, explanation: 'Lot-for-Lot gelecekteki talepleri birleştirmez; yalnız bu dönemin talebini üretir.', candidates: [{ start: t, end: t, period: t, cost: r.demand > 0 ? r.setup : 0, score: r.demand, chosen: true }] })) } : plan
}
function sequential(rows, criterion, options = {}, kind = 'silver') {
  validateRows(rows)
  const lots = []; const trace = []; let start = 0
  while (start < rows.length) {
    if (rows[start].demand === 0) { start++; continue }
    let end = start; let units = rows[start].demand; let carry = 0; let cost = 0
    let previous = criterion(rows[start].setup, cost, units, 1)
    const candidates = [{ start, end, period: start, cost: rows[start].setup, score: previous, holding: 0, accepted: true }]
    while (end + 1 < rows.length) {
      carry += rows[end].holding
      const next = end + 1; const nextCost = cost + rows[next].demand * carry
      const score = criterion(rows[start].setup, nextCost, units + rows[next].demand, next - start + 1)
      const accepted = kind === 'ltc' ? nextCost <= rows[start].setup + 1e-10 : score <= previous + 1e-10
      if (options.trace) candidates.push({ start, end: next, period: start, cost: rows[start].setup + nextCost, score, holding: nextCost, accepted })
      if (!accepted) break
      previous = score; units += rows[next].demand; cost = nextCost; end = next
    }
    if (options.trace) trace.push({ period: start, explanation: kind === 'silver' ? 'Ortalama dönem maliyeti ilk yükselene kadar ileriye bakılır.' : kind === 'luc' ? 'Ortalama birim maliyeti ilk yükselene kadar ileriye bakılır.' : kind === 'ltc' ? 'Stok maliyeti hazırlık maliyetini aşan ilk aday dışarıda bırakılır.' : 'Stok maliyeti hazırlığa en yakın olan aday seçilir; eşitlikte daha uzun parti alınır.', candidates: candidates.map(c => ({ ...c, chosen: c.end === end })) })
    lots.push([start, end]); start = end + 1
  }
  const plan = lotsToPlan(rows, lots, options)
  return options.trace ? { ...plan, trace } : plan
}
// EOQ parameters: horizon averages of A, h and D; Q0 is rounded up (87.2 -> 88).
export function economicQuantity(rows) {
  const avg = field => rows.reduce((s, r) => s + r[field], 0) / rows.length
  const demand = avg('demand'); const holding = avg('holding')
  if (demand <= 0) return 0
  if (holding <= 0) return rows.reduce((s, r) => s + r.demand, 0)
  return Math.ceil(Math.sqrt(2 * avg('setup') * demand / holding) - 1e-9)
}
// Smallest 1-2-5 series value not below Q0 (88 -> 100).
export function roundLot(q) {
  if (q <= 0) return 0
  const scale = 10 ** Math.floor(Math.log10(q))
  return [1, 2, 5, 10].map(f => f * scale).find(x => x >= q - 1e-9 * scale)
}
function quantityRule(rows, options = {}, kind) {
  validateRows(rows)
  const q0 = economicQuantity(rows); const lot = kind === 'foq' ? options.fixedQuantity ?? roundLot(q0) : q0
  const tolerance = 64 * Number.EPSILON * Math.max(1, rows.reduce((s, r) => s + r.demand, 0))
  const production = []; const trace = []; let stock = 0
  for (let t = 0; t < rows.length; t++) {
    const need = rows[t].demand - stock; let q = 0
    if (need > tolerance) q = kind === 'foq' ? Math.ceil(need / lot - 1e-12) * lot : Math.max(lot, need)
    production.push(q); stock += q - rows[t].demand
    if (options.trace && q > 0) {
      let end = t; let rest = stock
      while (end + 1 < rows.length && rest >= rows[end + 1].demand - tolerance) { rest -= rows[end + 1].demand; end++ }
      trace.push({ period: t, explanation: kind === 'foq' ? `Stok ${t + 1}. dönemin talebini karşılamadığında sabit parti (${lot} adet) veya katları sipariş edilir.` : `Q₀ = √(2·Ā·D̄/h̄) = ${lot}. Stok yetmediğinde Q₀ sipariş edilir; Q₀ dönemin ihtiyacını karşılamıyorsa ihtiyaca yükseltilir.`, candidates: [{ start: t, end, period: t, cost: rows[t].setup, score: q, chosen: true }] })
    }
  }
  const plan = { ...planFromProduction(rows, production, { ...options, allowEndStock: true }), method: kind }
  return options.trace ? { ...plan, trace } : plan
}
export const fixedOrderQuantity = (rows, options = {}) => quantityRule(rows, options, 'foq')
export const economicOrderQuantity = (rows, options = {}) => quantityRule(rows, options, 'eoq')
function periodRule(rows, options = {}, kind) {
  validateRows(rows)
  const q0 = economicQuantity(rows); const mean = rows.reduce((s, r) => s + r.demand, 0) / rows.length
  const span = kind === 'fpq' ? options.fixedPeriods ?? 2 : Math.max(1, Math.round(mean > 0 ? q0 / mean : 1))
  const lots = []; const trace = []; let start = 0
  while (start < rows.length) {
    if (rows[start].demand === 0) { start++; continue }
    let end = Math.min(rows.length - 1, start + span - 1)
    const candidates = []
    if (kind === 'meoq') {
      let sum = 0; let best = Infinity; end = start
      for (let j = start; j < rows.length; j++) {
        sum += rows[j].demand; const gap = Math.abs(sum - q0)
        candidates.push({ start, end: j, period: start, cost: sum, score: gap })
        if (gap <= best + 1e-9) { best = gap; end = j } else if (sum > q0) break
      }
    } else candidates.push({ start, end, period: start, cost: rows.slice(start, end + 1).reduce((s, r) => s + r.demand, 0), score: end - start + 1 })
    if (options.trace) trace.push({ period: start, explanation: kind === 'meoq' ? `Q₀ = ${q0}. Ardışık dönem talepleri toplanır; toplamı Q₀’a en yakın olan parti seçilir. Aday maliyeti sütunu toplam talebi, kriter |toplam − Q₀| değerini gösterir.` : kind === 'fpq' ? `Her sipariş sabit ${span} dönemin net ihtiyacını karşılar.` : `Sipariş aralığı = round(Q₀ / ortalama talep) = round(${q0} / ${+mean.toFixed(2)}) = ${span} dönem.`, candidates: candidates.map(c => ({ ...c, chosen: c.end === end })) })
    lots.push([start, end]); start = end + 1
  }
  const plan = lotsToPlan(rows, lots, options)
  return options.trace ? { ...plan, trace } : plan
}
export const modifiedEOQ = (rows, options = {}) => periodRule(rows, options, 'meoq')
export const fixedPeriodQuantity = (rows, options = {}) => periodRule(rows, options, 'fpq')
export const periodOrderQuantity = (rows, options = {}) => periodRule(rows, options, 'poq')
export const silverMeal = (rows, options = {}) => sequential(rows, (k, h, q, n) => (k + h) / n, options, 'silver')
export const leastUnitCost = (rows, options = {}) => sequential(rows, (k, h, q) => (k + h) / q, options, 'luc')
export const ppb = (rows, options = {}) => sequential(rows, (k, h) => Math.abs(k - h), options, 'ppb')
export const leastTotalCost = (rows, options = {}) => sequential(rows, (k, h) => h, options, 'ltc')

function context(rows, options = {}) {
  validateRows(rows, options)
  const n = rows.length; const demand = [0]; const h = [0]; const b = [0]
  for (const row of rows) { demand.push(demand.at(-1) + row.demand); h.push(h.at(-1) + row.holding); b.push(b.at(-1) + (row.backlog ?? 0)) }
  const transport = Array.from({ length: n }, (_, p) => rows.map((_, t) => p <= t ? h[t] - h[p] : options.allowBacklog ? b[p] - b[t] : Infinity))
  const prefix = transport.map(costs => {
    const result = [0]
    // Forbidden assignments are excluded by block(); avoid Infinity - Infinity.
    for (let t = 0; t < n; t++) result.push(result.at(-1) + (Number.isFinite(costs[t]) ? costs[t] * rows[t].demand : 0))
    return result
  })
  const cache = Array.from({ length: n }, () => [])
  const block = (start, end) => {
    if (cache[start][end]) return cache[start][end]
    if (demand[end + 1] === demand[start]) return { start, end, period: start, cost: 0 }
    let best = { start, end, period: start, cost: Infinity }
    const last = options.allowBacklog ? end : start
    for (let p = start; p <= last; p++) {
      const cost = rows[p].setup + prefix[p][end + 1] - prefix[p][start]
      if (cost < best.cost) best = { start, end, period: p, cost }
    }
    cache[start][end] = best
    return best
  }
  const events = []
  const toPlan = blocks => {
    const production = Array(n).fill(0)
    for (const { start, end, period } of blocks) production[period] += demand[end + 1] - demand[start]
    return { ...planFromProduction(rows, production, options), blocks, ...(options.trace ? { trace: [...events] } : {}) }
  }
  return { n, demand, transport, block, toPlan, events, tracing: options.trace }
}
// Interval shortest path. Backlog mode minimizes each interval over its
// production period (Zangwill recurrence).
function intervalDP(rows, options, window = Infinity) {
  const ctx = context(rows, options); const dp = Array(ctx.n + 1).fill(Infinity); const previous = Array(ctx.n + 1)
  const trace = []
  dp[0] = 0
  for (let end = 0; end < ctx.n; end++) {
    const candidates = []
    for (let start = Math.max(0, end - window + 1); start <= end; start++) {
      const block = ctx.block(start, end); const candidate = dp[start] + block.cost
      if (options.trace) candidates.push({ ...block, intervalCost: block.cost, prefixCost: dp[start], cost: candidate, score: candidate })
      if (candidate < dp[end + 1]) { dp[end + 1] = candidate; previous[end + 1] = block }
    }
    if (options.trace) trace.push({ period: end, explanation: 'Bu değerlendirme ilk ' + (end + 1) + ' dönemin alt problemini çözer; nihai üretim planı bütün ufuk hesaplandıktan sonra geriye izlenir. ' + (options.allowBacklog ? 'Her aralıkta yok satma ve stok maliyetleri dikkate alınarak en iyi üretim dönemi seçilir.' : 'Her aday, son partinin başlangıç dönemini temsil eder.'), candidates: candidates.map(c => ({ ...c, chosen: c.start === previous[end + 1].start })) })
  }
  const blocks = []; let end = ctx.n
  while (end > 0) { const block = previous[end]; blocks.unshift(block); end = block.start }
  const plan = ctx.toPlan(blocks)
  return options.trace ? { ...plan, trace } : plan
}
export const wagnerWhitin = (rows, options = {}) => intervalDP(rows, options)
export const windowSearch = (rows, options = {}) => intervalDP(rows, options, 6)
function mergeBlocks(ctx) {
  const blocks = Array.from({ length: ctx.n }, (_, t) => ctx.block(t, t))
  while (blocks.length > 1) {
    let saving = 1e-9; let index = -1; let merged
    const candidates = []
    for (let i = 0; i < blocks.length - 1; i++) {
      const candidate = ctx.block(blocks[i].start, blocks[i + 1].end)
      const delta = blocks[i].cost + blocks[i + 1].cost - candidate.cost
      if (ctx.tracing) candidates.push({ ...candidate, score: delta, cost: candidate.cost, index: i })
      if (delta > saving) { saving = delta; index = i; merged = candidate }
    }
    if (ctx.tracing) ctx.events.push({ period: index < 0 ? 0 : merged.period, explanation: index < 0 ? 'Pozitif tasarruf kalmadı; birleştirme durdu.' : 'Komşu partiler arasında en büyük pozitif tasarruf seçildi. Skor tasarruftur; büyük değer daha iyidir.', candidates: candidates.map(c => ({ ...c, chosen: c.index === index })) })
    if (index < 0) break
    blocks.splice(index, 2, merged)
  }
  return blocks
}
export function savingsMerge(rows, options = {}) { const ctx = context(rows, options); return ctx.toPlan(mergeBlocks(ctx)) }
/** Bounded add/drop/adjacent-shift search. No exact reference is used. */
export function localSearch(rows, options = {}) {
  const ctx = context(rows, options)
  const evaluate = periods => {
    const production = Array(ctx.n).fill(0)
    for (let t = 0; t < ctx.n; t++) {
      if (rows[t].demand === 0) continue
      let selected = -1; let cost = Infinity
      for (const p of periods) if (ctx.transport[p][t] < cost) { selected = p; cost = ctx.transport[p][t] }
      if (selected < 0) return null
      production[selected] += rows[t].demand
    }
    return planFromProduction(rows, production, options)
  }
  let best = ctx.toPlan(mergeBlocks(ctx)); let moves = 0
  for (; moves < 8; moves++) {
    const active = best.production.flatMap((q, p) => q > 0 ? [p] : [])
    let improved = best
    const candidates = []; let winner = -1
    const consider = periods => { const plan = evaluate(periods); if (ctx.tracing && plan) candidates.push({ period: periods[0] ?? 0, start: 0, end: ctx.n - 1, score: plan.total, cost: plan.total, periods: [...periods].sort((a, b) => a - b) }); if (plan && plan.total < improved.total - 1e-8) { improved = plan; winner = candidates.length - 1 } }
    for (let p = 0; p < ctx.n; p++) if (!active.includes(p)) consider([...active, p])
    for (const p of active) {
      const rest = active.filter(x => x !== p); consider(rest)
      if (p > 0) consider([...new Set([...rest, p - 1])])
      if (p + 1 < ctx.n) consider([...new Set([...rest, p + 1])])
    }
    if (ctx.tracing) ctx.events.push({ period: 0, explanation: 'Yerel hamle ' + (moves + 1) + ': üretim dönemi ekleme, silme ve komşuya kaydırma adayları karşılaştırılır. Küçük maliyet iyidir; yalnız iyileştiren hamle kabul edilir.', candidates: candidates.map((c, i) => ({ ...c, chosen: i === winner })) })
    if (improved === best) break
    best = improved
  }
  return { ...best, moves, ...(options.trace ? { trace: ctx.events } : {}) }
}
export const methods = [
  { id: 'l4l', name: 'Lot-for-Lot', short: 'L4L', description: 'Her talebi kendi döneminde karşılayan temel plan.' },
  { id: 'foq', name: 'Sabit sipariş miktarı', short: 'FOQ', description: 'Stok yetmediğinde sabit parti veya katları sipariş edilir; parti, Q₀’ı aşan ilk yuvarlak sayıdır (1-2-5 serisi).', endStock: true },
  { id: 'eoq', name: 'Ekonomik sipariş miktarı', short: 'EOQ', description: 'Ortalama A, h ve D ile Q₀ = √(2AD/h) sipariş edilir; yetmezse ihtiyaca yükseltilir.', endStock: true },
  { id: 'meoq', name: 'Değiştirilmiş EOQ', short: 'MEOQ', description: 'Toplamı Q₀’a en yakın ardışık dönem talepleri birlikte sipariş edilir.' },
  { id: 'fpq', name: 'Sabit dönem miktarı', short: 'FPQ', description: 'Her sipariş sabit sayıda (2) dönemin talebini karşılar.' },
  { id: 'poq', name: 'Dönemsel sipariş miktarı', short: 'POQ', description: 'Sipariş aralığı round(Q₀ / ortalama talep) dönemdir.' },
  { id: 'silver', name: 'Silver-Meal', short: 'SM', description: 'İlk artışa kadar dönem başına maliyeti azaltır.' },
  { id: 'luc', name: 'Least Unit Cost', short: 'LUC', description: 'İlk artışa kadar birim başına maliyeti azaltır.' },
  { id: 'ww', name: 'Kesin dinamik programlama', short: 'OPT', description: 'Yok satmasız Wagner–Whitin; yok satmalı aralık DP.' },
  { id: 'ppb', name: 'Part-Period Balancing', short: 'PPB', description: 'Stok maliyetini hazırlığa en yakın yapan partiyi seçer.'  },
  { id: 'ltc', name: 'Least Total Cost', short: 'LTC', description: 'Stok maliyeti hazırlığı aşmadan önceki partiyi seçer.'  },
  { id: 'merge', name: 'Tasarruflu birleştirme', short: 'TB', description: 'En çok maliyet azaltan komşu partileri birleştirir.', extended: true },
  { id: 'local', name: 'Ekle–sil–kaydır', short: 'ESK', description: 'Birleştirme planını en fazla 8 yerel hamleyle iyileştirir.', extended: true },
  { id: 'window', name: 'Sınırlı aralık araması', short: 'SA6', description: 'En fazla 6 dönemlik partiler arasında en ucuz planı arar.', extended: true },
]
export const solver = { foq: fixedOrderQuantity, eoq: economicOrderQuantity, meoq: modifiedEOQ, fpq: fixedPeriodQuantity, poq: periodOrderQuantity, l4l, silver: silverMeal, luc: leastUnitCost, ww: wagnerWhitin, ppb, ltc: leastTotalCost, merge: savingsMerge, local: localSearch, window: windowSearch }

export const MODEL_VERSION = 'thesis-v2.1.0'
export const classicMethods = ['l4l', 'foq', 'eoq', 'meoq', 'fpq', 'poq', 'luc', 'ltc', 'ppb', 'silver']
export const endStockMethods = new Set(methods.filter(m => m.endStock).map(m => m.id))
export const referenceName = allowBacklog => allowBacklog ? 'Zangwill aralık DP' : 'Wagner–Whitin'
export function methodRole(id, allowBacklog) {
  if (id === 'ww') return { label: 'Kesin referans', kind: 'exact' }
  if (allowBacklog && classicMethods.includes(id)) return { label: 'Yok satmasız temel plan', kind: 'baseline' }
  return { label: 'Sezgisel', kind: 'heuristic' }
}
