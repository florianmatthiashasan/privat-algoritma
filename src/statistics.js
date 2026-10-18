// Student-t tails via the regularized incomplete beta; no normal-tail shortcut.
// Independently reconciled against SciPy in scripts/validate_thesis.py.
import { groupRecords, quantile, randomSource } from './experiments.js'

export const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
export const variance = xs => xs.length < 2 ? null : xs.reduce((s, x) => s + (x - mean(xs)) ** 2, 0) / (xs.length - 1)
function logGamma(z) {
  const p = [676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406, 12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7]
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
  z -= 1; let x = 0.9999999999998099
  for (let i = 0; i < p.length; i++) x += p[i] / (z + i + 1)
  const t = z + p.length - 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}
function betaFraction(a, b, x) {
  const tiny = 1e-300; let c = 1; let d = 1 - (a + b) * x / (a + 1)
  if (Math.abs(d) < tiny) d = tiny
  d = 1 / d; let h = d
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m
    for (const [step, aa] of [m * (b - m) * x / ((a - 1 + m2) * (a + m2)), -(a + m) * (a + b + m) * x / ((a + m2) * (a + 1 + m2))].entries()) {
      d = 1 + aa * d; if (Math.abs(d) < tiny) d = tiny
      c = 1 + aa / c; if (Math.abs(c) < tiny) c = tiny
      d = 1 / d; const delta = d * c; h *= delta
      if (step === 1 && Math.abs(delta - 1) < 3e-14) return h
    }
  }
  return h
}
function regularizedBeta(x, a, b) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x))
  return x < (a + 1) / (a + b + 2) ? bt * betaFraction(a, b, x) / a : 1 - bt * betaFraction(b, a, 1 - x) / b
}
export function studentP(t, df) {
  if (!(df > 0) || Number.isNaN(t)) return null
  if (!Number.isFinite(t)) return 0
  return Math.max(0, Math.min(1, regularizedBeta(df / (df + t * t), df / 2, 0.5)))
}
export function studentCritical(df, alpha = 0.05) {
  let low = 0; let high = 1
  while (studentP(high, df) > alpha && high < 1e12) high *= 2
  for (let i = 0; i < 100; i++) { const mid = (low + high) / 2; if (studentP(mid, df) > alpha) low = mid; else high = mid }
  return (low + high) / 2
}
export function pairedT(differences) {
  const n = differences.length
  if (n < 2) return { n, mean: n ? mean(differences) : null, sd: null, t: null, df: null, p: null, ci: [null, null], status: 'insufficient' }
  const average = mean(differences); const sd = Math.sqrt(variance(differences)); const df = n - 1
  if (sd <= 1e-14) return { n, mean: average, sd, t: null, df, p: null, ci: [average, average], status: 'zeroVariance' }
  const se = sd / Math.sqrt(n); const t = average / se; const margin = studentCritical(df) * se
  return { n, mean: average, sd, t, df, p: studentP(t, df), ci: [average - margin, average + margin], status: 'ok', effectDz: average / sd }
}
export function holmAdjust(values) {
  const finite = values.map((p, i) => ({ p, i })).filter(x => x.p !== null && Number.isFinite(x.p)).sort((a, b) => a.p - b.p)
  // Keep the entire prespecified family in m, including untestable contrasts.
  const adjusted = values.map(() => null); let previous = 0
  finite.forEach(({ p, i }, k) => { previous = Math.max(previous, Math.min(1, p * (values.length - k))); adjusted[i] = previous })
  return adjusted
}
function diagnostics(xs) {
  if (!xs.length) return { skewness: null, excessKurtosis: null, outliers: 0, ties: 0, warning: 'Eşleştirilmiş veri yok.' }
  const avg = mean(xs); const m2 = mean(xs.map(x => (x - avg) ** 2)); const q1 = quantile(xs, 0.25); const q3 = quantile(xs, 0.75); const iqr = q3 - q1
  const skewness = m2 ? mean(xs.map(x => (x - avg) ** 3)) / m2 ** 1.5 : 0
  const excessKurtosis = m2 ? mean(xs.map(x => (x - avg) ** 4)) / m2 ** 2 - 3 : 0
  const outliers = xs.filter(x => x < q1 - 1.5 * iqr || x > q3 + 1.5 * iqr).length
  return { skewness, excessKurtosis, outliers, ties: xs.filter(x => Math.abs(x) <= 1e-9).length, warning: Math.abs(skewness) > 1 || excessKurtosis > 3 || xs.length < 30 ? 'Asimetri, kuyruk veya küçük örneklem uyarısı: t sonucu yaklaşık; bootstrap ve fark grafiğini inceleyin.' : 'Moment kontrolü normallik kanıtı değildir; fark grafiği ve bağımsız problem tasarımı birlikte değerlendirilmelidir.' }
}
function signP(xs) {
  const nonzero = xs.filter(x => Math.abs(x) > 1e-9); const n = nonzero.length
  if (!n) return null
  const wins = nonzero.filter(x => x < 0).length; const k = Math.min(wins, n - wins)
  let sum = 0
  for (let i = 0; i <= k; i++) sum += Math.exp(logGamma(n + 1) - logGamma(i + 1) - logGamma(n - i + 1) - n * Math.log(2))
  return Math.min(1, 2 * sum)
}
export const plannedContrasts = [['merge', 'window'], ['local', 'merge'], ['local', 'window']]
export function compareMethods(records, { draws = 2000, seed = 6917 } = {}) {
  const output = []
  for (const mode of ['noBacklog', 'backlog']) for (const [a, b] of plannedContrasts) {
    const selected = records.filter(r => r.mode === mode)
    const byB = new Map(selected.filter(r => r.method === b).map(r => [r.problemId, r]))
    const pairs = selected.filter(r => r.method === a).flatMap(r => {
      const other = byB.get(r.problemId)
      return other && !r.issues.length && !other.issues.length && Number.isFinite(r.gap) && Number.isFinite(other.gap) ? [{ problemId: r.problemId, cellId: r.cellId, backlogRatio: r.backlogRatio, family: r.family, delta: r.gap - other.gap, logTimeRatio: r.runtimeMs > 0 && other.runtimeMs > 0 ? Math.log(r.runtimeMs / other.runtimeMs) : null }] : []
    })
    const differences = pairs.map(p => p.delta); const paired = pairedT(differences); const groups = groupRecords(pairs)
    const groupVariances = groups.map(g => g.length > 1 ? (g.length / pairs.length) ** 2 * variance(g.map(p => p.delta)) / g.length : null)
    const varianceEstimate = groupVariances.some(v => v === null) ? null : groupVariances.reduce((s, v) => s + v, 0)
    let stratified = { status: 'insufficient', t: null, df: null, p: null, ci: [null, null] }
    if (pairs.length && varianceEstimate !== null) {
      if (varianceEstimate <= 1e-28) stratified = { status: 'zeroVariance', t: null, df: null, p: null, ci: [paired.mean, paired.mean] }
      else {
        const se = Math.sqrt(varianceEstimate); const df = varianceEstimate ** 2 / groupVariances.reduce((s, v, i) => s + v * v / (groups[i].length - 1), 0)
        const t = paired.mean / se; const margin = studentCritical(df) * se
        stratified = { status: 'ok', t, df, p: studentP(t, df), ci: [paired.mean - margin, paired.mean + margin] }
      }
    }
    const rand = randomSource(seed); const bootstrap = []
    if (pairs.length && groups.every(g => g.length >= 2)) for (let k = 0; k < draws; k++) {
      let total = 0
      for (const group of groups) for (let j = 0; j < group.length; j++) total += group[Math.floor(rand() * group.length)].delta
      bootstrap.push(total / pairs.length)
    }
    const logs = pairs.map(p => p.logTimeRatio).filter(x => x !== null)
    output.push({ mode, a, b, n: pairs.length, excluded: selected.filter(r => r.method === a).length - pairs.length, meanDifference: paired.mean,
      paired, stratified, bootstrapCI: [quantile(bootstrap, 0.025), quantile(bootstrap, 0.975)], diagnostics: diagnostics(differences),
      winRate: pairs.length ? 100 * differences.filter(x => x < -1e-9).length / pairs.length : null, signP: signP(differences),
      geometricTimeRatio: logs.length ? Math.exp(mean(logs)) : null, logTimeTest: pairedT(logs), differences,
      practicalThreshold: 0.5, practicalMeaning: paired.mean === null ? 'Veri yok.' : Math.abs(paired.mean) < 0.5 ? 'Ortalama fark önerilen 0,5 yüzde puan eşiğinin altında.' : 'Ortalama fark önerilen 0,5 yüzde puan eşiğini aşıyor; süre ve kuyruk performansıyla birlikte yorumlayın.' })
  }
  const p = holmAdjust(output.map(r => r.stratified.p)); const ordinary = holmAdjust(output.map(r => r.paired.p)); const signs = holmAdjust(output.map(r => r.signP))
  return output.map((r, i) => ({ ...r, holmP: p[i], pairedHolmP: ordinary[i], signHolmP: signs[i], familySize: output.length }))
}
