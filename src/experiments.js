import { methods, solver, MODEL_VERSION, methodRole, endStockMethods } from './lotSizing.js'

export const DESIGN_VERSION = 'balanced-factorial-v2'
export const families = [{ id: 'low', name: 'Düşük değişkenlik (CV 0,2)' }, { id: 'high', name: 'Yüksek değişkenlik (CV 1)' }]
export const design = { horizons: [8, 24, 48], cvs: [0.2, 1], setupRatios: [0.5, 1, 2, 4, 8], backlogRatios: [0.25, 1, 4], meanDemand: 100, holding: 1 }
export const defaultConfig = { count: 300, seed: 20261018, repetitions: 5, unitCost: 0 }
export function randomSource(seed) {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function checkConfig(config) {
  const result = { ...defaultConfig, ...config }
  if (!Number.isInteger(result.count) || result.count < 1 || result.count > 3000) throw new Error('Problem sayısı 1–3000 arasında bir tamsayı olmalıdır.')
  if (!Number.isInteger(result.seed) || result.seed < 0 || result.seed > 0xffffffff) throw new Error('Tohum 0–4294967295 arasında bir tamsayı olmalıdır.')
  if (!Number.isInteger(result.repetitions) || result.repetitions < 1 || result.repetitions > 30) throw new Error('Süre tekrarı 1–30 arasında bir tamsayı olmalıdır.')
  if (!Number.isFinite(result.unitCost) || result.unitCost < 0 || result.unitCost > 1e9) throw new Error('Sabit birim üretim maliyeti 0–1.000.000.000 arasında olmalıdır.')
  return result
}
// Marsaglia–Tsang gamma sampler, shape >= 1; Box–Muller standard normal.
export function gammaSample(shape, scale, rand) {
  const d = shape - 1 / 3; const c = 1 / Math.sqrt(9 * d)
  while (true) {
    const x = Math.sqrt(-2 * Math.log(Math.max(Number.MIN_VALUE, rand()))) * Math.cos(2 * Math.PI * rand())
    const root = 1 + c * x
    if (root <= 0) continue
    const v = root ** 3; const u = Math.max(Number.MIN_VALUE, rand())
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return scale * d * v
  }
}
export function generateProblems(config = {}) {
  const { count, seed } = checkConfig(config); const rand = randomSource(seed)
  return Array.from({ length: count }, (_, i) => {
    const cell = i % 30; const repeat = Math.floor(i / 30)
    const periods = design.horizons[Math.floor(cell / 10)]
    const cvIndex = Math.floor((cell % 10) / 5); const cvTarget = design.cvs[cvIndex]
    const setupScale = design.setupRatios[cell % 5]
    const backlogRatio = design.backlogRatios[(repeat + cell) % 3]
    const rows = Array.from({ length: periods }, () => ({ demand: Math.round(gammaSample(1 / cvTarget ** 2, design.meanDemand * cvTarget ** 2, rand)), setup: setupScale * design.meanDemand * design.holding, holding: design.holding, backlog: backlogRatio * design.holding }))
    if (rows.every(r => r.demand === 0)) rows[0].demand = design.meanDemand
    const average = rows.reduce((s, r) => s + r.demand, 0) / periods
    const cvObserved = Math.sqrt(rows.reduce((s, r) => s + (r.demand - average) ** 2, 0) / periods) / average
    return { id: `P${String(i + 1).padStart(4, '0')}`, cellId: `C${String(cell + 1).padStart(2, '0')}`, repeat: repeat + 1, family: families[cvIndex].id, periods, cvTarget, cvObserved, meanObserved: average, setupScale, backlogRatio, rows }
  })
}
export function groupRecords(records) {
  const groups = new Map()
  for (const record of records) { const key = record.cellId ? `${record.cellId}${record.backlogRatio !== undefined ? '/b=' + record.backlogRatio : ''}` : record.family ?? 'all'; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(record) }
  return [...groups.values()]
}
export function relativeGap(cost, optimum) {
  if (!Number.isFinite(cost) || !Number.isFinite(optimum) || cost < 0 || optimum < 0) throw new Error('Sonlu ve negatif olmayan maliyetler gerekir.')
  if (optimum === 0) return cost === 0 ? 0 : null
  if (Math.abs(cost - optimum) <= 1e-9 * Math.max(1, optimum)) return 0
  return 100 * (cost - optimum) / optimum
}

// Independently recompute balance and charges; do not trust a solver's totals.
export function auditPlan(rows, plan, allowBacklog, optimum = null) {
  const issues = []; let stock = 0; let total = 0
  const tolerance = 64 * Number.EPSILON * Math.max(1, rows.reduce((s, r) => s + r.demand, 0))
  if (!Array.isArray(plan.production) || plan.production.length !== rows.length || plan.stock?.length !== rows.length) return ['Plan uzunluğu geçersiz.']
  for (let t = 0; t < rows.length; t++) {
    const q = plan.production[t]; const row = rows[t]
    if (!Number.isFinite(q) || q < 0) issues.push('Üretim geçersiz.')
    stock += q - row.demand
    if (!allowBacklog && stock < -tolerance) issues.push('Yok satma yasağı ihlal edildi.')
    if (!Number.isFinite(plan.stock[t]) || Math.abs(stock - plan.stock[t]) > tolerance) issues.push('Stok dengesi tutarsız.')
    total += (q > 0 ? row.setup : 0) + Math.max(stock, 0) * row.holding + Math.max(-stock, 0) * row.backlog
  }
  // Only FOQ/EOQ may end with leftover stock (fixed lot sizes); every method must meet all demand.
  if (stock < -tolerance || (!endStockMethods.has(plan.method) && stock > tolerance)) issues.push('Son stok sıfır değil.')
  const costTolerance = 1e-7 * Math.max(1, Math.abs(total))
  if (!Number.isFinite(plan.total) || Math.abs(total - plan.total) > costTolerance) issues.push('Toplam maliyet tutarsız.')
  if ([plan.setupCost, plan.stockCost, plan.backlogCost].some(x => !Number.isFinite(x) || x < 0) || Math.abs(plan.total - plan.setupCost - plan.stockCost - plan.backlogCost) > costTolerance) issues.push('Maliyet bileşenleri tutarsız.')
  if (optimum !== null && plan.total < optimum - costTolerance) issues.push('Kesin referanstan düşük maliyet: algoritmaları inceleyin.')
  return [...new Set(issues)]
}
export function quantile(values, p) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b); const i = (sorted.length - 1) * p; const low = Math.floor(i)
  return sorted[low] + (sorted[Math.ceil(i)] - sorted[low]) * (i - low)
}
const mean = values => values.reduce((a, b) => a + b, 0) / values.length

