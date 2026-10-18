import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pairedT, studentP, studentCritical, holmAdjust, compareMethods } from './statistics.js'
const fixtures = JSON.parse(readFileSync(new URL('./statistics.fixtures.json', import.meta.url)))
const close = (a, b) => assert.ok(Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(b)), `${a} != ${b}`)
test('t kuyruğu, kritik değerler ve eşleştirilmiş fark testi bağımsız SciPy örnekleriyle uyuşur', () => {
  for (const row of fixtures.tails) close(studentP(row.t, row.df), row.p)
  for (const row of fixtures.critical) close(studentCritical(row.df), row.value)
  for (const row of fixtures.cases) { const t = pairedT(row.values); close(t.t, row.t); close(t.p, row.p); close(t.ci[0], row.ci[0]); close(t.ci[1], row.ci[1]) }
})
test('Holm düzeltmesi sıralamayı korur ve önceden belirlenmiş ailenin eksik testini yok saymaz', () => {
  assert.deepEqual(holmAdjust([0.01, 0.04, 0.03, 0.002]), [0.03, 0.06, 0.06, 0.008])
  assert.deepEqual(holmAdjust([0.01, null, 0.02]), [0.03, null, 0.04])
})
test('eşit veya sabit fark t/p üretmez; yetersiz örnek ve sıfır süre oranı ayrı raporlanır', () => {
  assert.equal(pairedT([0, 0, 0]).p, null); assert.equal(pairedT([2, 2, 2]).status, 'zeroVariance')
  assert.equal(pairedT([1]).status, 'insufficient')
  assert.equal(compareMethods([])[0].n, 0)
})
test('eşleştirme problem kimliğine göre yapılır, eksik/hatalı çiftler sayılır; tabakalı CI deterministiktir', () => {
  const records = Array.from({ length: 8 }, (_, i) => ['merge', 'local', 'window'].map(method => ({ problemId: `P${i}`, mode: 'noBacklog', cellId: i < 4 ? 'C1' : 'C2', family: 'low', method, gap: method === 'merge' ? i : method === 'local' ? i / 2 : i / 3, runtimeMs: 0.1, issues: [] }))).flat()
  const a = compareMethods(records); const b = compareMethods([...records].reverse())
  assert.equal(a.length, 6); assert.equal(a[1].n, 8); close(a[1].meanDifference, -1.75)
  close(a[1].meanDifference, b[1].meanDifference); assert.equal(a[1].familySize, 6)
  assert.deepEqual(compareMethods(records)[1].bootstrapCI, a[1].bootstrapCI)
  assert.equal(a[1].stratified.status, 'ok'); assert.ok(a[1].holmP >= a[1].stratified.p)
})
