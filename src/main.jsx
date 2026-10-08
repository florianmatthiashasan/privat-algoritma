import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BarChart3, Boxes, CheckCircle2, ChevronDown, CircleHelp, Database, Factory, Home,
  MoreHorizontal, PackageOpen, Play, Plus, Settings, Sparkles, Trash2, SlidersHorizontal
} from 'lucide-react'
import './styles.css'

const methods = [
  { id: 'l4l', name: 'Lot-for-Lot', short: 'L4L', description: 'Her dönemin talebini yalnızca o dönemde karşılar.' },
  { id: 'silver', name: 'Silver-Meal', short: 'SM', description: 'Ortalama dönem maliyetini en düşükte tutar.' },
  { id: 'luc', name: 'Least Unit Cost', short: 'LUC', description: 'Birim başına maliyeti en düşükte tutar.' },
  { id: 'ww', name: 'Wagner–Whitin', short: 'WW', description: 'Dinamik programlama ile küresel optimumu bulur.' },
  { id: 'ppb', name: 'Part-Period Balancing', short: 'PPB', description: 'Hazırlık ve stok maliyetini dengeler.' },
  { id: 'ltc', name: 'Least Total Cost', short: 'LTC', description: 'Yakın toplam maliyet dengesini seçer.' },
]

const initialRows = [
  { demand: 120, setup: 500, holding: 5 }, { demand: 80, setup: 500, holding: 5 },
  { demand: 150, setup: 500, holding: 5 }, { demand: 90, setup: 500, holding: 5 },
  { demand: 130, setup: 500, holding: 5 }, { demand: 110, setup: 500, holding: 5 },
  { demand: 70, setup: 500, holding: 5 }, { demand: 100, setup: 500, holding: 5 },
]

const storageKeys = {
  rows: 'parti-planlama.rows.v1',
  scenarios: 'parti-planlama.scenarios.v1',
  product: 'parti-planlama.product.v1',
}

function loadLocal(key, fallback) {
  try {
    const saved = window.localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

const money = (value) => `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Math.round(value))} TL`

function holdingCost(rows, start, end) {
  return rows.slice(start + 1, end + 1).reduce((sum, row, offset) => sum + row.demand * rows[start].holding * (offset + 1), 0)
}

function lotsToPlan(rows, lots) {
  const production = Array(rows.length).fill(0)
  lots.forEach(([start, end]) => { production[start] = rows.slice(start, end + 1).reduce((s, x) => s + x.demand, 0) })
  let inventory = 0
  const stock = rows.map((row, index) => {
    inventory += production[index] - row.demand
    return inventory
  })
  const setupCost = lots.reduce((sum, [s]) => sum + rows[s].setup, 0)
  const stockCost = lots.reduce((sum, [s, e]) => sum + holdingCost(rows, s, e), 0)
  return { production, stock, lots, setupCost, stockCost, total: setupCost + stockCost }
}

function l4l(rows) { return lotsToPlan(rows, rows.map((_, i) => [i, i])) }

function silverMeal(rows) {
  const lots = []; let start = 0
  while (start < rows.length) {
    let end = start; let prev = rows[start].setup
    while (end + 1 < rows.length) {
      const candidate = holdingCost(rows, start, end + 1)
      const periods = end + 2 - start
      const avg = (rows[start].setup + candidate) / periods
      if (avg > prev) break
      prev = avg; end += 1
    }
    lots.push([start, end]); start = end + 1
  }
  return lotsToPlan(rows, lots)
}

function leastUnitCost(rows) {
  const lots = []; let start = 0
  while (start < rows.length) {
    let end = start; let quantity = rows[start].demand
    let prev = rows[start].setup / Math.max(quantity, 1)
    while (end + 1 < rows.length) {
      const nextQty = quantity + rows[end + 1].demand
      const candidate = (rows[start].setup + holdingCost(rows, start, end + 1)) / Math.max(nextQty, 1)
      if (candidate > prev) break
      prev = candidate; end += 1; quantity = nextQty
    }
    lots.push([start, end]); start = end + 1
  }
  return lotsToPlan(rows, lots)
}

function ppb(rows) {
  const lots = []; let start = 0
  while (start < rows.length) {
    const target = rows[start].setup; let end = start
    while (end + 1 < rows.length) {
      const current = holdingCost(rows, start, end)
      const next = holdingCost(rows, start, end + 1)
      if (Math.abs(next - target) > Math.abs(current - target)) break
      end += 1
    }
    lots.push([start, end]); start = end + 1
  }
  return lotsToPlan(rows, lots)
}

function leastTotalCost(rows) {
  const lots = []; let start = 0
  while (start < rows.length) {
    let end = start; let best = Math.abs(rows[start].setup - holdingCost(rows, start, start))
    for (let j = start + 1; j < rows.length; j += 1) {
      const diff = Math.abs(rows[start].setup - holdingCost(rows, start, j))
      if (diff > best) break
      best = diff; end = j
    }
    lots.push([start, end]); start = end + 1
  }
  return lotsToPlan(rows, lots)
}

function wagnerWhitin(rows) {
  const n = rows.length; const dp = Array(n + 1).fill(Infinity); const choice = Array(n).fill(0); dp[n] = 0
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = i; j < n; j += 1) {
      const candidate = rows[i].setup + holdingCost(rows, i, j) + dp[j + 1]
      if (candidate < dp[i]) { dp[i] = candidate; choice[i] = j }
    }
  }
  const lots = []; let i = 0
  while (i < n) { lots.push([i, choice[i]]); i = choice[i] + 1 }
  return lotsToPlan(rows, lots)
}

