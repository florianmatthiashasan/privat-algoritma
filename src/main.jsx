import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowRight, CircleHelp, Download, FileText, FlaskConical, PackageOpen, Printer, Table2 } from 'lucide-react'
import PlanningView, { bookRows, calculateWorkspace, methodTitle, money } from './PlanningView.jsx'
import ExperimentView from './ExperimentView.jsx'
import DataManagement from './DataManagement.jsx'
import ThesisGuide from './ThesisGuide.jsx'
import { MODEL_VERSION, methods, methodRole, referenceName } from './lotSizing.js'
import { DESIGN_VERSION, defaultConfig, generateProblems, recordsToCSV } from './experiments.js'
import { normalizeRows } from './persistence.js'
import { download, jsonDownload } from './download.js'
import { reportMarkdown, statisticsCSV } from './report.js'
import { Empty, PageHead } from './UI.jsx'
import './styles.css'
const defaultWorkspace = () => ({ rows: bookRows.map(r => ({ ...r })), allowBacklog: false, unitCost: 0 })
function loadLocal(key, fallback) { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback } catch { return fallback } }
function loadStore() {
  const stored = loadLocal('parti-tez.workspace.v2', null)
  if (stored?.products?.length) {
    try { for (const p of stored.products) { normalizeRows(p.workspace.rows); if (!Number.isFinite(p.workspace.unitCost) || p.workspace.unitCost < 0 || p.workspace.unitCost > 1e9) throw new Error() }; if (!stored.products.some(p => p.id === stored.activeId)) stored.activeId = stored.products[0].id; return stored } catch { /* recover valid legacy data below */ }
  }
  let workspace = defaultWorkspace()
  try { workspace = { rows: normalizeRows(loadLocal('parti-planlama.rows.v1', bookRows)), allowBacklog: loadLocal('parti-planlama.backlog.v1', false) === true, unitCost: 0 } } catch { /* use the book example */ }
  return { activeId: 'standard', products: [{ id: 'standard', name: loadLocal('parti-planlama.product.v1', 'Standart ürün'), workspace }] }
}
const nav = [['start', 'Başlangıç'], ['planning', 'Problem', 1], ['experiments', 'Deney', 2], ['reports', 'Rapor', 3], ['guide', 'Rehber']]
const titles = { start: 'Başlangıç', planning: 'Problem', experiments: 'Deney', reports: 'Rapor', guide: 'Rehber', data: 'Veri ve kayıtlar', products: 'Ürünler', settings: 'Toplu maliyet' }
const route = () => location.hash.slice(1) in titles ? location.hash.slice(1) : 'start'
const fmt = (x, d = 2) => x == null ? '—' : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: d, minimumFractionDigits: d }).format(x)

function Navigation({ active, onHelp }) {
  const current = ['data', 'products', 'settings'].includes(active) ? 'planning' : active
  return <header className="app-header"><div className="header-inner">
    <a className="brand" href="#start" aria-label="Parti büyüklüğü — başlangıç"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span>Parti büyüklüğü<small>Tez çalışma alanı</small></span></a>
    <nav className="primary-nav" aria-label="Ana gezinme">{nav.map(([id, label, n]) => <a key={id} href={`#${id}`} aria-current={current === id ? 'page' : undefined}>{n && <span className="nav-num">{n}</span>}{label}</a>)}</nav>
    <button className="icon-button help-button" onClick={onHelp} aria-label="Yardım"><CircleHelp size={19}/></button>
  </div></header>
}

