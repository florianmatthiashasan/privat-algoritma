import test from 'node:test'
import assert from 'node:assert/strict'
import { holdingCost, l4l, solver, wagnerWhitin } from './lotSizing.js'

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