const solver = { l4l, silver: silverMeal, luc: leastUnitCost, ww: wagnerWhitin, ppb, ltc: leastTotalCost }

function IconButton({ children, label, ...props }) { return <button className="icon-button" aria-label={label} {...props}>{children}</button> }

function Sidebar({ active, onChange }) {
  const nav = [[Home, 'home', 'Ana sayfa'], [Factory, 'planning', 'Planlama'], [Database, 'data', 'Veri yönetimi'], [PackageOpen, 'products', 'Ürünler'], [BarChart3, 'reports', 'Raporlar']]
  return <aside className="sidebar"><div className="brand"><span className="brand-mark"><i></i><i></i><i></i></span><span>Planlama</span></div><nav>{nav.map(([Icon, id, label]) => <button key={id} aria-current={active === id ? 'page' : undefined} onClick={() => onChange(id)} className={active === id ? 'nav-item active' : 'nav-item'}><Icon size={19}/><span>{label}</span></button>)}</nav><div className="side-bottom"><button onClick={() => onChange('settings')} className={active === 'settings' ? 'nav-item active' : 'nav-item'}><Settings size={19}/><span>Ayarlar</span></button><div className="account"><div className="avatar">HY</div><div><b>Hasan Yücedağ</b><small>Planlama uzmanı</small></div><ChevronDown size={16}/></div></div></aside>
}

function DataTable({ rows, onChange, onAdd, onRemove }) {
  return <section className="panel data-panel"><div className="panel-head"><div><h2>Veri seti</h2><p>Her dönem için planlama parametreleri</p></div><button className="text-button" onClick={() => onChange(initialRows)}><Sparkles size={15}/> Örnek veriyi yükle</button></div><div className="table-wrap"><table className="input-table"><thead><tr><th>Dönem</th><th>Talep</th><th>Hazırlık maliyeti</th><th>Stok maliyeti</th><th></th></tr></thead><tbody>{rows.map((row, index) => <tr key={index}><td><span className="period-num">{index + 1}</span></td>{['demand', 'setup', 'holding'].map((field) => <td key={field}><input aria-label={`${field} ${index+1}`} value={row[field]} type="number" min="0" onChange={(e) => { const next = rows.map((r, i) => i === index ? { ...r, [field]: Number(e.target.value) } : r); onChange(next) }}/></td>)}<td><button className="row-delete" aria-label="Dönemi sil" onClick={() => onRemove(index)} disabled={rows.length <= 2}><Trash2 size={15}/></button></td></tr>)}</tbody></table></div><button className="add-period" onClick={onAdd}><Plus size={17}/> Yeni dönem</button></section>
}

