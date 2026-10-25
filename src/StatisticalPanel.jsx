import React, { useState } from 'react'
import { Histogram, QQPlot } from './Charts.jsx'
import { methods } from './lotSizing.js'
const label = id => methods.find(m => m.id === id)?.short ?? id
const fmt = (x, digits = 3) => x == null ? '—' : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: digits }).format(x)
const p = x => x == null ? '—' : x < 0.0001 ? '<0,0001' : fmt(x, 4)
const ci = values => `[${fmt(values[0])}; ${fmt(values[1])}]`
export default function StatisticalPanel({ comparisons, totalCount }) {
  const [index, setIndex] = useState(0); const item = comparisons[index] ?? comparisons[0]
  if (!item) return null
  return <section className="statistical-section">
    <section className="panel"><div className="panel-head"><div><h2>Eşleştirilmiş istatistiksel karşılaştırma</h2><p>Deneyin tamamı: {totalCount} temel problem. Görünüm filtreleri testleri etkilemez.</p></div></div>
      <p className="prose">H₀: iki yöntemin ortalama sapma farkı sıfırdır. H₁: fark sıfırdan farklıdır. Fark = ilk yöntem − ikinci yöntem (yüzde puan); negatif değer ilk yöntemin lehinedir. Aynı problemler eşleştirilir. Ana sonuç, ana koşul ve b/h düzeyine göre tabakalı t testidir (tam deneyde 90 tabaka); 2.000 tekrarlı tabakalı bootstrap aralığı ile desteklenir.</p>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Model / çift</th><th>n / dışlanan</th><th>Ort. fark (yp)</th><th>%95 GA<small>Tabakalı t / bootstrap</small></th><th>t / sd</th><th>Ham p</th><th>Holm p<small>6 karşılaştırma</small></th></tr></thead><tbody>{comparisons.map((c, i) => <tr key={`${c.mode}-${c.a}-${c.b}`} className={i === index ? 'is-selected' : ''}><td><button className="stat-method" onClick={() => setIndex(i)}>{label(c.a)} − {label(c.b)}<small>{c.mode === 'backlog' ? 'Yok satmalı' : 'Yok satmasız'}</small></button></td><td>{c.n} / {c.excluded}</td><td>{fmt(c.meanDifference)}</td><td>{ci(c.stratified.ci)}<small>{ci(c.bootstrapCI)}</small></td><td>{fmt(c.stratified.t)}<small>{fmt(c.stratified.df, 1)}</small></td><td>{p(c.stratified.p)}</td><td>{p(c.holmP)}</td></tr>)}</tbody></table></div>
      <p className="prose">sd: serbestlik derecesi · GA: güven aralığı · yp: yüzde puan. Holm düzeltmesi iki modeldeki altı karşılaştırmanın tamamını kapsar. p ≥ 0,05 sonucu yöntemlerin eşit olduğu biçiminde yorumlanmaz. Bir tabakada en az iki geçerli eşleşme yoksa veya farkların varyansı sıfırsa t ve p hesaplanmaz.</p>
    </section>
    <section className="panel diagnostics"><div className="panel-head"><div><h2>{label(item.a)} − {label(item.b)}: dağılım ve pratik anlam</h2><p>Yöntem çiftini üstteki tablodan seçin.</p></div></div>
      <div className="diagnostic-grid"><div><span>Çarpıklık / aşırı basıklık</span><strong>{fmt(item.diagnostics.skewness)} / {fmt(item.diagnostics.excessKurtosis)}</strong></div><div><span>Uç değer (IQR) / sıfır fark</span><strong>{item.diagnostics.outliers} / {item.diagnostics.ties}</strong></div><div><span>İlk yöntemin daha iyi olduğu problemler</span><strong>%{fmt(item.winRate, 1)}</strong></div><div><span>Geometrik süre oranı (ilk / ikinci)</span><strong>{fmt(item.geometricTimeRatio)}×</strong></div></div>
      <p className="prose">{item.diagnostics.warning} {item.practicalMeaning}</p>
      <details className="prose"><summary>Sıradan eşleştirilmiş t testi ve işaret testi</summary><p>Sıradan eşleştirilmiş t: t = {fmt(item.paired.t)}, sd = {fmt(item.paired.df, 1)}, p = {p(item.paired.p)}, Holm p = {p(item.pairedHolmP)}, %95 GA = {ci(item.paired.ci)}, d<sub>z</sub> = {fmt(item.paired.effectDz)}. Bu test bütün deney koşullarını tek bir dağılım gibi ele aldığından ana sonuç tabakalı testtir.</p><p>İşaret testi (sıfır farklar çıkarılarak, iki yönlü): p = {p(item.signP)}, Holm p = {p(item.signHolmP)}. Bu test ortalama farkı değil, hangi yöntemin daha sık kazandığını sınar.</p></details>
    </section>
    <div className="chart-pair"><Histogram values={item.differences} title={`${label(item.a)} − ${label(item.b)} fark dağılımı`} unit="yüzde puan"/><QQPlot values={item.differences}/></div>
  </section>
}
