import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { cpus, platform, arch } from 'node:os'
import { parseArgs } from 'node:util'
import { createHash } from 'node:crypto'
import { checkConfig, generateProblems, recordsToCSV, runProblem, DESIGN_VERSION } from '../src/experiments.js'
import { MODEL_VERSION } from '../src/lotSizing.js'
import { finalizeExperiment } from '../src/experimentResult.js'
import { reportMarkdown, statisticsCSV } from '../src/report.js'
const { values } = parseArgs({ options: { seed: { type: 'string' }, count: { type: 'string' }, repetitions: { type: 'string' }, unitCost: { type: 'string' }, output: { type: 'string', default: 'experiments' }, input: { type: 'string' } } })
const overrides = Object.fromEntries(['seed','count','repetitions','unitCost'].filter(k => values[k] !== undefined).map(k => [k,Number(values[k])]))
const input = values.input ? JSON.parse(await readFile(resolve(values.input),'utf8')) : null
if (input && (input.modelVersion !== MODEL_VERSION || input.designVersion !== DESIGN_VERSION)) throw new Error('Eski model/tasarım girdisi tez deneyi olarak kullanılamaz; yeniden üretin.')
const config = checkConfig({ ...input?.config, ...overrides }); const problems = input?.problems ?? generateProblems(config)
if (!Array.isArray(problems) || problems.length !== config.count) throw new Error('Problem sayısı deney ayarıyla eşleşmiyor.')
const sourceSHA256 = {}
for (const file of ['src/lotSizing.js','src/experiments.js','src/statistics.js','src/experimentResult.js']) sourceSHA256[file] = createHash('sha256').update(await readFile(file)).digest('hex')
const records = []; const start = performance.now()
for (const [i,problem] of problems.entries()) { records.push(...runProblem(problem,config)); if ((i+1)%50===0 || i===problems.length-1) console.log(`${i+1}/${problems.length} problem tamamlandı`) }
const environment = { node: process.version, platform: platform(), arch: arch(), cpu: cpus()[0]?.model, elapsedMs: performance.now()-start, sourceSHA256 }
const result = await finalizeExperiment(config,problems,records,{environment})
const output = resolve(values.output); await mkdir(output,{recursive:true})
for (const [name, content] of Object.entries({
 'problems.json': JSON.stringify({version:2,modelVersion:MODEL_VERSION,designVersion:DESIGN_VERSION,inputSHA256:result.inputSHA256,config,problems},null,2),
 'results.json': JSON.stringify(result,null,2), 'results.csv': recordsToCSV(records),
 'summary.json': JSON.stringify({modelVersion:MODEL_VERSION,designVersion:DESIGN_VERSION,inputSHA256:result.inputSHA256,config,environment,summary:result.summary,comparisons:result.comparisons},null,2),
 'statistics.csv': statisticsCSV(result), 'REPORT.md': reportMarkdown(result),
})) await writeFile(resolve(output,name),content+'\n')
const failures=records.filter(r=>r.issues.length).length
console.log(`Sonuçlar: ${output}; geçerlilik hatası: ${failures}; karşılaştırma sayısı: ${result.comparisons.length}`)
if(failures) process.exitCode=1