function Comparison({ calculations, selected, onSelect }) {
  const sorted = [...calculations].sort((a, b) => a.plan.total - b.plan.total)
  return <section className="panel comparison"><div className="panel-head"><div><h2>Algoritma karşılaştırması</h2><p>Aynı veri setiyle maliyet ve plan yapısı</p></div><span className="subtle-label">{calculations.length} yöntem</span></div><div className="comparison-list"><div className="comparison-header"><span>Yöntem</span><span>Toplam maliyet</span><span>Hazırlık</span><span>Stok</span></div>{sorted.map(({ method, plan }, index) => <button className={`method-row ${selected === method.id ? 'selected' : ''}`} onClick={() => onSelect(method.id)} key={method.id}><span className="method-name"><span className="rank">{index + 1}</span><span className="radio">{selected === method.id && <span/>}</span><span><b>{method.name}</b><small>{method.description}</small></span></span><strong>{money(plan.total)}</strong><span>{money(plan.setupCost)}</span><span>{money(plan.stockCost)}</span></button>)}</div></section>
}

function PlanTimeline({ rows, plan, method, activePeriod }) {
  return <section className="panel timeline"><div className="panel-head"><div><h2>Üretim planı <span>({method.name})</span></h2><p>Dönemler ilerledikçe üretim ve stok dengesi</p></div><button className="text-button"><MoreHorizontal size={18}/></button></div><div className="timeline-table"><div className="timeline-labels"><span>Dönem</span><span>Talep</span><span>Üretim miktarı</span><span>Dönem sonu stok</span></div><div className="timeline-grid">{rows.map((row, i) => <div className={`period-column ${i === activePeriod ? 'current' : ''}`} key={i}><b>{i + 1}</b><span>{row.demand}</span><strong>{plan.production[i] || '—'}</strong><span>{plan.stock[i]}</span></div>)}</div></div><div className="timeline-legend"><span><i className="dot production"/> Üretim</span><span><i className="dot inventory"/> Dönem sonu stok</span><span className="current-note">Dönem {activePeriod + 1} inceleniyor</span></div></section>
}

function CostChart({ calculations, selected }) {
  const ordered = [...calculations].sort((a,b) => a.plan.total - b.plan.total)
  const max = Math.max(...ordered.map(x => x.plan.total))
  const selectedItem = calculations.find(item => item.method.id === selected) || calculations[0]
  return <section className="panel chart-panel"><div className="panel-head"><div><h2>Toplam maliyet</h2><p>Yöntem bazında karşılaştırma</p></div><div className="chart-selection"><span>Seçili yöntem</span><b>{selectedItem.method.name}</b><strong>{money(selectedItem.plan.total)}</strong></div></div><div className="chart"><div className="y-axis"><span>{money(max)}</span><span>{money(max / 2)}</span><span>0 TL</span></div><div className="bars">{ordered.map(({ method, plan }) => <div className="bar-unit" key={method.id}><div className="bar-track"><div className={`bar ${method.id === selected ? 'selected-bar' : ''}`} style={{ height: `${Math.max(12, plan.total / max * 100)}%` }}><span>{money(plan.total)}</span></div></div><small>{method.short}</small></div>)}</div></div></section>
}

function Summary({ plan, method }) { return <section className="panel summary"><div className="panel-head"><div><h2>Plan özeti</h2><p>Seçili üretim stratejisi</p></div></div><div className="summary-method"><span className="summary-icon"><Boxes size={20}/></span><div><b>{method.name}</b><small>{method.description}</small></div></div><dl><div><dt>Toplam maliyet</dt><dd>{money(plan.total)}</dd></div><div><dt>Hazırlık maliyeti</dt><dd>{money(plan.setupCost)}</dd></div><div><dt>Stok maliyeti</dt><dd>{money(plan.stockCost)}</dd></div><div><dt>Toplam üretim</dt><dd>{plan.production.reduce((a,b)=>a+b,0)} adet</dd></div><div><dt>Üretim dönemi</dt><dd>{plan.lots.length} / {plan.production.length}</dd></div></dl><div className="summary-foot"><span className="blue-dot"/> Hesaplama tamamlandı</div></section> }

function SectionIntro({ title, text, action }) { return <section className="page-intro section-intro"><div><h1>{title}</h1><p>{text}</p></div>{action}</section> }

