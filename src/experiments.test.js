import test from 'node:test'
import assert from 'node:assert/strict'
import { solver, planFromProduction, validateRows } from './lotSizing.js'
import { auditPlan, bootstrapMeanCI, generateProblems, quantile, randomSource, recordsToCSV, relativeGap, runProblem, summarize } from './experiments.js'

// Independent integer-inventory oracle: enumerate every feasible production
// quantity at each period. It does not use lots, interval costs, or solver code.
function inventoryOracle(rows, allowBacklog) {
  const totalDemand = rows.reduce((s, r) => s + r.demand, 0)
  let states = new Map([[0, 0]]); let cumulativeDemand = 0
  for (const row of rows) {
    const next = new Map()
    for (const [stock, cost] of states) {
      const alreadyProduced = stock + cumulativeDemand
      for (let q = 0; q <= totalDemand - alreadyProduced; q++) {
        const balance = stock + q - row.demand
        if (!allowBacklog && balance < 0) continue
        const value = cost + (q > 0 ? row.setup : 0) + Math.max(0, balance) * row.holding + Math.max(0, -balance) * row.backlog
        if (value < (next.get(balance) ?? Infinity)) next.set(balance, value)
      }
    }
    cumulativeDemand += row.demand; states = next
  }
  return states.get(0)
}
const close = (a, b) => assert.ok(Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)), `${a} != ${b}`)

test('kesin DP, 160 küçük rassal problemin iki modunda bağımsız üretim enumerasyonu ile aynı optimumu bulur', () => {
  const rand = randomSource(8712); const integer = n => Math.floor(rand() * n)
  for (let i = 0; i < 160; i++) {
    const rows = Array.from({ length: 1 + integer(6) }, () => ({ demand: integer(4), setup: integer(15), holding: integer(6) / 2, backlog: integer(7) / 2 }))
    for (const allowBacklog of [false, true]) {
      const optimum = inventoryOracle(rows, allowBacklog)
      close(solver.ww(rows, { allowBacklog }).total, optimum)
      for (const method of Object.values(solver)) {
        const plan = method(rows, { allowBacklog })
        assert.deepEqual(auditPlan(rows, plan, allowBacklog, optimum), [])
      }
    }
  }
})

test('kitap PDF s. 869–876 Wagner–Whitin örneği 430 maliyet verir', () => {
  const rows = [50, 40, 80, 100, 60, 30].map((demand, t) => ({ demand, setup: [100, 100, 80, 90, 100, 100][t], holding: [1, 2, 2, 1, 1, 2][t], backlog: 1 }))
  close(solver.ww(rows).total, inventoryOracle(rows, false))
  assert.equal(solver.ww(rows).total, 430)
  assert.deepEqual(solver.ww(rows).production, [90, 0, 80, 190, 0, 0])
})

test('yok satma erken talebi sonraki dönemde karşılar; gecikme dönem sonunda ücretlenir', () => {
  const rows = [{ demand: 10, setup: 100, holding: 2, backlog: 1 }, { demand: 10, setup: 1, holding: 2, backlog: 1 }]
  const plan = solver.ww(rows, { allowBacklog: true })
  assert.deepEqual(plan.production, [0, 20]); assert.deepEqual(plan.stock, [-10, 0])
  assert.equal(plan.backlogCost, 10); assert.equal(plan.total, 11)
  assert.equal(solver.ww(rows).total, 101)
})

test('sıfır talep döneminde ucuz hazırlık hem ileri hem geri üretimde kullanılabilir', () => {
  const early = [{ demand: 0, setup: 1, holding: 1, backlog: 1 }, { demand: 10, setup: 100, holding: 1, backlog: 1 }]
  assert.equal(solver.ww(early).total, 11)
  const late = [...early].reverse()
  assert.equal(solver.ww(late, { allowBacklog: true }).total, 11)
})

