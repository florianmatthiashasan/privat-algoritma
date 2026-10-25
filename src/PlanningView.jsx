import React, { useMemo, useState } from 'react'
import { Database, Plus, Trash2 } from 'lucide-react'
import { methods, solver, validateRows, methodRole, referenceName } from './lotSizing.js'
import { relativeGap } from './experiments.js'
import { SeriesChart } from './Charts.jsx'
import { PageHead, Segmented, Tabs } from './UI.jsx'
export const money = x => `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(x)} TL`
const number = x => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 4 }).format(x)
const percent = gap => gap === null ? 'tanımsız' : `%${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(gap)}`
export const exampleRows = [10, 20, 10].map(demand => ({ demand, setup: 50, holding: 2, backlog: 0.5 }))
export const sampleRows = [50, 40, 80, 100, 60, 30].map((demand, t) => ({ demand, setup: [100, 100, 80, 90, 100, 100][t], holding: [1, 2, 2, 1, 1, 2][t], backlog: 1 }))
const fields = { demand: ['Talep', 'adet'], setup: ['Hazırlık', 'TL'], holding: ['Stok', 'TL/adet'], backlog: ['Yok satma', 'TL/adet'] }
export function calculateWorkspace(workspace) {
  try {
    validateRows(workspace.rows, { allowBacklog: true })
    if (!Number.isFinite(workspace.unitCost) || workspace.unitCost < 0 || workspace.unitCost > 1e9) throw new Error('Sabit birim üretim maliyeti 0–1.000.000.000 arasında olmalıdır.')
    return { calculations: methods.map(method => ({ method, plan: solver[method.id](workspace.rows, workspace) })), error: '' }
  } catch (e) { return { calculations: [], error: e.message.replaceAll('demand', 'talep').replaceAll('setup', 'hazırlık').replaceAll('holding', 'stok').replaceAll('backlog', 'gecikme') } }
}
export const methodTitle = (id, allowBacklog) => id === 'ww' ? referenceName(allowBacklog) : methods.find(m => m.id === id)?.name ?? id

function TracePanel({ trace, method }) {
  const [step, setStep] = useState(0); const [page, setPage] = useState(0)
  const index = Math.min(step, Math.max(0, trace.length - 1)); const item = trace[index]
  if (!item) return <p className="muted">Bu veri setinde talep olmadığı için üretim kararı gerekmiyor.</p>
  const scoreLabel = method === 'silver' ? 'TL / dönem' : method === 'luc' ? 'TL / adet' : method === 'merge' ? 'Tasarruf TL (büyük iyi)' : ['foq', 'eoq'].includes(method) ? 'Sipariş miktarı (adet)' : method === 'meoq' ? '|Toplam − Q₀| (küçük iyi)' : ['fpq', 'poq'].includes(method) ? 'Kapsanan dönem' : 'Kriter (küçük iyi)'
  const costLabel = ['meoq', 'fpq', 'poq'].includes(method) ? 'Toplam talep (adet)' : ['foq', 'eoq'].includes(method) ? 'Hazırlık maliyeti TL' : 'Aday maliyeti TL'
  const go = i => { setStep(i); setPage(0) }
  return <div className="trace">
    <div className="trace-controls"><button className="secondary-button" disabled={!index} onClick={() => go(index - 1)}>← Önceki</button><label>Karar adımı<select aria-label="Karar adımı" value={index} onChange={e => go(Number(e.target.value))}>{trace.map((_, i) => <option key={i} value={i}>{i + 1} / {trace.length}</option>)}</select></label><button className="secondary-button" disabled={index === trace.length - 1} onClick={() => go(index + 1)}>Sonraki →</button></div>
    <p className="callout">{item.explanation}</p>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Talep aralığı</th><th>Üretim dönemi</th><th className="num">{costLabel}</th><th className="num">{scoreLabel}</th><th>Karar</th></tr></thead><tbody>{item.candidates.slice(page * 20, page * 20 + 20).map((c, i) => <tr key={i} className={c.chosen ? 'is-selected' : ''}><td>{c.start + 1}–{c.end + 1}</td><td>{c.periods ? c.periods.map(p => p + 1).join(', ') || 'Üretim yok' : c.period + 1}</td><td className="num">{number(c.cost)}{c.prefixCost !== undefined && <small>Ön ek {number(c.prefixCost)} + aralık {number(c.intervalCost)}</small>}</td><td className="num">{number(c.score)}</td><td>{c.chosen ? <span className="tag tag-good">Seçildi</span> : c.accepted === false ? <span className="tag tag-warn">Durdurma</span> : <span className="muted">Değerlendirildi</span>}</td></tr>)}</tbody></table></div>
    {item.candidates.length > 20 && <div className="pager"><button className="secondary-button" disabled={!page} onClick={() => setPage(page - 1)}>Önceki adaylar</button><span>{page + 1} / {Math.ceil(item.candidates.length / 20)}</span><button className="secondary-button" disabled={(page + 1) * 20 >= item.candidates.length} onClick={() => setPage(page + 1)}>Sonraki adaylar</button></div>}
  </div>
}