function HomeView({ best, rows, onNavigate }) {
  const demand = rows.reduce((sum, row) => sum + row.demand, 0)
  return <><SectionIntro title="Çalışma alanı" text="Parti büyüklüğü deneylerinizi tek yerde yönetin; veriyi güncelleyin, algoritmaları çalıştırın ve sonuçları raporlayın." action={<button className="run-button" onClick={() => onNavigate('planning')}><Play size={16} fill="currentColor"/> Yeni analiz</button>}/><div className="home-grid"><section className="home-hero"><div><span className="home-overline">AKTİF SENARYO</span><h2>Son analiziniz hazır.</h2><p>{best.method.name}, mevcut maliyet koşullarında en düşük toplam maliyeti üretti.</p><button className="plain-action" onClick={() => onNavigate('planning')}>Planı incele <span>→</span></button></div><div className="hero-cost"><b>{money(best.plan.total)}</b><small>önerilen toplam maliyet</small></div></section><section className="panel home-stat"><span>Toplam dönemsel talep</span><strong>{demand} adet</strong><small>{rows.length} dönemden hesaplandı</small></section><section className="panel home-stat"><span>En iyi yöntem</span><strong>{best.method.short}</strong><small>{best.plan.lots.length} üretim siparişi</small></section><section className="panel quick-links"><h2>Hızlı işlemler</h2><button onClick={() => onNavigate('data')}><Database size={17}/> Veri setini düzenle</button><button onClick={() => onNavigate('reports')}><BarChart3 size={17}/> Sonuç raporunu aç</button><button onClick={() => onNavigate('products')}><PackageOpen size={17}/> Ürün seçimini yönet</button></section></div></>
}

function DataView({ rows, setRows, saved, onSave, onLoad, savedMessage }) {
  const [name, setName] = useState('Ekim senaryosu')
  return <><SectionIntro title="Veri yönetimi" text="Planlama senaryolarını doğrudan tarayıcınızda kaydedip yeniden yükleyin — veri tabanı ve sunucu olmadan." action={<button className="run-button" onClick={() => onSave(name)}><CheckCircle2 size={16}/> Senaryoyu kaydet</button>}/>{savedMessage && <div className="local-notice" role="status"><CheckCircle2 size={16}/>{savedMessage}</div>}<div className="management-grid"><section className="panel scenario-create"><div className="panel-head"><div><h2>Aktif senaryo</h2><p>Planlama ekranıyla aynı canlı veri seti</p></div></div><div className="form-row"><label>Senaryo adı<input value={name} onChange={e => setName(e.target.value)} /></label><label>Dönem sayısı<input value={rows.length} readOnly /></label></div><div className="dataset-preview">{rows.map((row, i) => <button onClick={() => setRows(rows.map((x, j) => j === i ? { ...x, demand: x.demand + 10 } : x))} key={i}><b>{i + 1}. dönem</b><span>{row.demand} adet talep</span></button>)}</div><p className="hint">Bir döneme tıklamak talebi 10 adet artırır; değişiklikler tarayıcıda yerel olarak saklanır.</p></section><section className="panel saved-list"><div className="panel-head"><div><h2>Kayıtlı senaryolar</h2><p>{saved.length} senaryo kullanılabilir</p></div></div>{saved.length ? saved.map((item, i) => <button className="saved-row" onClick={() => onLoad(item.rows)} key={`${item.name}-${i}`}><span className="summary-icon"><Database size={18}/></span><span><b>{item.name}</b><small>{item.rows.length} dönem · {item.rows.reduce((s,x)=>s+x.demand,0)} adet talep</small></span><span>Yükle →</span></button>) : <div className="empty-state">Henüz bir senaryo kaydedilmedi.</div>}</section></div></>
}

function ProductsView({ product, setProduct }) {
  const [draft, setDraft] = useState('')
  const [products, setProducts] = useState(['Standart ürün', 'Mevsimsel ürün', 'Siparişe özel ürün'])
  const add = () => { const next = draft.trim(); if (next && !products.includes(next)) { setProducts([...products, next]); setProduct(next); setDraft('') } }
  return <><SectionIntro title="Ürünler" text="Her ürün için ayrı talep ve maliyet senaryosu çalıştırmaya başlayın." action={null}/><div className="management-grid"><section className="panel products-list"><div className="panel-head"><div><h2>Ürün kataloğu</h2><p>Aktif ürünü seçin</p></div></div>{products.map(item => <button className={product === item ? 'product-row selected-product' : 'product-row'} key={item} onClick={() => setProduct(item)}><span className="summary-icon"><PackageOpen size={18}/></span><span><b>{item}</b><small>{product === item ? 'Aktif planlama ürünü' : 'Planlama için seç'}</small></span><span className="radio">{product === item && <span/>}</span></button>)}</section><section className="panel add-product"><div className="panel-head"><div><h2>Yeni ürün</h2><p>Ürün ekleyip onu aktif senaryo için seçin</p></div></div><label>Ürün adı<input placeholder="Örn. Kompakt model" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} /></label><button className="run-button" onClick={add}><Plus size={16}/> Ürünü ekle</button></section></div></>
}

