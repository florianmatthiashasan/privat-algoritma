import { MODEL_VERSION, solver, planFromProduction, methodRole, endStockMethods } from './lotSizing.js'
import { checkConfig, DESIGN_VERSION, relativeGap, summarize, auditPlan } from './experiments.js'
import { compareMethods } from './statistics.js'
import { validateExperiment } from './persistence.js'

export const protocol = {
  version: 'protocol-v2.0.0', statisticsVersion: 'paired-stratified-v1.0.0',
  problem: 'Tek ürün; dönem talepleri önceden bilinir (deterministik); kapasite kısıtı yoktur; tedarik süresi sıfırdır; başlangıç ve bitiş net stoku sıfırdır; kayıp satış yoktur.',
  cost: 'Yüzde sapma; hazırlık, stok ve yok satma maliyetlerinden oluşan karar maliyeti üzerinden hesaplanır. Sabit birim üretim maliyeti ayrıca raporlanır ve sapmanın paydasına eklenmez.',
  design: '3 ufuk × 2 hedef CV × 5 hazırlık oranı × 10 tekrar = 300 temel problem. Talepler ortalaması 100 olan gamma dağılımından üretilir; h = 1. b/h = 0,25 / 1 / 4 düzeyleri dönüşümlü atanır; her düzeyde 100 problem bulunur.',
  hypotheses: 'Önceden belirlenen yöntem çiftleri TB−SA6, ESK−TB ve ESK−SA6’dır; iki modelde toplam altı karşılaştırma yapılır. H₀: ortalama sapma farkı sıfırdır; H₁: fark sıfırdan farklıdır. Negatif fark ilk yöntemin lehinedir.',
  inference: 'Sıradan eşleştirilmiş t testinin yanında, ana koşul ve b/h düzeyine göre tabakalı t testi (Satterthwaite serbestlik derecesi) uygulanır; tam deneyde 90 tabaka vardır. Altı karşılaştırmanın p değerleri Holm yöntemiyle düzeltilir. %95 güven aralıkları tabakalı t ve 2.000 tekrarlı tabakalı bootstrap ile verilir. İşaret testi, ortalama farktan bağımsız olarak kazanma yönünü sınar.',
  caveats: 'p ≥ 0,05 sonucu yöntemlerin eşit olduğu biçiminde yorumlanmaz. Farkların varyansı sıfırsa t ve p hesaplanmaz. Pratik anlamlılık eşiği 0,5 yüzde puandır. 300 temel problem iki modelde çözülür; bu 600 bağımsız problem anlamına gelmez. Süre ölçüm tekrarları ayrı problem sayılmaz.',
  decisions: ['Deney 300 temel problemden oluşur; her problem iki modelde çözülür (600 model durumu).', 'Birim üretim maliyeti c dönemler boyunca sabittir; bu nedenle yöntemlerin sıralamasını ve yüzde sapmayı etkilemez.', 'İstatistiksel karşılaştırmalar TB−SA6, ESK−TB ve ESK−SA6 çiftleriyle yapılır; pratik anlamlılık eşiği 0,5 yüzde puandır.', 'Talep dağılımı ve parametre düzeyleri kontrollü bir sentetik deney tasarımıdır.'],
}
export async function finalizeExperiment(config, problems, records, extra = {}) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(problems)))
  const inputSHA256 = [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('')
  return { version: 2, modelVersion: MODEL_VERSION, designVersion: DESIGN_VERSION, config: checkConfig(config), createdAt: new Date().toISOString(), inputSHA256, protocol,
    problems, records, summary: summarize(records), comparisons: compareMethods(records), ...extra }
}
export async function restoreExperiment(input) {
  const checked = validateExperiment(input); const references = new Map()
  for (const problem of checked.problems) for (const allowBacklog of [false, true]) references.set(`${problem.id}/${allowBacklog ? 'backlog' : 'noBacklog'}`, solver.ww(problem.rows, { allowBacklog, unitCost: checked.config.unitCost }).total)
  const problems = new Map(checked.problems.map(p => [p.id, p]))
  const records = checked.records.map(r => {
    const problem = problems.get(r.problemId); const optimum = references.get(`${r.problemId}/${r.mode}`)
    const metadata = { ...r, cellId: problem.cellId, family: problem.family, periods: problem.rows.length, cvTarget: problem.cvTarget, setupScale: problem.setupScale, backlogRatio: problem.backlogRatio, role: methodRole(r.method, r.mode === 'backlog').kind, optimal: optimum }
    if (r.issues.length) return { ...metadata, gap: null }
    const plan = { ...planFromProduction(problem.rows, r.production, { allowBacklog: r.mode === 'backlog', unitCost: checked.config.unitCost, allowEndStock: endStockMethods.has(r.method) }), method: r.method }
    const expected = solver[r.method](problem.rows, { allowBacklog: r.mode === 'backlog', unitCost: checked.config.unitCost })
    if (Math.abs(plan.total - expected.total) > 1e-7 * Math.max(1, expected.total) || plan.production.some((q, t) => Math.abs(q - expected.production[t]) > 1e-7)) throw new Error(`${problem.id}: kayıtlı plan yöntem/sürüm ile eşleşmiyor; deneyi yeniden çalıştırın.`)
    return { ...metadata, ...plan, gap: relativeGap(plan.total, optimum), issues: auditPlan(problem.rows, plan, r.mode === 'backlog', optimum) }
  })
  return finalizeExperiment(checked.config, checked.problems, records, { imported: true, name: checked.name, environment: checked.environment, createdAt: checked.createdAt, importedAt: new Date().toISOString() })
}