function Ranking({ calculations, exact, allowBacklog, selected, onSelect }) {
  const rows = [...calculations].map(c => ({ ...c, gap: relativeGap(c.plan.total, exact.plan.total) })).sort((a, b) => a.plan.total - b.plan.total || (a.method.id === 'ww' ? -1 : b.method.id === 'ww' ? 1 : 0))
  const maxGap = Math.max(1, ...rows.map(r => r.gap ?? 0))
  return <ol className="ranking">{rows.map(({ method, plan, gap }, index) => {
    const role = methodRole(method.id, allowBacklog)
    return <li key={method.id}><button className={selected === method.id ? 'is-selected' : ''} aria-pressed={selected === method.id} onClick={() => onSelect(method.id)}>
      <span className="rank-pos">{index + 1}</span>
      <span className={`badge badge-${role.kind}`}>{method.short}</span>
      <span className="rank-name"><b>{methodTitle(method.id, allowBacklog)}</b><small>{role.label}</small></span>
      <span className="rank-bar" aria-hidden="true"><i style={{ width: `${gap === null ? 100 : Math.max(gap === 0 ? 0 : 2, gap / maxGap * 100)}%` }} className={gap === 0 ? 'zero' : ''}/></span>
      <span className="rank-gap">{gap === 0 ? <span className="tag tag-good">optimum</span> : `+${percent(gap)}`}</span>
      <span className="rank-cost">{money(plan.total)}</span>
    </button></li>
  })}</ol>
}

function PlanTab({ rows, plan }) {
  const [period, setPeriod] = useState(0); const active = Math.min(period, rows.length - 1)
  return <>
    <div className="metrics"><div><span>Karar maliyeti</span><strong>{money(plan.total)}</strong><small>Hazırlık + stok + yok satma</small></div><div><span>Üretim dahil toplam</span><strong>{money(plan.grandTotal)}</strong><small>Üretim maliyeti {money(plan.productionCost)}</small></div><div><span>Üretim yapılan dönem</span><strong>{plan.production.filter(q => q > 0).length} <em>/ {rows.length}</em></strong><small>En yüksek bekleyen talep {number(plan.maxBacklog)} adet</small></div></div>
    {plan.endStock > 0 && <p className="callout">Bu yöntem, tanımı gereği planlama ufkunun sonunda <b>{number(plan.endStock)} adet</b> stok bırakır; bu stokun son dönemdeki tutma maliyeti karar maliyetine dahildir.</p>}
    <div className="chart-pair"><SeriesChart title="Talep ve üretim" series={[{ name: 'Talep', values: rows.map(r => r.demand) }, { name: 'Üretim', values: plan.production }]}/><SeriesChart title="Net stok" signed series={[{ name: 'Net stok (eksi = bekleyen talep)', values: plan.stock }]}/></div>
    <h3 className="section-title">Dönem dönem plan</h3>
    <p className="callout"><b>{active + 1}. dönem:</b> önceki net stok {number(active ? plan.stock[active - 1] : 0)} + üretim {number(plan.production[active])} − talep {number(rows[active].demand)} = <b>{number(plan.stock[active])}</b>. Başka bir dönemi incelemek için satıra tıklayın.</p>
    <div className="table-wrap"><table className="data-table clickable"><thead><tr><th>Dönem</th><th className="num">Talep</th><th className="num">Üretim</th><th className="num">Fiziksel stok</th><th className="num">Bekleyen talep</th><th className="num">Net stok</th></tr></thead><tbody>{rows.map((r, t) => <tr key={t} className={t === active ? 'is-selected' : ''} onClick={() => setPeriod(t)}><td><button className="link-button" onClick={() => setPeriod(t)}>{t + 1}</button></td><td className="num">{number(r.demand)}</td><td className="num">{plan.production[t] > 0 ? <b>{number(plan.production[t])}</b> : <span className="muted">–</span>}</td><td className="num">{number(plan.inventory[t])}</td><td className="num">{number(plan.backlog[t])}</td><td className="num">{number(plan.stock[t])}</td></tr>)}</tbody></table></div>
  </>
}