const groups = [
  ['exact', 'Kesin referans', 'Her problemde gerçek optimumu bulur; diğer yöntemler buna göre ölçülür.', ['ww']],
  ['heuristic', 'Ders yöntemleri', 'Prof. Dr. Yakup Kara ders notları, PDF s. 370–387.', ['l4l', 'silver', 'luc', 'ltc', 'ppb']],
  ['extension', 'Proje uzantıları', 'Bu çalışmada geliştirilen, iki modelde de çalışan ek sezgiseller.', ['merge', 'local', 'window']],
]
function Home({ workspace, product, experiment }) {
  const { calculations, error } = useMemo(() => calculateWorkspace(workspace), [workspace])
  const exact = calculations.find(c => c.method.id === 'ww')
  const steps = [
    { n: 1, href: '#planning', icon: <Table2 size={20}/>, title: 'Tek problem çözümü', text: 'Talep ve maliyetler girilir; dokuz yöntemin planı anında hesaplanır ve her karar adım adım izlenebilir.', status: error ? 'Girdi hatalı; düzeltilmesi gerekiyor' : `${product} · ${workspace.rows.length} dönem · optimum ${money(exact.plan.total)}`, done: !error, cta: 'Probleme geç' },
    { n: 2, href: '#experiments', icon: <FlaskConical size={20}/>, title: 'Kontrollü deney', text: 'Yöntemler 300 rastgele problemde kesin optimuma göre ölçülür; t testi ve güven aralıklarıyla karşılaştırılır.', status: experiment ? `${experiment.problems.length} problem · tohum ${experiment.config.seed}` : 'Henüz deney yok', done: !!experiment, cta: experiment ? 'Sonuçları gör' : 'Deneyi başlat' },
    { n: 3, href: '#reports', icon: <FileText size={20}/>, title: 'Rapor', text: 'Açıklamalı tez raporu, ham veriler (CSV/JSON) ve yazdırılabilir özet.', status: experiment ? 'Rapor hazır' : 'Önce deney gerekli', done: !!experiment, cta: 'Rapora geç' },
  ]
  return <>
    <section className="hero"><p className="eyebrow">Tek ürünlü · kapasitesiz · talebi bilinen</p><h1>Hangi parti büyüklüğü yöntemi optimuma ne kadar yakın?</h1><p className="lead">Bu uygulama bir üretim planlama problemini dokuz yöntemle çözer, sonuçları kesin optimumla (Wagner–Whitin / Zangwill) karşılaştırır ve tez için kontrollü bir deney yürütür. Çalışma üç adımdan oluşur:</p></section>
    <ol className="steps">{steps.map(s => <li key={s.n} className="card step-card"><a href={s.href}><div className="step-top"><span className="step-num">{s.n}</span>{s.icon}</div><h2>{s.title}</h2><p>{s.text}</p><span className={`step-status ${s.done ? 'ok' : ''}`}>{s.status}</span><span className="step-cta">{s.cta} <ArrowRight size={15}/></span></a></li>)}</ol>
    <section className="home-grid">
      <div className="card"><div className="card-head"><div><h2>Karşılaştırılan yöntemler</h2><p>Renkli etiketler uygulamanın her yerinde aynı anlamı taşır.</p></div></div><div className="card-body method-groups">{groups.map(([kind, title, text, ids]) => <div key={kind}><h3><span className={`badge badge-${kind === 'extension' ? 'heuristic' : kind}`}>{title}</span></h3><p className="muted">{text}</p><ul>{ids.map(id => { const m = methods.find(x => x.id === id); return <li key={id}><b>{m.short}</b> {id === 'ww' ? 'Wagner–Whitin (yok satmasız) / Zangwill (yok satmalı)' : m.name}<small>{m.description}</small></li> })}</ul></div>)}</div></div>
      <div className="card"><div className="card-head"><div><h2>İki model</h2><p>Her problem iki kez çözülür.</p></div></div><div className="card-body model-cards"><div><h3>Yok satmasız (Wagner–Whitin)</h3><p>Her dönemin talebi en geç o dönemde karşılanır. Fazla üretim stokta bekler ve <b>h</b> TL/adet-dönem maliyet doğurur.</p></div><div><h3>Yok satmalı (Zangwill)</h3><p>Talep sonraki bir dönemde karşılanabilir; bekleyen her adet için <b>b</b> TL/adet-dönem maliyet oluşur. Kayıp satış yoktur.</p></div><a className="link-button" href="#guide">Matematiksel model ve varsayımlar →</a></div></div>
    </section>
  </>
}

