import test from 'node:test'
import assert from 'node:assert/strict'
import { importProblem, validateExperiment } from './persistence.js'
import { generateProblems, runProblem } from './experiments.js'
import { finalizeExperiment, restoreExperiment } from './experimentResult.js'
test('CSV ve JSON girdilerinde Türkçe sütunlar, ondalık virgül ve model alanları korunur', () => {
  const p = importProblem('talep;hazırlık;stok;gecikme\n10;50;2;0,5\n20;50;2;0,5', 'x.csv')
  assert.equal(p.rows[0].backlog, 0.5); assert.equal(p.rows[1].demand, 20)
  const restored = importProblem(JSON.stringify({ ...p, unitCost: 3, allowBacklog: true }), 'x.json')
  assert.equal(restored.unitCost, 3); assert.equal(restored.allowBacklog, true)
  for (const text of ['null', '{"rows":[]}', '{"rows":[{"demand":-1}]}']) assert.throws(() => importProblem(text, 'x.json'))
  assert.throws(() => importProblem('demand,setup,holding\n10,,2', 'x.csv'))
  assert.throws(() => importProblem('demand,setup,holding\n"10,1,2', 'x.csv'))
})
test('deney geri yüklemede sürüm, tamlık, tohum ve maliyet doğrulanır; türetilmiş istatistiklere güvenilmez', async () => {
  const config = { count: 1, seed: 1, repetitions: 1, unitCost: 3 }
  const problems = generateProblems(config); const records = runProblem(problems[0], config)
  const run = await finalizeExperiment(config, problems, records)
  assert.equal(validateExperiment(run).version, 2)
  const modified = structuredClone(run); modified.records[0].gap = 999; modified.summary = []; modified.comparisons = []
  const restored = await restoreExperiment(modified)
  assert.notEqual(restored.records[0].gap, 999); assert.equal(restored.comparisons.length, 6)
  const badVersion = { ...run, modelVersion: 'old' }; assert.throws(() => validateExperiment(badVersion))
  const missing = { ...run, records: records.slice(1) }; assert.throws(() => validateExperiment(missing))
  const badSeed = structuredClone(run); badSeed.problems[0].rows[0].demand++
  assert.throws(() => validateExperiment(badSeed))
  const badCost = structuredClone(run); badCost.records[0].total++
  assert.throws(() => validateExperiment(badCost))
})