// Resample within demand families to preserve the benchmark's fixed strata.
export function bootstrapMeanCI(records, seed = 729, draws = 1000) {
  if (!records.length) return [null, null]
  const groups = groupRecords(records).map(group => group.map(r => r.gap))
  // A single-observation stratum has no resampling variance; a zero-width CI would be spurious.
  if (groups.some(group => group.length < 2)) return [null, null]
  const rand = randomSource(seed); const means = []
  for (let k = 0; k < draws; k++) {
    let total = 0; let n = 0
    for (const group of groups) for (let j = 0; j < group.length; j++) { total += group[Math.floor(rand() * group.length)]; n++ }
    means.push(total / n)
  }
  return [quantile(means, 0.025), quantile(means, 0.975)]
}
export function summarize(records, { confidence = true } = {}) {
  const summaries = []
  for (const mode of ['noBacklog', 'backlog']) for (const method of methods) {
    const all = records.filter(r => r.mode === mode && r.method === method.id)
    if (!all.length) continue
    const valid = all.filter(r => r.issues.length === 0 && r.gap !== null)
    const gaps = valid.map(r => r.gap); const average = gaps.length ? mean(gaps) : null
    summaries.push({ mode, method: method.id, count: all.length, validCount: valid.length, failures: all.length - valid.length,
      meanCost: valid.length ? mean(valid.map(r => r.total)) : null, meanGrandTotal: valid.length ? mean(valid.map(r => r.grandTotal ?? r.total)) : null,
      meanGap: average, medianGap: quantile(gaps, 0.5), p95Gap: quantile(gaps, 0.95), maxGap: gaps.length ? Math.max(...gaps) : null,
      sdGap: gaps.length > 1 ? Math.sqrt(gaps.reduce((s, v) => s + (v - average) ** 2, 0) / (gaps.length - 1)) : null,
      meanGapCI: confidence ? bootstrapMeanCI(valid) : [null, null],
      optimalRate: valid.length ? 100 * valid.filter(r => Math.abs(r.total - r.optimal) <= 1e-7 * Math.max(1, r.optimal)).length / valid.length : null,
      medianMs: quantile(valid.map(r => r.runtimeMs), 0.5), p95Ms: quantile(valid.map(r => r.runtimeMs), 0.95),
    })
  }
  return summaries
}

