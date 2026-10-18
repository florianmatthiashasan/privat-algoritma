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
    <section className="panel"><div className="panel-head"><div><h2>Eşleştirilmiş istatistiksel karşılaştırma</h2><p>Deneyin tamamı: {totalCount} temel problem. Yukarıdaki görünüm filtreleri hipotez testlerini değiştirmez.</p></div></div>
      <p className="prose">H₀: ortalama sapma farkı sıfırdır. H₁: farklıdır. Fark = ilk yöntem − ikinci yöntem; negatif değer ilk yöntem lehinedir. Aynı problem kimlikleri eşleştirilir. Ana koşul ve b/h alt seviyesine göre tabakalı t yaklaşımı ve 2.000 tekrarlı eşleştirilmiş bootstrap birlikte verilir. Tam deneyde 90 çıkarım tabakası vardır. Bunlar yaklaşık çıkarımlardır; normallik veya genellenebilirlik garantisi değildir.</p>
      <div className="table-wrap"><table className="experiment-table"><thead><tr><th>Model / çift</th><th>n / dışlanan</th><th>Ort. fark (yp)</th><th>Tekil %95 GA<small>Tabakalı t / bootstrap</small></th><th>t / sd</th><th>Ham p</th><th>Holm p<small>6 karşılaştırma</small></th></tr></thead><tbody>{comparisons.map((c, i) => <tr key={`${c.mode}-${c.a}-${c.b}`} className={i === index ? 'selected-stat' : ''}><td><button className="stat-method" onClick={() => setIndex(i)}>{label(c.a)} − {label(c.b)}<small>{c.mode === 'backlog' ? 'Yok satmalı' : 'Yok satmasız'}</small></button></td><td>{c.n} / {c.excluded}</td><td>{fmt(c.meanDifference)}</td><td>{ci(c.stratified.ci)}<small>{ci(c.bootstrapCI)}</small></td><td>{fmt(c.stratified.t)}<small>{fmt(c.stratified.df, 1)}</small></td><td>{p(c.stratified.p)}</td><td>{p(c.holmP)}</td></tr>)}</tbody></table></div>
      <p className="prose">sd, serbestlik derecesidir. GA’lar tekil %95 güven aralıklarıdır; eşzamanlı aralık değildir. Holm düzeltmesi iki modelde önceden tanımlanan altı karşılaştırmayı kapsar. p≥0,05 yöntemlerin eşitliği veya optimumluk kanıtı değildir. Tabakada iki geçerli eşleşme yoksa tabakalı t/CI üretilmez; sıfır varyans varsa t/p tanımsızdır.</p>
    </section>
    <section className="panel diagnostics"><div className="panel-head"><div><h2>{label(item.a)} − {label(item.b)}: varsayım ve uygulama yorumu</h2><p>Üst tablodan yöntem çiftini seçin · yp = yüzde puan</p></div></div>
      <div className="diagnostic-grid"><div><span>Çarpıklık / aşırı basıklık</span><strong>{fmt(item.diagnostics.skewness)} / {fmt(item.diagnostics.excessKurtosis)}</strong></div><div><span>IQR kuralıyla uç değer / eşit fark</span><strong>{item.diagnostics.outliers} / {item.diagnostics.ties}</strong></div><div><span>İlk yöntemin kazanma oranı</span><strong>%{fmt(item.winRate, 1)}</strong></div><div><span>Geometrik süre oranı (ilk / ikinci)</span><strong>{fmt(item.geometricTimeRatio)}×</strong></div></div>
      <p className="prose">{item.diagnostics.warning} {item.practicalMeaning} Eşik araştırmacı önerisidir; hocanın zorunlu ölçütü değildir. Ortalama fark bir yöntemin her problemde iyi olduğunu göstermez.</p>
      <details className="prose"><summary>Sıradan eşleştirilmiş t ve alternatif yön kontrolü</summary><p>Sıradan eşleştirilmiş t: t={fmt(item.paired.t)}, sd={fmt(item.paired.df, 1)}, p={p(item.paired.p)}, Holm p={p(item.pairedHolmP)}, tekil GA={ci(item.paired.ci)}, d<sub>z</sub>={fmt(item.paired.effectDz)}. Farklı deney hücrelerini tek dağılım gibi ele aldığı için ana tabakalı sonuçla birlikte okunmalıdır.</p><p>Bağlar çıkarılarak iki yönlü işaret testi: p={p(item.signP)}, Holm p={p(item.signHolmP)}. Bu, kazanma yönünü sınar; ortalama fark hipotezini sınamaz. Wilcoxon otomatik seçilmez; onun da simetri varsayımı vardır. Süre oranı tanımlayıcıdır; tekrarlar bağımsız problem sayılmaz.</p></details>
    </section>
    <div className="chart-pair"><Histogram values={item.differences} title={`${label(item.a)} − ${label(item.b)} fark dağılımı`} unit="yüzde puan"/><QQPlot values={item.differences}/></div>
  </section>
}
