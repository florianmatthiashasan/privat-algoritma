import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CircleHelp, PackageOpen } from 'lucide-react'
import PlanningView, { bookRows, calculateWorkspace, money } from './PlanningView.jsx'
import ExperimentView from './ExperimentView.jsx'
import DataManagement from './DataManagement.jsx'
import ThesisGuide from './ThesisGuide.jsx'
import { MODEL_VERSION } from './lotSizing.js'
import { normalizeRows } from './persistence.js'
import { download, jsonDownload } from './download.js'
import { reportMarkdown } from './report.js'
import { SeriesChart } from './Charts.jsx'
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
const nav = [['planning','Problem'],['experiments','Deneyler'],['guide','Model rehberi']]
const validRoutes = ['planning','experiments','guide','data','products','reports','settings']
const route = () => validRoutes.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'planning'
function Navigation({ active, onHelp }) {
  const current = ['data','products','settings'].includes(active) ? 'planning' : active === 'reports' ? 'experiments' : active
  return <header className="app-header"><div className="header-inner"><a className="brand" href="#planning" aria-label="Parti / Tez — problem"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span>Parti / Tez</span></a><nav className="primary-nav" aria-label="Ana gezinme">{nav.map(([id,label]) => <a key={id} href={`#${id}`} aria-current={current === id ? 'page' : undefined}>{label}</a>)}</nav><button className="header-help secondary-button" onClick={onHelp}><CircleHelp size={17} aria-hidden="true"/><span>Yardım</span></button></div></header>
}
function Products({ store, setStore }) {
  const [name, setName] = useState(''); const [error, setError] = useState('')
  const add = () => { const text = name.trim(); if (!text || store.products.some(p => p.name === text)) { setError('Benzersiz bir ürün adı girin.'); return }; const id = crypto.randomUUID(); setStore({ activeId: id, products: [...store.products,{id,name:text,workspace:defaultWorkspace()}] }); setName(''); setError('') }
  return <><section className="page-intro"><div><h1>Ürünler</h1><p>Her kayıt ayrı bir tek ürün problemidir; veri, model ve birim maliyeti ürünle birlikte saklanır. Ortak kapasiteye sahip çok ürün modeli değildir.</p></div></section><div className="management-grid"><section className="panel"><div className="panel-head"><h2>Ürün kayıtları</h2></div>{store.products.map(p => <button key={p.id} className={`product-row ${p.id === store.activeId ? 'selected-product' : ''}`} onClick={() => setStore({ ...store, activeId: p.id })}><PackageOpen size={20}/><span><b>{p.name}</b><small>{p.workspace.rows.length} dönem · {p.workspace.allowBacklog ? 'Yok satmalı' : 'Yok satmasız'}</small></span><span>{p.id === store.activeId ? 'Aktif' : 'Seç'}</span></button>)}</section><section className="panel add-product"><div className="panel-head"><h2>Yeni ürün kaydı</h2></div><label>Ürün adı<input placeholder="Örn. Kompakt model" value={name} maxLength="160" onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}/></label>{error && <p className="experiment-error" role="alert">{error}</p>}<button className="run-button" onClick={add}>Ürünü ekle</button></section></div></>
}
function SettingsView({ workspace, setWorkspace }) {
  const [setup,setSetup] = useState(String(workspace.rows[0]?.setup ?? 100)); const [backlog,setBacklog] = useState(String(workspace.rows[0]?.backlog ?? 1)); const [notice,setNotice] = useState(''); const [error,setError] = useState('')
  const apply = () => { const a=Number(setup), b=Number(backlog); if (!setup.trim() || !backlog.trim() || !Number.isFinite(a) || !Number.isFinite(b) || a<0 || b<0 || a>1e9 || b>1e9) { setError('Maliyetler sonlu, 0–1.000.000.000 arasında olmalıdır. Değerleri düzeltin.'); setNotice(''); return }; setWorkspace({...workspace,rows:workspace.rows.map(r=>({...r,setup:a,backlog:b}))}); setError(''); setNotice('Hazırlık ve gecikme maliyeti aktif ürünün bütün dönemlerine uygulandı.') }
  return <><section className="page-intro"><div><h1>Ayarlar</h1><p>Aktif ürünün dönem maliyetlerini topluca düzenleyin.</p></div></section><section className="panel guide-section"><div className="settings-form"><label>Varsayılan hazırlık maliyeti<input type="number" min="0" max="1000000000" value={setup} onChange={e=>setSetup(e.target.value)}/></label><label>Varsayılan gecikme maliyeti<input type="number" min="0" max="1000000000" step="any" value={backlog} onChange={e=>setBacklog(e.target.value)}/></label><button className="run-button" onClick={apply}>Uygula</button></div>{error && <p className="experiment-error" role="alert">{error}</p>}{notice && <p className="local-notice" role="status">{notice}</p>}<p>Model varsayımları ve hocayla teyit edilecek konular <a href="#guide">Model ve yöntemler</a> ekranındadır. Depolama yereldir; JSON yedeklerini başka cihazda geri yükleyebilirsiniz.</p></section></>
}
function Reports({ workspace, experiment }) {
  const { calculations,error }=useMemo(()=>calculateWorkspace(workspace),[workspace]); const rows=workspace.rows
  return <><section className="page-intro"><div><h1>Raporlar</h1><p>Aktif problem ve son tamamlanan deney için dışa aktarılabilir bulgular.</p></div><button className="secondary-button" onClick={()=>window.print()}>Yazdır / PDF kaydet</button></section>{error && <p className="validation-notice" role="alert">{error}</p>}{calculations.length>0 && <section className="panel"><div className="panel-head"><h2>Aktif problem maliyet özeti</h2><button className="text-button" onClick={()=>jsonDownload('tek-problem-raporu.json',{version:2,modelVersion:MODEL_VERSION,...workspace,calculations})}>Planları JSON indir</button></div><div className="table-wrap"><table className="experiment-table"><thead><tr><th>Yöntem</th><th>Karar maliyeti</th><th>Üretim dahil toplam</th><th>En yüksek gecikmiş talep</th></tr></thead><tbody>{calculations.map(({method,plan})=><tr key={method.id}><td>{method.name}</td><td>{money(plan.total)}</td><td>{money(plan.grandTotal)}</td><td>{plan.maxBacklog} adet</td></tr>)}</tbody></table></div></section>}<section className="panel guide-section"><h2>Son deney raporu</h2>{experiment ? <><p>{experiment.problems.length} temel problem · tohum {experiment.config.seed} · {experiment.modelVersion}. Ortalama, medyan, P95, güven aralıkları ve eşleştirilmiş testler aynı raporda yer alır.</p><div className="button-row"><button className="run-button" onClick={()=>download('tez-deney-raporu.md',reportMarkdown(experiment),'text/markdown;charset=utf-8')}>Açıklamalı raporu indir</button><a className="secondary-button" href="#experiments">Grafikleri ve istatistiği incele</a></div></> : <p>Önce <a href="#experiments">Deney laboratuvarı</a> ekranında deney çalıştırın veya kayıtlı deney açın.</p>}</section>{!error && <SeriesChart title="Aktif problemin talebi" series={[{name:'Talep',values:rows.map(r=>r.demand)}]}/>}</>
}
function Help({close}) {
  useEffect(()=>{ const previous=document.activeElement; const handler=e=>{if(e.key==='Escape') close(); if(e.key==='Tab'){const nodes=[...document.querySelectorAll('.help-dialog button,.help-dialog a')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}; document.addEventListener('keydown',handler);document.querySelector('.help-dialog button')?.focus();return()=>{document.removeEventListener('keydown',handler);previous?.focus()} },[close])
  return <div className="modal-backdrop" onClick={close}><section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e=>e.stopPropagation()}><button className="dialog-close" aria-label="Yardımı kapat" onClick={close}>×</button><h2 id="help-title">Nereden başlamalıyım?</h2><p><b>Problem:</b> Verileri girin, çözümü inceleyin, yöntemleri karşılaştırın.</p><p><b>Deneyler:</b> 300 problem üzerinde yöntemleri test edin. t testi ve güven aralıklarını sonuçların altından açın.</p><p><b>Model rehberi:</b> Varsayımları, yöntemleri ve tez protokolünü okuyun. Yok satma, sonraki dönemde karşılanan taleptir.</p><a href="#guide" onClick={close}>Model ve yöntemleri oku</a><button className="run-button" onClick={close}>Anladım</button></section></div>
}
function App() {
  const [step,setStep]=useState(0); const [store,setStore]=useState(loadStore); const [active,setActive]=useState(route); const [selected,setSelected]=useState('ww'); const [experiment,setExperiment]=useState(null); const [help,setHelp]=useState(false); const [storageError,setStorageError]=useState('')
  const [scenarios,setScenarios]=useState(()=>{const saved=loadLocal('parti-planlama.scenarios.v1',[]);return Array.isArray(saved)?saved.filter(s=>{try{normalizeRows(s.rows);return true}catch{return false}}):[]})
  const product=store.products.find(p=>p.id===store.activeId)??store.products[0]; const workspace=product.workspace
  const setWorkspace=next=>setStore(current=>({...current,products:current.products.map(p=>p.id===current.activeId?{...p,workspace:next}:p)}))
  useEffect(()=>{const changed=()=>{setActive(route());window.scrollTo({top:0});requestAnimationFrame(()=>document.getElementById('main-content')?.focus({preventScroll:true}))};window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed)},[])
  useEffect(()=>{try{for(const p of store.products){normalizeRows(p.workspace.rows);if(!Number.isFinite(p.workspace.unitCost)||p.workspace.unitCost<0||p.workspace.unitCost>1e9)return}localStorage.setItem('parti-tez.workspace.v2',JSON.stringify(store));setStorageError('')}catch(e){if(e.name==='QuotaExceededError')setStorageError('Tarayıcı kayıt alanı dolu. JSON yedeği indirin.')}},[store])
  useEffect(()=>{try{localStorage.setItem('parti-planlama.scenarios.v1',JSON.stringify(scenarios))}catch{setStorageError('Senaryolar tarayıcıya kaydedilemedi; JSON yedeği indirin.')}},[scenarios])
  useEffect(()=>{
    let expanded=[]
    const before=()=>{expanded=[...document.querySelectorAll('details:not([open])')].filter(node=>!node.closest('[hidden]'));for(const node of expanded)node.open=true}
    const after=()=>{for(const node of expanded)node.open=false;expanded=[]}
    window.addEventListener('beforeprint',before);window.addEventListener('afterprint',after)
    return()=>{window.removeEventListener('beforeprint',before);window.removeEventListener('afterprint',after)}
  },[])
  useEffect(()=>{document.title=`${nav.find(([id])=>id===active)?.[1]??(active==='reports'?'Raporlar':'Veri ve kayıtlar')} — Parti / Tez`},[active])
  const pages={
    planning:<PlanningView workspace={workspace} setWorkspace={setWorkspace} product={product.name} products={store.products} activeProduct={store.activeId} onProduct={id=>setStore(current=>({...current,activeId:id}))} selected={selected} setSelected={setSelected} step={step} setStep={setStep}/>,
    data:<><a className="back-link" href="#planning">← Probleme dön</a><DataManagement workspace={workspace} setWorkspace={setWorkspace} product={product.name} scenarios={scenarios} setScenarios={setScenarios}/><details className="disclosure utility-section"><summary><span>Ürün kayıtları<small>Başka bir ürünle çalışın veya yeni kayıt ekleyin.</small></span></summary><div className="disclosure-body"><Products store={store} setStore={setStore}/></div></details><details className="disclosure utility-section"><summary><span>Toplu maliyet düzenleme<small>Aktif ürünün hazırlık ve gecikme maliyetlerini değiştirin.</small></span></summary><div className="disclosure-body"><SettingsView key={product.id} workspace={workspace} setWorkspace={setWorkspace}/></div></details></>,
    products:<><a className="back-link" href="#planning">← Probleme dön</a><Products store={store} setStore={setStore}/></>,
    reports:<><a className="back-link" href="#experiments">← Deney sonuçlarına dön</a><Reports workspace={workspace} experiment={experiment}/></>,
    guide:<ThesisGuide/>,settings:<><a className="back-link" href="#planning">← Probleme dön</a><SettingsView key={product.id} workspace={workspace} setWorkspace={setWorkspace}/></>
  }
  return <div className="app-shell"><a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content').focus()}}>İçeriğe geç</a><Navigation active={active} onHelp={()=>setHelp(true)}/><main id="main-content" tabIndex="-1"><div className="content">{storageError&&<p className="validation-notice" role="alert">{storageError}</p>}{active!=='experiments'&&pages[active]}<div hidden={active!=='experiments'}><ExperimentView onResult={setExperiment} onInspect={(rows,allowBacklog,method,unitCost)=>{setWorkspace({rows,allowBacklog,unitCost});setSelected(method);setStep(1);location.hash='planning'}}/></div></div><footer className="app-footer"><span>Parti / Tez · Tek ürün için üretim planlama</span><span>Veriler bu tarayıcıda saklanır.</span></footer></main>{help&&<Help close={()=>setHelp(false)}/>}</div>
}
class Boundary extends React.Component { constructor(props){super(props);this.state={error:false}} static getDerivedStateFromError(){return{error:true}} render(){return this.state.error?<main className="guide-section"><h1>Çalışma alanı gösterilemedi</h1><p>Sayfayı yenileyin. Kalıcı veriler otomatik silinmez; geçersiz bir kayıt varsa tarayıcı geliştirici konsolundaki hatayı inceleyin.</p><button onClick={()=>location.reload()}>Sayfayı yenile</button></main>:this.props.children} }
createRoot(document.getElementById('root')).render(<Boundary><App/></Boundary>)