function ReportsView({ calculations, rows }) {
  const [view, setView] = useState('summary')
  const ordered = [...calculations].sort((a,b) => a.plan.total - b.plan.total)
  return <><SectionIntro title="Raporlar" text="Algoritmaların maliyet farkını ve seçilen planın dönemsel etkisini izleyin." action={null}/><div className="report-tabs"><button className={view === 'summary' ? 'selected' : ''} onClick={() => setView('summary')}>Maliyet özeti</button><button className={view === 'periods' ? 'selected' : ''} onClick={() => setView('periods')}>Dönem incelemesi</button></div>{view === 'summary' ? <section className="panel report-table"><div className="panel-head"><div><h2>Yöntem sıralaması</h2><p>En düşük toplam maliyete göre sıralanır</p></div></div>{ordered.map(({method, plan}, index) => <div className="report-row" key={method.id}><span className="rank">{index+1}</span><b>{method.name}</b><span>{plan.lots.length} sipariş</span><strong>{money(plan.total)}</strong></div>)}</section> : <section className="panel report-table"><div className="panel-head"><div><h2>Dönemsel talep</h2><p>Aktif veri setindeki değişim</p></div></div><div className="demand-bars">{rows.map((row,i) => <div key={i}><span style={{height:`${Math.max(15,row.demand / Math.max(...rows.map(x=>x.demand))*100)}%`}}/><b>{row.demand}</b><small>{i+1}</small></div>)}</div></section>}</>
}

function SettingsView({ rows, setRows }) {
  const [setup, setSetup] = useState(String(rows[0]?.setup || 500))
  const [notice, setNotice] = useState('')
  const apply = () => { const value = Number(setup); if (Number.isFinite(value) && value >= 0) { setRows(rows.map(row => ({...row, setup:value}))); setNotice('Varsayılan hazırlık maliyeti tüm dönemlere uygulandı.') } }
  return <><SectionIntro title="Ayarlar" text="Çalışma alanının planlama varsayımlarını yönetin." action={null}/><section className="panel settings-panel"><div className="setting-row"><span className="summary-icon"><SlidersHorizontal size={19}/></span><label>Varsayılan hazırlık maliyeti<small>Uygulandığında tüm dönemlerin hazırlık maliyetini günceller.</small><input type="number" min="0" value={setup} onChange={e => setSetup(e.target.value)} /></label><button className="run-button" onClick={apply}>Uygula</button></div><div className="setting-row"><span className="summary-icon"><CircleHelp size={19}/></span><div><b>Hesaplama notu</b><small>Wagner–Whitin küresel optimumu, diğer yöntemler sezgisel sonuçları gösterir.</small></div></div>{notice && <div className="setting-notice"><CheckCircle2 size={16}/>{notice}</div>}</section></>
}

function HelpDialog({ onClose }) { return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={e => e.stopPropagation()}><button className="dialog-close" onClick={onClose}>×</button><h2 id="help-title">Planlama nasıl çalışır?</h2><p>Veri setine dönemsel talep, hazırlık ve stok maliyetlerini girin. “Planı çalıştır” en düşük maliyetli yöntemi seçer; karşılaştırma listesinden başka bir yöntemi inceleyebilirsiniz.</p><button className="run-button" onClick={onClose}>Anladım</button></section></div> }