function CostTab({ calculations, chosen, rows, allowBacklog }) {
  const saving = solver.ww(rows).total - solver.ww(rows, { allowBacklog: true }).total
  const sorted = [...calculations].sort((a, b) => a.plan.total - b.plan.total)
  return <>
    <div className="metrics four">{[['Hazırlık', chosen.plan.setupCost], ['Stok', chosen.plan.stockCost], ['Yok satma', chosen.plan.backlogCost], ['Üretim', chosen.plan.productionCost]].map(([name, value]) => <div key={name}><span>{name}</span><strong>{money(value)}</strong></div>)}</div>
    <p className="callout">Aynı veride yok satmaya izin verilmesi optimum maliyeti <b>{money(saving)}</b> düşürür. Bekleyen talepler planlama ufkunun sonuna kadar karşılanır. Sabit birim üretim maliyeti bütün yöntemlere aynı tutarı ekler ve sıralamayı değiştirmez.</p>
    <h3 className="section-title">Bütün yöntemlerin maliyet bileşenleri</h3>
    <div className="table-wrap"><table className="data-table"><thead><tr><th>Yöntem</th><th className="num">Hazırlık</th><th className="num">Stok</th><th className="num">Yok satma</th><th className="num">Karar maliyeti</th><th className="num">Üretim dahil</th></tr></thead><tbody>{sorted.map(({ method, plan }) => <tr key={method.id} className={method.id === chosen.method.id ? 'is-selected' : ''}><td>{methodTitle(method.id, allowBacklog)}</td><td className="num">{money(plan.setupCost)}</td><td className="num">{money(plan.stockCost)}</td><td className="num">{money(plan.backlogCost)}</td><td className="num"><b>{money(plan.total)}</b></td><td className="num">{money(plan.grandTotal)}</td></tr>)}</tbody></table></div>
  </>
}

