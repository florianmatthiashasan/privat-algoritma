import { validateRows, MODEL_VERSION, methods } from './lotSizing.js'
import { checkConfig, DESIGN_VERSION, auditPlan, generateProblems } from './experiments.js'

const database = () => new Promise((resolve, reject) => {
  const request = indexedDB.open('parti-tez-calismalari', 1)
  request.onupgradeneeded = () => { request.result.createObjectStore('runs', { keyPath: 'id' }); request.result.createObjectStore('history', { keyPath: 'id' }) }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(new Error('Deney kayıt alanı açılamadı. JSON indirerek yedekleyin.'))
})
async function transact(stores, mode, operation) {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode); let value
      operation(tx, result => { value = result })
      tx.oncomplete = () => resolve(value)
      tx.onerror = () => reject(new Error('Deney kaydedilemedi veya okunamadı. Tarayıcı depolama alanını kontrol edin; JSON yedeğini kullanabilirsiniz.'))
      tx.onabort = tx.onerror
    })
  } finally { db.close() }
}
export async function saveExperiment(result, name) {
  const id = result.id ?? crypto.randomUUID(); const createdAt = result.createdAt ?? new Date().toISOString()
  const run = { ...result, id, createdAt, name: name?.trim() || result.name || `Deney ${result.config.seed}` }
  await transact(['runs', 'history'], 'readwrite', tx => {
    tx.objectStore('runs').put(run)
    tx.objectStore('history').put({ id, name: run.name, createdAt, seed: run.config.seed, count: run.problems.length, modelVersion: run.modelVersion, designVersion: run.designVersion })
  })
  return run
}
export const experimentHistory = () => transact(['history'], 'readonly', (tx, done) => { const r = tx.objectStore('history').getAll(); r.onsuccess = () => done(r.result.sort((a, b) => b.createdAt.localeCompare(a.createdAt))) })
export const loadExperiment = id => transact(['runs'], 'readonly', (tx, done) => { const r = tx.objectStore('runs').get(id); r.onsuccess = () => done(r.result) })
export const deleteExperiment = id => transact(['runs', 'history'], 'readwrite', tx => { tx.objectStore('runs').delete(id); tx.objectStore('history').delete(id) })

export function normalizeRows(input) {
  if (!Array.isArray(input)) throw new Error('Dönem verisi bir liste olmalıdır.')
  const rows = input.map(r => ({ demand: r.demand, setup: r.setup, holding: r.holding, backlog: r.backlog ?? 10 }))
  validateRows(rows, { allowBacklog: true }); return rows
}
function parseCSV(text) {
  const separator = text.split(/\r?\n/)[0].includes(';') ? ';' : ','
  const rows = []; let row = []; let cell = ''; let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (!quoted && (char === separator || char === '\n')) { row.push(cell.replace(/\r$/, '')); cell = ''; if (char === '\n') { if (row.some(x => x.trim())) rows.push(row); row = [] } }
    else cell += char
  }
  if (quoted) throw new Error('CSV içinde kapanmamış tırnak var.')
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row) }
  if (rows.length < 2) throw new Error('CSV başlık ve en az bir veri satırı içermelidir.')
  const aliases = { demand: 'demand', talep: 'demand', setup: 'setup', hazirlik: 'setup', holding: 'holding', stok: 'holding', backlog: 'backlog', gecikme: 'backlog' }
  const headers = rows.shift().map(x => aliases[x.trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('ı', 'i')])
  for (const field of ['demand', 'setup', 'holding']) if (!headers.includes(field)) throw new Error(`CSV sütunu eksik: ${field}. Örnek şablonu kullanın.`)
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) throw new Error('CSV içinde yinelenen sütun var.')
  return normalizeRows(rows.filter(r => r.some(x => x.trim())).map((r, i) => {
    const result = {}
    headers.forEach((field, j) => { if (field) { const raw = r[j]?.trim(); if (!raw) throw new Error(`${i + 2}. CSV satırında boş değer var.`); result[field] = Number(separator === ';' ? raw.replace(',', '.') : raw) } })
    return result
  }))
}
export function importProblem(text, filename) {
  if (text.length > 2e6) throw new Error('Tek problem dosyası en fazla 2 MB olmalıdır.')
  if (filename.toLowerCase().endsWith('.csv')) return { rows: parseCSV(text.replace(/^\uFEFF/, '')), allowBacklog: false, unitCost: 0 }
  const parsed = JSON.parse(text.replace(/^\uFEFF/, ''))
  if (parsed === null || typeof parsed !== 'object') throw new Error('JSON bir dönem listesi veya rows alanlı nesne olmalıdır.')
  const rows = normalizeRows(Array.isArray(parsed) ? parsed : parsed.rows)
  const unitCost = parsed.unitCost ?? 0; checkConfig({ unitCost })
  if (parsed.allowBacklog !== undefined && typeof parsed.allowBacklog !== 'boolean') throw new Error('allowBacklog true veya false olmalıdır.')
  return { rows, unitCost, allowBacklog: parsed.allowBacklog ?? false }
}
export function validateExperiment(input) {
  if (input?.modelVersion !== MODEL_VERSION || input?.designVersion !== DESIGN_VERSION || input.version !== 2) throw new Error('Deney sürümü bu modelle uyumlu değil. Eski LTC/PPB sonuçları tez sürümünde yeniden hesaplanmalıdır.')
  const config = checkConfig(input.config)
  if (!Array.isArray(input.problems) || input.problems.length !== config.count || !Array.isArray(input.records) || input.records.length !== config.count * 2 * methods.length) throw new Error('Deney girdileri veya sonuç sayısı eksik.')
  const problems = new Map()
  const expectedProblems = generateProblems(config)
  for (const [i, p] of input.problems.entries()) {
    if (typeof p.id !== 'string' || problems.has(p.id)) throw new Error('Problem kimlikleri geçersiz veya yineleniyor.')
    validateRows(p.rows, { allowBacklog: true })
    const expected = expectedProblems[i]
    for (const key of ['id', 'cellId', 'repeat', 'family', 'periods', 'cvTarget', 'setupScale', 'backlogRatio']) if (p[key] !== expected[key]) throw new Error('Deney koşulları sürüm/tohum ile eşleşmiyor; değiştirilmiş girdiyi tek problem olarak içe aktarın.')
    if (p.rows.length !== expected.rows.length || p.rows.some((r, t) => ['demand', 'setup', 'holding', 'backlog'].some(key => r[key] !== expected.rows[t][key]))) throw new Error('Deney talepleri veya maliyetleri tohum/tasarımla eşleşmiyor.')
    problems.set(p.id, p)
  }
  const seen = new Set()
  const allowed = new Set(methods.map(m => m.id))
  for (const r of input.records) {
    const p = problems.get(r.problemId); const key = `${r.problemId}/${r.mode}/${r.method}`
    if (!p || seen.has(key) || !allowed.has(r.method) || !['noBacklog', 'backlog'].includes(r.mode) || !Array.isArray(r.issues)) throw new Error('Deney sonuç kimlikleri geçersiz.')
    seen.add(key)
    if (!r.issues.length) {
      if (!Number.isFinite(r.runtimeMs) || r.runtimeMs < 0 || auditPlan(p.rows, r, r.mode === 'backlog').length) throw new Error('İçe aktarılan planda süre, denge veya maliyet hatası var.')
    }
  }
  // Derived statistics are deliberately not trusted on import; recompute them.
  return { ...input, config, imported: true }
}
