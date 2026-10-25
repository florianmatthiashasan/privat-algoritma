import test from 'node:test'
import assert from 'node:assert/strict'
import { economicQuantity, holdingCost, l4l, solver, wagnerWhitin } from './lotSizing.js'

test('dönem bazlı stok maliyetlerini birikimli uygular', () => {
  const rows = [
    { demand: 1, setup: 100, holding: 1 },
    { demand: 1, setup: 100, holding: 100 },
    { demand: 1, setup: 100, holding: 0 },
  ]
  assert.equal(holdingCost(rows, 0, 2), 102)
  const plan = wagnerWhitin(rows)
  assert.equal(plan.total, 201)
  assert.deepEqual(plan.production, [2, 0, 1])
})

test('Wagner–Whitin sıfır talep dönemleri için gereksiz hazırlık maliyeti eklemez', () => {
  const rows = [
    { demand: 0, setup: 10, holding: 1 },
    { demand: 5, setup: 10, holding: 0 },
    { demand: 0, setup: 10, holding: 0 },
    { demand: 5, setup: 10, holding: 0 },
  ]
  assert.deepEqual(wagnerWhitin(rows).production, [0, 10, 0, 0])
  assert.equal(wagnerWhitin(rows).total, 10)
  assert.equal(l4l(rows).total, 20)
})

test('Wagner–Whitin, aynı veri kümesindeki tüm sezgisel sonuçlardan daha pahalı değildir', () => {
  const rows = [
    { demand: 120, setup: 500, holding: 5 }, { demand: 80, setup: 500, holding: 5 },
    { demand: 150, setup: 500, holding: 5 }, { demand: 90, setup: 500, holding: 5 },
    { demand: 130, setup: 500, holding: 5 }, { demand: 110, setup: 500, holding: 5 },
  ]
  const optimal = solver.ww(rows).total
  for (const method of [solver.l4l, solver.silver, solver.luc, solver.ppb, solver.ltc]) {
    assert.ok(optimal <= method(rows).total)
  }
})

test('6 dönemlik örnek problemde klasik yöntemlerin beklenen sonuçları üretilir', () => {
  const rows = [50, 40, 80, 100, 60, 30].map((demand, t) => ({ demand, setup: [100, 100, 80, 90, 100, 100][t], holding: [1, 2, 2, 1, 1, 2][t], backlog: 1 }))
  assert.equal(economicQuantity(rows), 88)
  const expected = { l4l: [570, [50, 40, 80, 100, 60, 30]], foq: [680, [100, 0, 100, 100, 100, 0]], eoq: [912, [88, 88, 0, 94, 88, 88]], meoq: [440, [90, 0, 80, 100, 90, 0]], fpq: [550, [90, 0, 180, 0, 90, 0]], luc: [440, [90, 0, 80, 100, 90, 0]] }
  for (const [id, [total, production]] of Object.entries(expected)) {
    assert.equal(solver[id](rows).total, total, id)
    assert.deepEqual(solver[id](rows).production, production, id)
  }
  assert.equal(solver.foq(rows).endStock, 40)
  assert.equal(solver.eoq(rows).endStock, 86)
})
