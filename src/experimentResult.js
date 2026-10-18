import { MODEL_VERSION, solver, planFromProduction, methodRole } from './lotSizing.js'
import { checkConfig, DESIGN_VERSION, relativeGap, summarize, auditPlan } from './experiments.js'
import { compareMethods } from './statistics.js'
import { validateExperiment } from './persistence.js'

export const protocol = {
  version: 'protocol-v2.0.0', statisticsVersion: 'paired-stratified-v1.0.0',
  problem: 'Tek ürün; bilinen deterministik talep; kapasitesiz; sıfır tedarik süresi; sıfır başlangıç/bitiş net stoku; kayıp satış yok.',
  cost: 'Sapma: hazırlık + stok + gecikme karar maliyeti. Sabit birim üretim maliyeti ayrıca gösterilir; yüzde sapma paydasına dahil değildir.',
  design: '3 ufuk × 2 hedef CV × 5 hazırlık oranı × 10 tekrar = 300 temel problem. Gamma talep, ortalama 100; h=1. b/h=0,25/1/4 dönüşümlü ve 300 problemde dengeli; dördüncü tam faktör değildir.',
  hypotheses: 'Önceden tanımlı çiftler: TB−SA6, ESK−TB, ESK−SA6; iki modelde toplam 6 karşılaştırma. H0: ortalama sapma farkı 0, H1: farklı. Negatif fark ilk yöntem lehine.',
  inference: 'Sıradan eşleştirilmiş t yanında ana koşul ve b/h alt seviyesine göre tabakalı fark-ortalaması t yaklaşımı (Satterthwaite df) verilir. Tam deneyde 90 çıkarım tabakası vardır; tabaka içi varyanslar kullanılır. Sonuçlar yaklaşık ve varsayımlara duyarlıdır. Holm ailesi filtrelerden bağımsız tam 6 karşılaştırmadır. Tekil %95 GA eşzamanlı GA değildir. Tabakalı eşleştirilmiş bootstrap 2000 tekrar; işaret testi kazanma yönünü sınar, ortalama farkı değil.',
  caveats: 'p≥0,05 eşitlik veya optimumluk kanıtı değildir. Sıfır varyanslı farklarda t/p tanımsız raporlanır. 0,5 yüzde puan pratik eşik araştırmacı önerisidir. 300 temel problem iki modda 600 bağımsız problem sayılmaz; süre tekrarları yeni problem değildir.',
  approvals: ['300 temel problemin iki modelde incelenmesi başlangıç önerisidir; hocayla teyit edilecek.', 'İlk sürümde c dönemler boyunca sabittir; dönemlik c_t gereksinimi hocayla teyit edilecek.', 'Zorunlu yöntemler, test çiftleri ve pratik eşik hocayla teyit edilecek.'],
  sources: [
    { title: 'Ders notları', detail: 'Prof. Dr. Yakup Kara, PDF s. 243, 247–260, 370, 380–386, 867–876. LTC 470, PPB 430, WW 430 doğrulama örnekleri.' },
    { title: 'Eşleştirilmiş t-testi', url: 'https://www.itl.nist.gov/div898/handbook/prc/section3/prc311.htm' },
    { title: 'Holm düzeltmesi', url: 'https://stat.ethz.ch/R-manual/R-devel/library/stats/html/p.adjust.html' },
    { title: 'Yok satmalı ağ/DP yaklaşımı', url: 'https://pubsonline.informs.org/doi/10.1287/mnsc.15.9.506' },
  ],
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
    const plan = planFromProduction(problem.rows, r.production, { allowBacklog: r.mode === 'backlog', unitCost: checked.config.unitCost })
    const expected = solver[r.method](problem.rows, { allowBacklog: r.mode === 'backlog', unitCost: checked.config.unitCost })
    if (Math.abs(plan.total - expected.total) > 1e-7 * Math.max(1, expected.total) || plan.production.some((q, t) => Math.abs(q - expected.production[t]) > 1e-7)) throw new Error(`${problem.id}: kayıtlı plan yöntem/sürüm ile eşleşmiyor; deneyi yeniden çalıştırın.`)
    return { ...metadata, ...plan, gap: relativeGap(plan.total, optimum), issues: auditPlan(problem.rows, plan, r.mode === 'backlog', optimum) }
  })
  return finalizeExperiment(checked.config, checked.problems, records, { imported: true, name: checked.name, environment: checked.environment, createdAt: checked.createdAt, importedAt: new Date().toISOString() })
}