function Products({ store, setStore }) {
  const [name, setName] = useState(''); const [error, setError] = useState('')
  const add = () => { const text = name.trim(); if (!text || store.products.some(p => p.name === text)) { setError('Lütfen benzersiz bir ürün adı girin.'); return }; const id = crypto.randomUUID(); setStore({ activeId: id, products: [...store.products, { id, name: text, workspace: defaultWorkspace() }] }); setName(''); setError('') }
  return <div className="two-col"><section className="card"><div className="card-head"><div><h2>Ürün kayıtları</h2><p>Her kayıt ayrı bir tek ürün problemidir (ortak kapasite yok).</p></div></div><div className="card-body">{store.products.map(p => <button key={p.id} className={`list-row ${p.id === store.activeId ? 'is-selected' : ''}`} onClick={() => setStore({ ...store, activeId: p.id })}><PackageOpen size={18}/><span><b>{p.name}</b><small>{p.workspace.rows.length} dönem · {p.workspace.allowBacklog ? 'Yok satmalı' : 'Yok satmasız'}</small></span><span className="muted">{p.id === store.activeId ? 'Aktif' : 'Seç'}</span></button>)}</div></section><section className="card"><div className="card-head"><div><h2>Yeni ürün</h2></div></div><div className="card-body stack"><label>Ürün adı<input placeholder="Örn. Kompakt model" value={name} maxLength="160" onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}/></label>{error && <div className="alert" role="alert">{error}</div>}<button className="run-button" onClick={add}>Ürünü ekle</button></div></section></div>
}
function SettingsView({ workspace, setWorkspace }) {
  const [setup, setSetup] = useState(String(workspace.rows[0]?.setup ?? 100)); const [backlog, setBacklog] = useState(String(workspace.rows[0]?.backlog ?? 1)); const [notice, setNotice] = useState(''); const [error, setError] = useState('')
  const apply = () => { const a = Number(setup), b = Number(backlog); if (!setup.trim() || !backlog.trim() || !Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0 || a > 1e9 || b > 1e9) { setError('Maliyetler sonlu, 0–1.000.000.000 arasında olmalıdır.'); setNotice(''); return }; setWorkspace({ ...workspace, rows: workspace.rows.map(r => ({ ...r, setup: a, backlog: b })) }); setError(''); setNotice('Hazırlık ve yok satma maliyeti bütün dönemlere uygulandı.') }
  return <section className="card"><div className="card-head"><div><h2>Toplu maliyet düzenleme</h2><p>Aktif ürünün bütün dönemlerine aynı hazırlık ve yok satma maliyeti uygulanır.</p></div></div><div className="card-body stack"><div className="field-row"><label>Hazırlık maliyeti A<input type="number" min="0" max="1000000000" value={setup} onChange={e => setSetup(e.target.value)}/></label><label>Yok satma maliyeti b<input type="number" min="0" max="1000000000" step="any" value={backlog} onChange={e => setBacklog(e.target.value)}/></label></div><div><button className="run-button" onClick={apply}>Uygula</button></div>{error && <div className="alert" role="alert">{error}</div>}{notice && <p className="success-text" role="status">{notice}</p>}</div></section>
}