test('sıfır talep, sıfır taşıma ve tek dönem uç durumları', () => {
  for (const rows of [
    [{ demand: 0, setup: 50, holding: 0, backlog: 0 }],
    [{ demand: 8, setup: 7, holding: 0, backlog: 0 }],
    [{ demand: 8, setup: 7, holding: 0, backlog: 0 }, { demand: 4, setup: 1, holding: 0, backlog: 0 }],
  ]) for (const allowBacklog of [false, true]) for (const method of Object.values(solver)) {
    assert.deepEqual(auditPlan(rows, method(rows, { allowBacklog }), allowBacklog, inventoryOracle(rows, allowBacklog)), [])
  }
})

test('300 problem 30 hücreye dengeli ve aynı tohumla tekrar üretilebilir', () => {
  const a = generateProblems(); const b = generateProblems()
  assert.deepEqual(a, b); assert.equal(a.length, 300)
  assert.notDeepEqual(a, generateProblems({ seed: 42 }))
  for (const family of new Set(a.map(p => p.family))) assert.equal(a.filter(p => p.family === family).length, 150)
  for (const cell of new Set(a.map(p => p.cellId))) assert.equal(a.filter(p => p.cellId === cell).length, 10)
  for (const ratio of [0.25, 1, 4]) assert.equal(a.filter(p => p.backlogRatio === ratio).length, 100)
  assert.deepEqual([...new Set(a.map(p => p.rows.length))].sort((x, y) => x - y), [8, 24, 48])
})

test('örneklemin bütün 300 probleminde denge, optimum sınırı ve yerel iyileştirme korunur', () => {
  for (const problem of generateProblems()) {
    const { rows } = problem; const no = solver.ww(rows).total; const yes = solver.ww(rows, { allowBacklog: true }).total
    assert.ok(yes <= no + 1e-6)
    for (const allowBacklog of [false, true]) {
      const optimum = allowBacklog ? yes : no
      for (const method of Object.values(solver)) assert.deepEqual(auditPlan(rows, method(rows, { allowBacklog }), allowBacklog, optimum), [], problem.id)
      assert.ok(solver.local(rows, { allowBacklog }).total <= solver.merge(rows, { allowBacklog }).total + 1e-6)
    }
  }
})

test('maliyetlerin ölçeklenmesi optimumu aynı oranda değiştirir', () => {
  for (const { rows } of generateProblems({ count: 12 })) for (const allowBacklog of [false, true]) {
    const scaled = rows.map(r => ({ ...r, setup: r.setup * 7, holding: r.holding * 7, backlog: r.backlog * 7 }))
    close(solver.ww(scaled, { allowBacklog }).total, 7 * solver.ww(rows, { allowBacklog }).total)
  }
})

test('gecikme maliyeti artınca optimum düşmez; sıfır taşıma maliyetinde en ucuz hazırlık yeterlidir', () => {
  for (const { rows } of generateProblems({ count: 24 })) {
    const zero = rows.map(r => ({ ...r, backlog: 0 }))
    const freeTransport = rows.map(r => ({ ...r, holding: 0, backlog: 0 }))
    const high = rows.map(r => ({ ...r, backlog: r.backlog * 100 }))
    assert.ok(solver.ww(zero, { allowBacklog: true }).total <= rows.at(-1).setup + 1e-6)
    close(solver.ww(freeTransport, { allowBacklog: true }).total, Math.min(...rows.map(r => r.setup)))
    assert.ok(solver.ww(high, { allowBacklog: true }).total >= solver.ww(rows, { allowBacklog: true }).total - 1e-6)
  }
})

