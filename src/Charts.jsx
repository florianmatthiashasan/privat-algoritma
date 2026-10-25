import React from 'react'
import { quantile } from './experiments.js'

const fmt = (x, digits = 1) => x == null ? '—' : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: digits }).format(x)
const palette = ['#4f46e5', '#f59e0b', '#10b981', '#ec4899']
const grid = '#e9ecf3'
export function SeriesChart({ title, series, signed = false }) {
  const gid = React.useId().replace(/:/g, '')
  const w = 800; const h = 250; const left = 56; const right = 16; const top = 18; const bottom = 34
  const values = series.flatMap(s => s.values); const low = signed ? Math.min(0, ...values) : 0; const maximum = Math.max(0, ...values); const high = maximum === low ? maximum + 1 : maximum
  const y = x => top + (high - x) / (high - low || 1) * (h - top - bottom)
  const n = series[0]?.values.length ?? 0; const step = (w - left - right) / Math.max(1, n)
  const x = t => left + (t + 0.5) * step
  const ticks = [low, (low + high) / 2, high]
  return <section className="panel thesis-chart"><div className="panel-head"><div><h2>{title}</h2><p>Yatay: dönem · dikey: adet</p></div><div className="chart-legend">{series.map((s, j) => <span key={s.name}><i style={{ background: palette[j] }}/>{s.name}</span>)}</div></div><div className="svg-scroll"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title}><title>{title}</title>
    <defs>{series.map((s, j) => <linearGradient key={j} id={`${gid}-${j}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={palette[j]} stopOpacity=".28"/><stop offset="100%" stopColor={palette[j]} stopOpacity="0"/></linearGradient>)}</defs>
    {ticks.map((v, i) => <g key={i}><line x1={left} x2={w - right} y1={y(v)} y2={y(v)} stroke={grid} strokeDasharray={v === 0 ? '' : '4 4'}/><text x={left - 10} y={y(v) + 4} textAnchor="end">{fmt(v)}</text></g>)}
    <line x1={left} x2={w - right} y1={y(0)} y2={y(0)} stroke="#c3c9d6"/>
    {series.map((s, j) => signed
      ? <g key={s.name}><path d={`M${x(0)},${y(0)} ${s.values.map((v, t) => `L${x(t)},${y(v)}`).join(' ')} L${x(n - 1)},${y(0)} Z`} fill={`url(#${gid}-${j})`}/><polyline points={s.values.map((v, t) => `${x(t)},${y(v)}`).join(' ')} stroke={palette[j]} strokeWidth="2.5" strokeLinejoin="round" fill="none"/>{n <= 48 && s.values.map((v, t) => <circle key={t} cx={x(t)} cy={y(v)} r="3.5" fill="#fff" stroke={palette[j]} strokeWidth="2"><title>{s.name}, dönem {t + 1}: {fmt(v, 3)} adet</title></circle>)}</g>
      : <g key={s.name}>{s.values.map((v, t) => { const bw = Math.max(0.5, step * 0.72 / series.length - 2); return <rect key={t} x={left + t * step + step * 0.14 + j * (bw + 2)} y={y(v)} width={bw} height={Math.max(0, y(0) - y(v))} rx={Math.min(4, bw / 2)} fill={palette[j]}><title>{s.name}, dönem {t + 1}: {fmt(v, 3)} adet</title></rect> })}</g>)}
    {Array.from({ length: n }, (_, t) => t).filter(t => t === 0 || t === n - 1 || t % Math.ceil(n / 12) === 0).map(t => <text key={t} x={x(t)} y={h - 10} textAnchor="middle">{t + 1}</text>)}
  </svg></div></section>
}
export function Histogram({ values, title, unit = '%' }) {
  const finite = values.filter(Number.isFinite); const min = finite.length ? Math.min(0, ...finite) : 0; const max = finite.length ? Math.max(...finite) : 0
  const range = max - min || 1; const bins = Array(12).fill(0)
  for (const value of finite) bins[Math.min(11, Math.floor((value - min) / range * 12))]++
  const peak = Math.max(1, ...bins)
  return <section className="panel thesis-chart"><div className="panel-head"><div><h2>{title}</h2><p>{finite.length} problem · yatay: {unit} · dikey: problem sayısı</p></div></div><div className="svg-scroll"><svg viewBox="0 0 620 225" role="img" aria-label={title}><title>{title}</title>{[0, peak / 2, peak].map((v, i) => <g key={i}><line x1="48" x2="600" y1={180 - v / peak * 155} y2={180 - v / peak * 155} stroke="#e9ecf3"/><text x="40" y={184 - v / peak * 155} textAnchor="end">{fmt(v, 0)}</text></g>)}{bins.map((count, i) => <rect key={i} x={50 + i * 45.5} y={180 - count / peak * 155} width="40" height={count / peak * 155} fill="#4f46e5"><title>{fmt(min + i * range / 12, 3)}–{fmt(min + (i + 1) * range / 12, 3)} {unit}: {count} problem</title></rect>)}{[0, 3, 6, 9, 12].map(i => <text key={i} x={50 + i * 45.5} y="205" textAnchor="middle">{fmt(min + i * range / 12)}</text>)}</svg></div>{finite.length > 0 && <p className="chart-caption">Medyan: {fmt(quantile(finite, 0.5), 3)} {unit} · P95: {fmt(quantile(finite, 0.95), 3)} {unit}. {max === min ? 'Bütün değerler aynı; görüntü için eksen 1 birim genişletildi.' : ''}</p>}</section>
}
export function QualitySpeed({ summary, methods }) {
  const data = summary.filter(s => s.meanGap !== null && s.medianMs !== null)
  const maxX = Math.max(0.001, ...data.map(s => s.medianMs)); const maxY = Math.max(1, ...data.map(s => s.meanGap))
  return <section className="panel thesis-chart"><div className="panel-head"><div><h2>Hız–kalite karşılaştırması</h2><p>Sola ve aşağıya yakın değerler daha iyi · doğrusal eksenler sıfırdan başlar</p></div></div><div className="svg-scroll"><svg viewBox="0 0 650 280" role="img" aria-label="Medyan çözüm süresi ve ortalama optimum sapması"><title>Hız–kalite karşılaştırması</title>{[0, 0.5, 1].map(v => <g key={v}><line x1="65" x2="620" y1={220 - v * 180} y2={220 - v * 180} stroke="#e9ecf3"/><text x="55" y={224 - v * 180} textAnchor="end">{fmt(v * maxY)}%</text><text x={65 + v * 500} y="240" textAnchor="middle">{fmt(v * maxX, 3)}</text></g>)}{data.map((s, i) => <g key={s.method}><circle cx={65 + s.medianMs / maxX * 500} cy={220 - s.meanGap / maxY * 180} r="5" fill={palette[i % 4]}><title>{methods.find(m => m.id === s.method)?.name}: %{fmt(s.meanGap, 3)}, {fmt(s.medianMs, 4)} ms</title></circle><text x={72 + s.medianMs / maxX * 500} y={216 - s.meanGap / maxY * 180 + (i % 2) * 13}>{methods.find(m => m.id === s.method)?.short}</text></g>)}<text x="335" y="270" textAnchor="middle">Problem başına medyan süre (ms)</text><text x="65" y="20">Ortalama sapma (%)</text></svg></div></section>
}
// Acklam normal quantile approximation, used for a visual diagnostic, not a test.
function normalQuantile(p) {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924]
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857]
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878]
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742]
  if (p < 0.02425 || p > 0.97575) { const q = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p)); const v = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); return p < 0.5 ? v : -v }
  const q = p - 0.5; const r = q * q
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}
export function QQPlot({ values }) {
  const xs = [...values].sort((a, b) => a - b); const low = Math.min(0, ...xs); const high = Math.max(0, ...xs); const range = high - low || 1
  const points = xs.map((v, i) => ({ x: normalQuantile((i + 0.5) / xs.length), y: v })); const maxX = Math.max(1, ...points.map(p => Math.abs(p.x)))
  return <section className="panel thesis-chart"><div className="panel-head"><div><h2>Eşleştirilmiş farkların Q–Q grafiği</h2><p>Yatay: standart normal kuramsal nicelik · dikey: fark (yüzde puan)</p></div></div><div className="svg-scroll"><svg viewBox="0 0 620 230" role="img" aria-label="Eşleştirilmiş farkların normal Q–Q grafiği"><title>Normal Q–Q grafiği</title>{[low, (low + high) / 2, high].map((v, i) => <g key={i}><text x="55" y={184 - (v - low) / range * 155} textAnchor="end">{fmt(v, 2)}</text><line x1="65" x2="590" y1={180 - (v - low) / range * 155} y2={180 - (v - low) / range * 155} stroke="#e9ecf3"/></g>)}{points.map((p, i) => <circle key={i} cx={65 + (p.x + maxX) / (2 * maxX) * 520} cy={180 - (p.y - low) / range * 155} r="2.2" fill="#4f46e5"/>)}{[-maxX, 0, maxX].map(x => <text key={x} x={65 + (x + maxX) / (2 * maxX) * 520} y="210" textAnchor="middle">{fmt(x)}</text>)}</svg></div></section>
}