function Reports({ workspace, experiment }) {
  const { calculations, error } = useMemo(() => calculateWorkspace(workspace), [workspace])
  const exportProblems = () => { const config = experiment?.config ?? defaultConfig; jsonDownload(`problemler-${config.seed}.json`, { version: 2, modelVersion: MODEL_VERSION, designVersion: DESIGN_VERSION, config, problems: experiment?.problems ?? generateProblems(config) }) }
  const sorted = [...calculations].sort((a, b) => a.plan.total - b.plan.total)
  return <>
    <PageHead step="Adım 3 / 3" title="Rapor ve dışa aktarma" actions={<button className="secondary-button" onClick={() => window.print()}><Printer size={15}/>Yazdır / PDF</button>}>Tez için gereken bütün çıktılar bu sayfada yer alır. “Yazdır / PDF” düğmesi sayfayı rapor düzeninde yazdırır.</PageHead>
    <section className="card"><div className="card-head"><div><h2>Deney</h2><p>{experiment ? `${experiment.problems.length} temel problem · tohum ${experiment.config.seed} · ${experiment.modelVersion} · ${experiment.records.length.toLocaleString('tr-TR')} sonuç` : 'Henüz tamamlanmış deney yok.'}</p></div></div>
      {experiment ? <div className="card-body">
        <div className="downloads no-print">
          <button className="download" onClick={() => download(`tez-raporu-${experiment.config.seed}.md`, reportMarkdown(experiment), 'text/markdown;charset=utf-8')}><FileText size={18}/><b>Açıklamalı tez raporu</b><small>Markdown · tablolar, testler, sınırlılıklar</small></button>
          <button className="download" onClick={() => download(`sonuclar-${experiment.config.seed}.csv`, recordsToCSV(experiment.records), 'text/csv;charset=utf-8')}><Download size={18}/><b>Ham sonuçlar</b><small>CSV · her problem × yöntem × model</small></button>
          <button className="download" onClick={() => download(`istatistik-${experiment.config.seed}.csv`, statisticsCSV(experiment), 'text/csv;charset=utf-8')}><Download size={18}/><b>İstatistik</b><small>CSV · altı eşleştirilmiş test</small></button>
          <button className="download" onClick={() => jsonDownload(`deney-${experiment.config.seed}.json`, experiment)}><Download size={18}/><b>Tüm deney (yedek)</b><small>JSON · Deney sayfasında yeniden açılabilir</small></button>
          <button className="download" onClick={exportProblems}><Download size={18}/><b>Deney girdileri</b><small>JSON · {experiment.problems.length} problemin talep ve maliyetleri</small></button>
        </div>
        {['noBacklog', 'backlog'].map(mode => <div key={mode}><h3 className="section-title">{mode === 'backlog' ? 'Yok satmalı model' : 'Yok satmasız model'} <span className="muted">· referans {referenceName(mode === 'backlog')}</span></h3><div className="table-wrap"><table className="data-table"><thead><tr><th>Yöntem</th><th className="num">Ort. sapma %</th><th className="num">%95 GA</th><th className="num">Medyan %</th><th className="num">P95 %</th><th className="num">Optimum %</th><th className="num">Medyan ms</th></tr></thead><tbody>{experiment.summary.filter(s => s.mode === mode).sort((a, b) => (a.meanGap ?? Infinity) - (b.meanGap ?? Infinity)).map(s => <tr key={s.method}><td><b>{methods.find(m => m.id === s.method)?.name}</b><small>{methodRole(s.method, mode === 'backlog').label}</small></td><td className="num"><b>{fmt(s.meanGap)}</b></td><td className="num">[{fmt(s.meanGapCI?.[0])}; {fmt(s.meanGapCI?.[1])}]</td><td className="num">{fmt(s.medianGap)}</td><td className="num">{fmt(s.p95Gap)}</td><td className="num">{fmt(s.optimalRate, 1)}</td><td className="num">{fmt(s.medianMs, 3)}</td></tr>)}</tbody></table></div></div>)}
        <h3 className="section-title">Eşleştirilmiş karşılaştırmalar <span className="muted">· fark = ilk − ikinci (yüzde puan), Holm düzeltmeli</span></h3>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Model</th><th>Çift</th><th className="num">n</th><th className="num">Ort. fark</th><th className="num">Tabakalı %95 GA</th><th className="num">Holm p</th></tr></thead><tbody>{experiment.comparisons.map(c => <tr key={c.mode + c.a + c.b}><td>{c.mode === 'backlog' ? 'Yok satmalı' : 'Yok satmasız'}</td><td>{methods.find(m => m.id === c.a)?.short} − {methods.find(m => m.id === c.b)?.short}</td><td className="num">{c.n}</td><td className="num">{fmt(c.meanDifference, 3)}</td><td className="num">[{fmt(c.stratified.ci[0], 3)}; {fmt(c.stratified.ci[1], 3)}]</td><td className="num">{c.holmP == null ? '—' : c.holmP < 0.0001 ? '<0,0001' : fmt(c.holmP, 4)}</td></tr>)}</tbody></table></div>
      </div> : <div className="card-body"><Empty icon={<FlaskConical size={28}/>} title="Rapor için deney gerekli" action={<a className="run-button" href="#experiments">Adım 2: Deney →</a>}>Deney tamamlandığında rapor, CSV ve JSON çıktıları burada yer alır.</Empty><div className="no-print"><button className="link-button" onClick={exportProblems}><Download size={14}/>Yalnız deney girdilerini indir (JSON)</button></div></div>}
    </section>
    <section className="card"><div className="card-head"><div><h2>Aktif problem</h2><p>{workspace.rows.length} dönem · {workspace.allowBacklog ? 'yok satmalı' : 'yok satmasız'} · c = {workspace.unitCost}</p></div>{calculations.length > 0 && <button className="secondary-button no-print" onClick={() => jsonDownload('tek-problem-raporu.json', { version: 2, modelVersion: MODEL_VERSION, ...workspace, calculations })}><Download size={14}/>Planlar (JSON)</button>}</div>
      <div className="card-body">{error ? <div className="alert" role="alert">{error}</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Yöntem</th><th className="num">Karar maliyeti</th><th className="num">Üretim dahil</th><th className="num">Üretim dönemleri</th><th className="num">En yüksek bekleyen</th></tr></thead><tbody>{sorted.map(({ method, plan }) => <tr key={method.id}><td>{methodTitle(method.id, workspace.allowBacklog)}</td><td className="num"><b>{money(plan.total)}</b></td><td className="num">{money(plan.grandTotal)}</td><td className="num">{plan.production.flatMap((q, t) => q > 0 ? [t + 1] : []).join(', ')}</td><td className="num">{plan.maxBacklog} adet</td></tr>)}</tbody></table></div>}</div>
    </section>
  </>
}