export function runProblem(problem, config = {}) {
  const { repetitions, seed, unitCost } = checkConfig(config)
  const rand = randomSource(seed + Number(problem.id.slice(1)))
  const records = []
  for (const allowBacklog of [false, true]) {
    const options = { allowBacklog, unitCost }; const optimalPlan = solver.ww(problem.rows, options)
    const referenceIssues = auditPlan(problem.rows, optimalPlan, allowBacklog)
    if (referenceIssues.length) throw new Error(`${problem.id}: kesin çözüm geçersiz: ${referenceIssues.join(' ')}`)
    // Fisher–Yates order prevents every method occupying the same timing slot.
    const order = [...methods]
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
    for (const method of order) {
      try {
        let plan = solver[method.id](problem.rows, options) // untimed warmup
        // Browser clocks are often quantized at 0.1 ms: time a calibrated
        // batch, then normalize per solve instead of reporting zero durations.
        let timedBatchSize = 1
        while (timedBatchSize < 256) {
          const calibrationStart = performance.now()
          for (let k = 0; k < timedBatchSize; k++) plan = solver[method.id](problem.rows, options)
          if (performance.now() - calibrationStart >= 1) break
          timedBatchSize *= 2
        }
        const timings = []
        for (let r = 0; r < repetitions; r++) {
          const start = performance.now()
          for (let k = 0; k < timedBatchSize; k++) plan = solver[method.id](problem.rows, options)
          timings.push((performance.now() - start) / timedBatchSize)
        }
        const issues = auditPlan(problem.rows, { ...plan, method: method.id }, allowBacklog, optimalPlan.total)
        const gap = relativeGap(plan.total, optimalPlan.total)
        if (gap === null) issues.push('Sıfır optimum ve pozitif maliyet: bağıl sapma tanımsız.')
        records.push({ problemId: problem.id, family: problem.family, cellId: problem.cellId, cvTarget: problem.cvTarget, setupScale: problem.setupScale, backlogRatio: problem.backlogRatio, periods: problem.rows.length, mode: allowBacklog ? 'backlog' : 'noBacklog', method: method.id,
          role: methodRole(method.id, allowBacklog).kind, modelVersion: MODEL_VERSION, total: plan.total, grandTotal: plan.grandTotal, productionCost: plan.productionCost, optimal: optimalPlan.total, gap, runtimeMs: quantile(timings, 0.5), timedBatchSize, issues,
          setupCost: plan.setupCost, stockCost: plan.stockCost, backlogCost: plan.backlogCost, production: plan.production, stock: plan.stock })
      } catch (error) {
        records.push({ problemId: problem.id, family: problem.family, cellId: problem.cellId, cvTarget: problem.cvTarget, setupScale: problem.setupScale, backlogRatio: problem.backlogRatio, periods: problem.rows.length, mode: allowBacklog ? 'backlog' : 'noBacklog', method: method.id,
          total: null, optimal: optimalPlan.total, gap: null, runtimeMs: null, issues: [error.message] })
      }
    }
  }
  const no = records.find(r => r.mode === 'noBacklog' && r.method === 'ww')
  const yes = records.find(r => r.mode === 'backlog' && r.method === 'ww')
  if (yes.total > no.total + 1e-7 * Math.max(1, no.total)) throw new Error(`${problem.id}: yok satmaya izin verilmesi optimum maliyeti artırdı.`)
  return records
}
export function recordsToCSV(records) {
  const fields = ['problemId', 'cellId', 'family', 'cvTarget', 'setupScale', 'backlogRatio', 'role', 'modelVersion', 'periods', 'mode', 'method', 'total', 'grandTotal', 'productionCost', 'optimal', 'gap', 'runtimeMs', 'timedBatchSize', 'setupCost', 'stockCost', 'backlogCost', 'issues']
  const cell = value => `"${String(value ?? '').replaceAll('"', '""')}"`
  return '\uFEFF' + [fields.join(','), ...records.map(r => fields.map(f => cell(f === 'issues' ? r.issues.join(' | ') : r[f])).join(','))].join('\n')
}