test('tanımsız sapma, bozuk veri ve hatalı üretim sessizce kabul edilmez', () => {
  assert.equal(relativeGap(0, 0), 0); assert.equal(relativeGap(1, 0), null); assert.equal(relativeGap(110, 100), 10)
  assert.equal(relativeGap(3422.1, 3422.1000000000004), 0)
  assert.throws(() => relativeGap(-1, 0))
  for (const value of [-1, NaN, Infinity, '12']) assert.throws(() => validateRows([{ demand: value, setup: 1, holding: 1 }]))
  assert.throws(() => validateRows([]))
  assert.throws(() => validateRows([{ demand: 1, setup: 1, holding: 1 }], { allowBacklog: true }))
  const rows = [{ demand: 2, setup: 3, holding: 1, backlog: 1 }]
  assert.throws(() => planFromProduction(rows, [1]))
  assert.ok(auditPlan(rows, { production: [2], stock: [0], total: 99, setupCost: 3, stockCost: 0, backlogCost: 0 }, false).length)
  assert.ok(auditPlan(rows, { production: [2], stock: [0], total: 3 }, false).includes('Maliyet bileşenleri tutarsız.'))
  assert.throws(() => generateProblems({ count: 1.5 }))
})

test('istatistikler elle hesaplanabilir örnekle doğrulanır; hatalı sonuçlar ortalamadan çıkarılır ve sayılır', () => {
  const records = [0, 10, 20, 30].map(gap => ({ mode: 'noBacklog', method: 'silver', family: 'steady', total: 100 + gap, optimal: 100, gap, runtimeMs: 2, issues: [] }))
  records.push({ ...records[0], gap: -90, issues: ['bozuk'] })
  const [s] = summarize(records)
  assert.equal(s.meanGap, 15); assert.equal(s.medianGap, 15); close(s.p95Gap, 28.5)
  assert.equal(s.maxGap, 30); assert.equal(s.optimalRate, 25); assert.equal(s.failures, 1)
  close(s.sdGap, Math.sqrt(500 / 3)); assert.equal(quantile([], 0.5), null)
  assert.deepEqual(bootstrapMeanCI(records.slice(0, 4)), bootstrapMeanCI(records.slice(0, 4)))
})

test('deney ham maliyet, tekrar medyanı ve dışa aktarılabilir sonuçları korur', () => {
  const [problem] = generateProblems({ count: 1 }); const records = runProblem(problem, { repetitions: 2 })
  assert.equal(records.length, 18)
  assert.ok(records.every(r => r.issues.length === 0 && r.runtimeMs >= 0))
  assert.equal(summarize(records).length, 18)
  const csv = recordsToCSV(records)
  assert.ok(csv.includes('runtimeMs')); assert.equal(csv.split('\n').length, 19)
})

test('ders notlarında LTC 470, PPB 430 verir; sabit üretim maliyeti ve izleme karar planını değiştirmez', () => {
  const rows = [50, 40, 80, 100, 60, 30].map((demand, t) => ({ demand, setup: [100, 100, 80, 90, 100, 100][t], holding: [1, 2, 2, 1, 1, 2][t], backlog: 1 }))
  assert.equal(solver.ltc(rows).total, 470); assert.equal(solver.ppb(rows).total, 430)
  for (const allowBacklog of [false, true]) for (const method of Object.values(solver)) {
    const plain = method(rows, { allowBacklog }); const traced = method(rows, { allowBacklog, trace: true, unitCost: 3 })
    assert.deepEqual(plain.production, traced.production); close(traced.total, plain.total)
    close(traced.grandTotal, plain.total + 1080); assert.ok(traced.trace.length > 0)
  }
})

test('çok küçük gerçek talep ve stok, sabit mutlak toleransla sıfırlanmaz', () => {
  const rows = [{ demand: 0, setup: 0, holding: 1e9, backlog: 1e9 }, { demand: 1e-8, setup: 100, holding: 1, backlog: 1 }]
  assert.equal(solver.ww(rows).total, 10)
  assert.equal(solver.ww(rows).stock[0], 1e-8)
  assert.throws(() => planFromProduction(rows, [0, 0]))
  const late = [{ demand: 1e-8, setup: 100, holding: 1, backlog: 1e9 }, { demand: 0, setup: 0, holding: 1, backlog: 1 }]
  assert.equal(solver.ww(late, { allowBacklog: true }).total, 10)
})