function Help({ close }) {
  useEffect(() => { const previous = document.activeElement; const handler = e => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { const nodes = [...document.querySelectorAll('.dialog button,.dialog a')]; const first = nodes[0], last = nodes.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() } } }; document.addEventListener('keydown', handler); document.querySelector('.dialog button')?.focus(); return () => { document.removeEventListener('keydown', handler); previous?.focus() } }, [close])
  return <div className="modal-backdrop" onClick={close}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => e.stopPropagation()}><button className="dialog-close" aria-label="Yardımı kapat" onClick={close}>×</button><h2 id="help-title">Nasıl kullanılır?</h2><ol className="help-steps"><li><b>Problem:</b> Talep ve maliyetler soldaki tabloda düzenlenir; sağdaki sıralama anında güncellenir. Bir yönteme tıklandığında planı, maliyeti ve algoritmanın adımları aşağıda açılır.</li><li><b>Deney:</b> “Deneyi başlat” ile 300 rastgele problem çözülür. Sonuçlar sekmelerde yer alır: Özet, ayrıntılı tablo, grafikler, t testi, zor örnekler.</li><li><b>Rapor:</b> Tez raporu ve ham veriler indirilebilir veya sayfa PDF olarak yazdırılabilir.</li></ol><p className="muted">Yok satma: talebin sonraki bir dönemde maliyetle karşılanmasıdır (kayıp satış değildir). Bütün veriler yalnızca bu tarayıcıda saklanır.</p><div className="button-row"><a className="secondary-button" href="#guide" onClick={close}>Rehberi aç</a><button className="run-button" onClick={close}>Anladım</button></div></section></div>
}