export default function PlanningView({ workspace, setWorkspace, product, products, activeProduct, onProduct, selected, setSelected, tab, setTab }) {
  const [undo, setUndo] = useState(null)
  const { rows, allowBacklog, unitCost } = workspace
  const { calculations, error } = useMemo(() => calculateWorkspace(workspace), [workspace])
  const chosen = calculations.find(c => c.method.id === selected) ?? calculations.find(c => c.method.id === 'ww')
  const exact = calculations.find(c => c.method.id === 'ww')
  const traced = useMemo(() => error || tab !== 'trace' || !chosen ? null : solver[chosen.method.id](rows, { allowBacklog, unitCost, trace: true }), [rows, allowBacklog, unitCost, chosen, error, tab])
  const count = value => {
    const n = Math.max(1, Math.min(120, Math.trunc(Number(value)) || 1))
    setWorkspace({ ...workspace, rows: n <= rows.length ? rows.slice(0, n) : [...rows, ...Array.from({ length: n - rows.length }, () => ({ ...(rows.at(-1) ?? { setup: 100, holding: 1, backlog: 1 }), demand: 100 }))] })
  }
  const visibleFields = Object.entries(fields).filter(([key]) => key !== 'backlog' || allowBacklog)
  const select = id => { setSelected(id); requestAnimationFrame(() => document.getElementById('method-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }
  const gap = chosen && exact ? relativeGap(chosen.plan.total, exact.plan.total) : null
  return <>
    <PageHead step="Adım 1 / 3" title="Tek problem çözümü" actions={<a className="secondary-button" href="#data"><Database size={15}/>Veri ve kayıtlar</a>}>Veriler soldaki tabloda düzenlenir; on dört yöntemin sonuçları sağda anında güncellenir. Bir yönteme tıklandığında planı aşağıda açılır.</PageHead>
    <div className="problem-layout">
      <section className="card editor-card" aria-labelledby="data-title">
        <div className="card-head"><div><h2 id="data-title"><span className="num-dot">1</span>Veriler</h2><p>{products.length > 1 ? '' : `${product} · `}{rows.length} dönem · toplam talep {rows.every(r => Number.isFinite(r.demand)) ? number(rows.reduce((a, r) => a + r.demand, 0)) : '—'} adet</p></div>{products.length > 1 && <select aria-label="Aktif ürün" value={activeProduct} onChange={e => { onProduct(e.target.value); setUndo(null) }}>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</div>
        <div className="card-body">
          <Segmented label="Talep karşılama modeli" value={allowBacklog ? 'backlog' : 'noBacklog'} onChange={id => setWorkspace({ ...workspace, allowBacklog: id === 'backlog' })} options={[['noBacklog', 'Yok satmasız', 'Talep kendi döneminde karşılanır'], ['backlog', 'Yok satmalı', 'Talep sonraki dönemde, maliyetle karşılanır']]}/>
          <div className="field-row"><label>Dönem sayısı<input aria-label="Planlama dönem sayısı" type="number" min="1" max="120" value={rows.length} onChange={e => count(e.target.value)}/></label><label>Birim üretim maliyeti c (TL/adet)<input aria-label="Sabit üretim maliyeti" type="number" min="0" max="1000000000" step="any" value={Number.isNaN(unitCost) ? '' : unitCost} onChange={e => setWorkspace({ ...workspace, unitCost: e.target.value === '' ? NaN : Number(e.target.value) })}/></label></div>
          {undo && <div className="notice" role="status">Dönem kaldırıldı.<button className="link-button" onClick={() => { setWorkspace(undo); setUndo(null) }}>Geri al</button></div>}
          <div className="table-wrap input-wrap"><table className="input-table"><thead><tr><th>t</th>{visibleFields.map(([key, [label, unit]]) => <th key={key}>{label}<small>{unit}</small></th>)}<th><span className="sr-only">Sil</span></th></tr></thead><tbody>{rows.map((row, t) => <tr key={t}><td>{t + 1}</td>{visibleFields.map(([key, [label]]) => <td key={key}><input type="number" min="0" max="1000000000" step="any" aria-label={`${label} ${t + 1}`} aria-invalid={!Number.isFinite(row[key]) || row[key] < 0 || row[key] > 1e9} value={Number.isNaN(row[key]) ? '' : row[key]} onChange={e => setWorkspace({ ...workspace, rows: rows.map((r, i) => i === t ? { ...r, [key]: e.target.value === '' ? NaN : Number(e.target.value) } : r) })}/></td>)}<td><button className="icon-button" aria-label={`${t + 1}. dönemi sil`} disabled={rows.length === 1} onClick={() => { setUndo(workspace); setWorkspace({ ...workspace, rows: rows.filter((_, i) => i !== t) }) }}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div>
          <div className="editor-footer"><button className="secondary-button" disabled={rows.length >= 120} onClick={() => count(rows.length + 1)}><Plus size={15}/>Dönem ekle</button><span className="muted">Örnek yükle:</span><button className="link-button" onClick={() => setWorkspace({ ...workspace, rows: sampleRows.map(r => ({ ...r })) })}>Örnek problem</button><button className="link-button" onClick={() => setWorkspace({ ...workspace, rows: exampleRows.map(r => ({ ...r })) })}>Mini örnek</button></div>
        </div>
      </section>
      <section className="card result-card" aria-labelledby="result-title">
        <div className="card-head"><div><h2 id="result-title"><span className="num-dot">2</span>Sonuç</h2><p>Referans: {referenceName(allowBacklog)} (kesin optimum)</p></div></div>
        {error ? <div className="card-body"><div className="alert" role="alert"><b>Girdi geçersiz.</b> {error} Değer düzeltildiğinde sonuçlar yeniden hesaplanır.</div></div> : <div className="card-body">
          <div className="optimum"><span>Optimum karar maliyeti</span><strong>{money(exact.plan.total)}</strong><small>{exact.plan.production.filter(q => q > 0).length} üretim dönemi · hazırlık + stok{allowBacklog ? ' + yok satma' : ''}</small></div>
          <Ranking calculations={calculations} exact={exact} allowBacklog={allowBacklog} selected={chosen.method.id} onSelect={select}/>
          <p className="hint">Çubuk = optimumdan yüzde sapma. Renk: <span className="badge badge-exact">kesin</span> <span className="badge badge-heuristic">sezgisel</span>{allowBacklog && <> <span className="badge badge-baseline">temel plan</span> (yok satma kullanmayan klasik yöntem)</>}</p>
        </div>}
      </section>
    </div>
    {!error && chosen && <section className="card detail-card" id="method-detail" aria-labelledby="detail-title">
      <div className="card-head"><div><h2 id="detail-title"><span className="num-dot">3</span>{methodTitle(chosen.method.id, allowBacklog)}</h2><p>{methodRole(chosen.method.id, allowBacklog).label} · {chosen.method.description} {chosen.method.id === 'ww' ? '' : `Optimumdan sapma: ${percent(gap)}.`}</p></div><select aria-label="İncelenen yöntem" value={chosen.method.id} onChange={e => setSelected(e.target.value)}>{calculations.map(({ method }) => <option key={method.id} value={method.id}>{method.short} · {methodTitle(method.id, allowBacklog)}</option>)}</select></div>
      <div className="card-body"><Tabs label="Plan ayrıntıları" active={tab} onChange={setTab} tabs={[
        { id: 'plan', label: 'Üretim planı', render: () => <PlanTab rows={rows} plan={chosen.plan}/> },
        { id: 'costs', label: 'Maliyet', render: () => <CostTab calculations={calculations} chosen={chosen} rows={rows} allowBacklog={allowBacklog}/> },
        { id: 'trace', label: 'Algoritma adım adım', render: () => <TracePanel key={`${chosen.method.id}-${rows.length}`} trace={traced?.trace ?? []} method={chosen.method.id}/> },
      ]}/></div>
    </section>}
    <div className="next-step"><p>Tek problemde görülen farkların genelleşip genelleşmediği <b>300 rastgele problemle</b> test edilir.</p><a className="run-button" href="#experiments">Adım 2: Deney →</a></div>
  </>
}