function App() {
  const [rows, setRows] = useState(() => loadLocal(storageKeys.rows, initialRows))
  const [selected, setSelected] = useState('ww')
  const [activePeriod, setActivePeriod] = useState(0)
  const [activeView, setActiveView] = useState('planning')
  const [savedScenarios, setSavedScenarios] = useState(() => loadLocal(storageKeys.scenarios, []))
  const [product, setProduct] = useState(() => loadLocal(storageKeys.product, 'Standart ürün'))
  const [showHelp, setShowHelp] = useState(false)
  const [runNotice, setRunNotice] = useState('')
  const [saveNotice, setSaveNotice] = useState('')
  useEffect(() => { window.localStorage.setItem(storageKeys.rows, JSON.stringify(rows)); setSaveNotice('Aktif veri setiniz tarayıcıda yerel olarak kaydedildi.') }, [rows])
  useEffect(() => { window.localStorage.setItem(storageKeys.scenarios, JSON.stringify(savedScenarios)) }, [savedScenarios])
  useEffect(() => { window.localStorage.setItem(storageKeys.product, JSON.stringify(product)) }, [product])
  const calculations = useMemo(() => methods.map(method => ({ method, plan: solver[method.id](rows) })), [rows])
  const selectedData = calculations.find(x => x.method.id === selected) || calculations[0]
  const best = calculations.reduce((a,b) => a.plan.total < b.plan.total ? a : b)
  const addRow = () => setRows([...rows, { demand: 90, setup: rows.at(-1)?.setup || 500, holding: rows.at(-1)?.holding || 5 }])
  const removeRow = (index) => setRows(rows.filter((_, i) => i !== index))
  const runPlan = () => { setSelected(best.method.id); setActivePeriod(0); setRunNotice(`Analiz tamamlandı: ${best.method.name}, ${money(best.plan.total)} ile en düşük maliyetli yöntemdir.`) }
  const planning = <><section className="page-intro"><div><h1>Parti büyüklüğü analizi</h1><p>{product} için farklı parti büyüklüğü yöntemlerini aynı veri setiyle karşılaştırın ve üretim planını dönem dönem inceleyin.</p></div><div className="intro-actions"><label>Dönem sayısı<div className="select-like">{rows.length} dönem <ChevronDown size={17}/></div></label><button className="run-button" onClick={runPlan}><Play size={16} fill="currentColor"/> Planı çalıştır</button></div></section>{runNotice && <div className="run-notice" role="status"><CheckCircle2 size={17}/><span>{runNotice}</span><button aria-label="Çalıştırma bildirimini kapat" onClick={() => setRunNotice('')}>×</button></div>}<div className="workspace"><DataTable rows={rows} onChange={setRows} onAdd={addRow} onRemove={removeRow}/><Comparison calculations={calculations} selected={selected} onSelect={setSelected}/><PlanTimeline rows={rows} plan={selectedData.plan} method={selectedData.method} activePeriod={activePeriod}/><div className="period-stepper"><button onClick={() => setActivePeriod(Math.max(0, activePeriod - 1))} disabled={!activePeriod}>Önceki dönem</button><input type="range" min="0" max={rows.length - 1} value={activePeriod} onChange={(e) => setActivePeriod(Number(e.target.value))}/><button onClick={() => setActivePeriod(Math.min(rows.length - 1, activePeriod + 1))} disabled={activePeriod === rows.length - 1}>Sonraki dönem</button></div><CostChart calculations={calculations} selected={selected}/><Summary plan={selectedData.plan} method={selectedData.method}/></div></>
  const saveScenario = (name) => { setSavedScenarios([...savedScenarios, {name: name || 'İsimsiz senaryo', rows: rows.map(row => ({...row}))}]); setSaveNotice(`„${name || 'İsimsiz senaryo'}“ tarayıcıda yerel olarak kaydedildi.`) }
  const loadScenario = (nextRows) => { setRows(nextRows); setSaveNotice('Kayıtlı senaryo yüklendi ve aktif veri seti olarak tarayıcıya kaydedildi.') }
  const content = { home: <HomeView best={best} rows={rows} onNavigate={setActiveView}/>, planning, data: <DataView rows={rows} setRows={setRows} saved={savedScenarios} onSave={saveScenario} onLoad={loadScenario} savedMessage={saveNotice}/>, products: <ProductsView product={product} setProduct={setProduct}/>, reports: <ReportsView calculations={calculations} rows={rows}/>, settings: <SettingsView rows={rows} setRows={setRows}/> }
  const labels = {home:'Çalışma alanı', planning:'Parti büyüklüğü', data:'Veri yönetimi', products:'Ürünler', reports:'Raporlar', settings:'Ayarlar'}
  return <div className="app-shell"><Sidebar active={activeView} onChange={setActiveView}/><main><header className="topbar"><div className="crumb">Çalışma alanı <span>/</span> {labels[activeView]}</div><div className="top-actions"><span className="status"><i/> Tarayıcıda yerel olarak kaydedildi</span><IconButton label="Yardım" onClick={() => setShowHelp(true)}><CircleHelp size={19}/></IconButton></div></header><div className="content">{content[activeView]}</div></main>{showHelp && <HelpDialog onClose={() => setShowHelp(false)}/>}</div>
}

createRoot(document.getElementById('root')).render(<App />)