function App() {
  const [tab, setTab] = useState('plan'); const [store, setStore] = useState(loadStore); const [active, setActive] = useState(route); const [selected, setSelected] = useState('ww'); const [experiment, setExperiment] = useState(null); const [help, setHelp] = useState(false); const [storageError, setStorageError] = useState('')
  const [scenarios, setScenarios] = useState(() => { const saved = loadLocal('parti-planlama.scenarios.v1', []); return Array.isArray(saved) ? saved.filter(s => { try { normalizeRows(s.rows); return true } catch { return false } }) : [] })
  const product = store.products.find(p => p.id === store.activeId) ?? store.products[0]; const workspace = product.workspace
  const setWorkspace = next => setStore(current => ({ ...current, products: current.products.map(p => p.id === current.activeId ? { ...p, workspace: next } : p) }))
  useEffect(() => { const changed = () => { setActive(route()); window.scrollTo({ top: 0 }); requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true })) }; window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed) }, [])
  useEffect(() => { try { for (const p of store.products) { normalizeRows(p.workspace.rows); if (!Number.isFinite(p.workspace.unitCost) || p.workspace.unitCost < 0 || p.workspace.unitCost > 1e9) return } localStorage.setItem('parti-tez.workspace.v2', JSON.stringify(store)); setStorageError('') } catch (e) { if (e.name === 'QuotaExceededError') setStorageError('Tarayıcı kayıt alanı dolu. Lütfen JSON yedeğini indirin.') } }, [store])
  useEffect(() => { try { localStorage.setItem('parti-planlama.scenarios.v1', JSON.stringify(scenarios)) } catch { setStorageError('Senaryolar tarayıcıya kaydedilemedi; lütfen JSON yedeğini indirin.') } }, [scenarios])
  useEffect(() => {
    let expanded = []
    const before = () => { expanded = [...document.querySelectorAll('details:not([open])')].filter(node => !node.closest('[hidden]')); for (const node of expanded) node.open = true }
    const after = () => { for (const node of expanded) node.open = false; expanded = [] }
    window.addEventListener('beforeprint', before); window.addEventListener('afterprint', after)
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after) }
  }, [])
  useEffect(() => { document.title = `${titles[active]} — Parti büyüklüğü` }, [active])
  const back = <a className="back-link" href="#planning">← Probleme dön</a>
  const pages = {
    start: <Home workspace={workspace} product={product.name} experiment={experiment}/>,
    planning: <PlanningView workspace={workspace} setWorkspace={setWorkspace} product={product.name} products={store.products} activeProduct={store.activeId} onProduct={id => setStore(current => ({ ...current, activeId: id }))} selected={selected} setSelected={setSelected} tab={tab} setTab={setTab}/>,
    data: <>{back}<DataManagement workspace={workspace} setWorkspace={setWorkspace} product={product.name} scenarios={scenarios} setScenarios={setScenarios}/><h2 className="section-title">Ürünler</h2><Products store={store} setStore={setStore}/><h2 className="section-title">Toplu düzenleme</h2><SettingsView key={product.id} workspace={workspace} setWorkspace={setWorkspace}/></>,
    products: <>{back}<PageHead title="Ürünler"/><Products store={store} setStore={setStore}/></>,
    reports: <Reports workspace={workspace} experiment={experiment}/>,
    guide: <ThesisGuide/>, settings: <>{back}<PageHead title="Toplu maliyet"/><SettingsView key={product.id} workspace={workspace} setWorkspace={setWorkspace}/></>,
  }
  return <div className="app-shell"><a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById('main-content').focus() }}>İçeriğe geç</a><Navigation active={active} onHelp={() => setHelp(true)}/><main id="main-content" tabIndex="-1"><div className="content">{storageError && <div className="alert" role="alert">{storageError}</div>}{active !== 'experiments' && pages[active]}<div className="view-stack" hidden={active !== 'experiments'}><ExperimentView onResult={setExperiment} onInspect={(rows, allowBacklog, method, unitCost) => { setWorkspace({ rows, allowBacklog, unitCost }); setSelected(method); setTab('plan'); location.hash = 'planning' }}/></div></div><footer className="app-footer"><span>Parti büyüklüğü · tek ürün, kapasitesiz, deterministik</span><span>Veriler yalnız bu tarayıcıda saklanır.</span></footer></main>{help && <Help close={() => setHelp(false)}/>}</div>
}
class Boundary extends React.Component { constructor(props) { super(props); this.state = { error: false } } static getDerivedStateFromError() { return { error: true } } render() { return this.state.error ? <main className="content"><h1>Çalışma alanı gösterilemedi</h1><p>Lütfen sayfayı yenileyin. Kayıtlı veriler silinmez; sorun sürerse tarayıcı konsolundaki hata mesajını inceleyin.</p><button className="run-button" onClick={() => location.reload()}>Sayfayı yenile</button></main> : this.props.children } }
createRoot(document.getElementById('root')).render(<Boundary><App/></Boundary>)
