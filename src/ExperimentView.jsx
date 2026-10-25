import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FlaskConical, Play, Square, Trash2, Upload } from 'lucide-react'
import { methods, MODEL_VERSION, methodRole, referenceName } from './lotSizing.js'
import { checkConfig, defaultConfig, families, summarize } from './experiments.js'
import { deleteExperiment, experimentHistory, loadExperiment, saveExperiment } from './persistence.js'
import { Histogram, QualitySpeed } from './Charts.jsx'
import StatisticalPanel from './StatisticalPanel.jsx'
import { protocol } from './experimentResult.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import { Empty, PageHead, Segmented, Tabs } from './UI.jsx'
const number = (n, digits = 2) => n == null ? '—' : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
const label = id => methods.find(m => m.id === id)?.name ?? id
const short = id => methods.find(m => m.id === id)?.short ?? id
const when = iso => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Vienna' }).format(new Date(iso))

function SummaryTable({ stats, mode, methodId, onPick }) {
  const maxGap = Math.max(1, ...stats.map(s => s.meanGap ?? 0))
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Yöntem</th><th>Ortalama sapma</th><th className="num">Optimuma ulaşma</th><th className="num">Medyan süre</th></tr></thead><tbody>{stats.map(s => { const role = methodRole(s.method, mode === 'backlog'); return <tr key={s.method} className={methodId === s.method ? 'is-selected' : ''}>
    <td><button className="method-cell" onClick={() => onPick(s.method)}><span className={`badge badge-${role.kind}`}>{short(s.method)}</span><span><b>{label(s.method)}</b><small>{role.label}{s.failures ? ` · ${s.failures} hata` : ''}</small></span></button></td>
    <td><div className="bar-cell"><span className="rank-bar" aria-hidden="true"><i className={s.meanGap === 0 ? 'zero' : ''} style={{ width: `${Math.max(s.meanGap ? 2 : 0, (s.meanGap ?? 0) / maxGap * 100)}%` }}/></span><b>%{number(s.meanGap)}</b></div></td>
    <td className="num">%{number(s.optimalRate, 1)}</td><td className="num">{number(s.medianMs, 3)} ms</td></tr> })}</tbody></table></div>
}

export default function ExperimentView({ onInspect, onResult }) {
  const [config, setConfig] = useState(defaultConfig); const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false); const [progress, setProgress] = useState(0); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const [mode, setMode] = useState('noBacklog'); const [family, setFamily] = useState('all'); const [horizon, setHorizon] = useState('all'); const [scale, setScale] = useState('all')
  const [methodId, setMethodId] = useState('local'); const [page, setPage] = useState(0); const [history, setHistory] = useState([]); const [deleting, setDeleting] = useState(null); const [tab, setTab] = useState('summary')
  const worker = useRef(null); const file = useRef(null); const alive = useRef(true)
  const refreshHistory = async () => { const items = await experimentHistory(); if (alive.current) setHistory(items); return items }
  useEffect(() => {
    alive.current = true
    refreshHistory().then(async items => { if (items.length && !worker.current && alive.current) { const saved = await loadExperiment(items[0].id); if (alive.current && !worker.current && saved?.modelVersion === MODEL_VERSION) { setResult(saved); onResult(saved); setNotice('En son tamamlanmış deney tarayıcı kaydından açıldı.') } } }).catch(e => setError(e.message))
    return () => { alive.current = false; worker.current?.terminate() }
  }, [onResult])
  const launch = data => {
    setError(''); setNotice(''); setProgress(0); setRunning(true); worker.current?.terminate()
    const next = new Worker(new URL('./experiment.worker.js', import.meta.url), { type: 'module' }); worker.current = next
    next.onmessage = async ({ data: message }) => {
      if (message.type === 'progress') setProgress(message.completed)
      if (message.type === 'complete') {
        next.terminate(); worker.current = null; setResult(message.result); onResult(message.result); setRunning(false); setPage(0); setTab('summary')
        try { const saved = await saveExperiment(message.result); if (alive.current) { setResult(saved); onResult(saved); setNotice('Deney tamamlandı ve tarayıcıdaki deney geçmişine kaydedildi.'); await refreshHistory() } } catch (e) { setError(e.message) }
      }
      if (message.type === 'error') { setError(message.message); setRunning(false); next.terminate(); worker.current = null }
    }
    next.onerror = event => { setError(event.message || 'Deney çalıştırılamadı.'); setRunning(false); next.terminate(); worker.current = null }
    next.postMessage(data)
  }
  const start = () => { try { launch({ config: checkConfig(config) }) } catch (e) { setError(e.message); setRunning(false) } }
  const cancel = () => { worker.current?.terminate(); worker.current = null; setRunning(false); setNotice('Deney durduruldu. Önceki tamamlanmış sonuçlar korundu.') }
  const importRun = async e => { const selected = e.target.files?.[0]; if (!selected) return; try { if (selected.size > 128e6) throw new Error('Deney dosyası en fazla 128 MB olabilir.'); launch({ task: 'import', result: JSON.parse(await selected.text()) }) } catch (x) { setError(x.message) } finally { e.target.value = '' } }
  const openHistory = async id => { try { const saved = await loadExperiment(id); if (saved?.modelVersion !== MODEL_VERSION) throw new Error('Eski modelin deneyi yeniden hesaplanmalıdır.'); setResult(saved); setConfig(saved.config); onResult(saved); setPage(0); setNotice('Kayıtlı deney açıldı.') } catch (e) { setError(e.message) } }
  const removeHistory = async () => { try { await deleteExperiment(deleting.id); if (result?.id === deleting.id) { setResult(null); onResult(null) } setDeleting(null); await refreshHistory() } catch (e) { setError(e.message) } }
  const filtered = useMemo(() => result?.records.filter(r => (family === 'all' || r.family === family) && (horizon === 'all' || r.periods === Number(horizon)) && (scale === 'all' || r.setupScale === Number(scale))) ?? [], [result, family, horizon, scale])
  const stats = useMemo(() => summarize(filtered).filter(s => s.mode === mode).sort((a, b) => (a.meanGap ?? Infinity) - (b.meanGap ?? Infinity)), [filtered, mode])
  const cases = useMemo(() => filtered.filter(r => r.mode === mode && r.method === methodId).sort((a, b) => (b.gap ?? Infinity) - (a.gap ?? Infinity)), [filtered, mode, methodId])
  const failures = result?.records.filter(r => r.issues.length).length ?? 0
  const best = stats.find(s => s.method !== 'ww' && methodRole(s.method, mode === 'backlog').kind !== 'baseline')
  const changeFilter = setter => e => { setter(e.target.value); setPage(0) }
  const filterActive = family !== 'all' || horizon !== 'all' || scale !== 'all'
  const pick = id => { setMethodId(id); setPage(0) }
  return <>
    <PageHead step="Adım 2 / 3" title="Deney: 300 problemle karşılaştırma" actions={<a className="secondary-button" href="#guide">Deney tasarımı nasıl?</a>}>Aynı rastgele problemler iki modelde on dört yöntemle çözülür. Her sonuç kesin optimumla karşılaştırılır.</PageHead>
    <section className="card run-card">
      <div className="card-body run-row">
        <div className="run-main"><label>Temel problem sayısı<input type="number" min="1" max="3000" step="1" value={config.count} disabled={running} onChange={e => setConfig({ ...config, count: Number(e.target.value) })}/></label>
          {running ? <button className="secondary-button" onClick={cancel}><Square size={14}/>Durdur</button> : <button className="run-button" onClick={start}><Play size={15}/>{result ? 'Yeniden çalıştır' : 'Deneyi başlat'}</button>}</div>
        <p className="muted run-note">Önerilen <b>300</b> = 3 ufuk × 2 talep değişkenliği × 5 hazırlık oranı × 10 tekrar. {config.count !== 300 && <span className="warn-text">Bu sayı tam tasarıma karşılık gelmez; bazı tabakalı testler hesaplanamayabilir.</span>}</p>
      </div>
      {running && <div className="progress" role="status"><progress value={progress} max={config.count}/><span>{progress} / {config.count} problem çözüldü · deney arka planda çalışır, başka sayfalara geçilebilir</span></div>}
      {error && <div className="card-body"><div className="alert" role="alert">{error}</div></div>}
      {notice && !running && <div className="card-body"><p className="success-text" role="status">{notice}</p></div>}
      <details className="card-foot"><summary>Gelişmiş ayarlar, dosyadan açma ve geçmiş{history.length ? ` (${history.length})` : ''}</summary>
        <div className="foot-grid">
          <div><h3>Ayarlar</h3><div className="field-row">{[['seed', 'Rassal tohum', 0, 4294967295], ['repetitions', 'Süre ölçümü tekrarı', 1, 30], ['unitCost', 'Birim üretim maliyeti c', 0, 1e9]].map(([key, title, min, max]) => <label key={key}>{title}<input type="number" min={min} max={max} step={key === 'unitCost' ? 'any' : 1} value={config[key]} disabled={running} onChange={e => setConfig({ ...config, [key]: Number(e.target.value) })}/></label>)}</div>
            <p className="hint">Ufuk 8/24/48 · hedef CV 0,2/1 · A/(h·μ) = 0,5/1/2/4/8 · gamma talep, μ = 100 · h = 1 · b/h = 0,25/1/4 dönüşümlü. Talepler çözüm anında bilinir (deterministik model).</p>
            <button className="secondary-button" disabled={running} onClick={() => file.current.click()}><Upload size={14}/>Kayıtlı deney dosyası (JSON) aç</button><input ref={file} hidden type="file" accept=".json" aria-label="Deney dosyası" onChange={importRun}/></div>
          <div><h3>Deney geçmişi</h3>{history.length ? <ul className="history">{history.map(item => <li key={item.id} className={result?.id === item.id ? 'is-selected' : ''}><button className="link-button" disabled={running} onClick={() => openHistory(item.id)}>{item.name}</button><small>{when(item.createdAt)} · {item.count} problem</small><button className="icon-button" aria-label={`${item.name} kaydını sil`} disabled={running} onClick={() => setDeleting(item)}><Trash2 size={14}/></button></li>)}</ul> : <p className="muted">Henüz kayıt yok.</p>}</div>
        </div>
      </details>
    </section>
    {result ? <>
      <div className="kpis"><div><span>Deney</span><strong>{result.problems.length} problem</strong><small>Tohum {result.config.seed} · {(result.records.length).toLocaleString('tr-TR')} çözüm</small></div><div><span>Geçerlilik denetimi</span><strong className={failures ? 'error-text' : 'success-text'}>{failures ? `${failures} hata` : 'Tümü geçerli'}</strong><small>Denge, maliyet ve optimum alt sınırı kontrol edildi</small></div><div><span>En iyi sezgisel ({mode === 'backlog' ? 'yok satmalı' : 'yok satmasız'})</span><strong>{best ? short(best.method) : '—'}</strong><small>{best ? `${label(best.method)} · ort. sapma %${number(best.meanGap)}` : ''}</small></div></div>
      <section className="card">
        <div className="card-head toolbar"><Segmented label="Model" value={mode} onChange={id => { setMode(id); setPage(0) }} options={[['noBacklog', 'Yok satmasız'], ['backlog', 'Yok satmalı']]}/>
          <div className="filters"><select aria-label="Talep değişkenliği" value={family} onChange={changeFilter(setFamily)}><option value="all">Tüm CV</option>{families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select><select aria-label="Ufuk" value={horizon} onChange={changeFilter(setHorizon)}><option value="all">Tüm ufuklar</option>{[8, 24, 48].map(n => <option key={n} value={n}>{n} dönem</option>)}</select><select aria-label="Hazırlık oranı" value={scale} onChange={changeFilter(setScale)}><option value="all">Tüm hazırlık oranları</option>{[0.5, 1, 2, 4, 8].map(n => <option key={n} value={n}>A/(h·μ) = {number(n, 1)}</option>)}</select>{filterActive && <button className="link-button" onClick={() => { setFamily('all'); setHorizon('all'); setScale('all'); setPage(0) }}>Temizle</button>}</div></div>
        {filterActive && <p className="filter-note">Filtre etkin: tablolar ve grafikler yalnız seçili koşulları gösterir. İstatistik sekmesindeki testler her zaman deneyin tamamını kullanır.</p>}
        <div className="card-body"><Tabs label="Deney sonuçları" active={tab} onChange={setTab} tabs={[
          { id: 'summary', label: 'Özet', render: () => stats.length ? <><p className="muted">Referans: {referenceName(mode === 'backlog')}. Sapma = 100·(C − C*)/C*; karar maliyeti hazırlık, stok ve yok satma maliyetlerinin toplamıdır. Seçilen satır diğer sekmelerde gösterilen yöntemi belirler.</p><SummaryTable stats={stats} mode={mode} methodId={methodId} onPick={pick}/></> : <Empty title="Bu filtrede problem yok">Filtreleri temizleyin.</Empty> },
          { id: 'details', label: 'Ayrıntılı tablo', render: () => <div className="table-wrap"><table className="data-table"><thead><tr><th>Yöntem</th><th className="num">n / hata</th><th className="num">Ort. karar TL<small>üretim dahil</small></th><th className="num">Ort. sapma %<small>%95 bootstrap GA</small></th><th className="num">Medyan %</th><th className="num">P95 %<small>en kötü</small></th><th className="num">Optimum %</th><th className="num">Medyan ms<small>P95</small></th></tr></thead><tbody>{stats.map(s => <tr key={s.method} className={methodId === s.method ? 'is-selected' : ''} onClick={() => pick(s.method)}><td><b>{label(s.method)}</b><small>{methodRole(s.method, mode === 'backlog').label}</small></td><td className="num">{s.validCount} / {s.failures}</td><td className="num">{number(s.meanCost)}<small>{number(s.meanGrandTotal)}</small></td><td className="num"><b>{number(s.meanGap)}</b><small>[{number(s.meanGapCI[0])}; {number(s.meanGapCI[1])}]</small></td><td className="num">{number(s.medianGap)}</td><td className="num">{number(s.p95Gap)}<small>{number(s.maxGap)}</small></td><td className="num">{number(s.optimalRate, 1)}</td><td className="num">{number(s.medianMs, 3)}<small>{number(s.p95Ms, 3)}</small></td></tr>)}</tbody></table></div> },
          { id: 'charts', label: 'Grafikler', render: () => <div className="chart-pair"><Histogram values={cases.filter(c => !c.issues.length).map(c => c.gap)} title={`${label(methodId)}: sapma dağılımı`}/><QualitySpeed summary={stats} methods={methods}/></div> },
          { id: 'stats', label: 't testi', render: () => <StatisticalPanel comparisons={result.comparisons} totalCount={result.problems.length}/> },
          { id: 'cases', label: 'Zor örnekler', render: () => <><p className="muted"><b>{label(methodId)}</b> için en yüksek sapmalı problemler. “Planı aç” problemi Adım 1’e yükler.</p><div className="table-wrap"><table className="data-table"><thead><tr><th>Problem</th><th>CV / dönem / A-oranı / b/h</th><th className="num">Optimum TL</th><th className="num">Yöntem TL</th><th className="num">Sapma %</th><th></th></tr></thead><tbody>{cases.slice(page * 12, page * 12 + 12).map(r => <tr key={r.problemId}><td>{r.problemId}<small>{r.cellId}</small></td><td>{r.cvTarget} / {r.periods} / {r.setupScale} / {r.backlogRatio}</td><td className="num">{number(r.optimal)}</td><td className="num">{number(r.total)}</td><td className="num"><b>{number(r.gap)}</b>{r.issues.length > 0 && <small className="error-text">{r.issues.join(' ')}</small>}</td><td><button className="link-button" onClick={() => onInspect(result.problems.find(p => p.id === r.problemId).rows, mode === 'backlog', methodId, result.config.unitCost)}>Planı aç →</button></td></tr>)}</tbody></table></div><div className="pager"><button className="secondary-button" disabled={!page} onClick={() => setPage(page - 1)}>Önceki</button><span>{cases.length ? page + 1 : 0} / {Math.ceil(cases.length / 12)} · {cases.length} problem</span><button className="secondary-button" disabled={(page + 1) * 12 >= cases.length} onClick={() => setPage(page + 1)}>Sonraki</button></div></> },
          { id: 'trace', label: 'İz ve sınırlar', render: () => <div className="prose"><p>Girdi SHA-256: <code className="hash">{result.inputSHA256}</code></p><p>{protocol.cost}</p><p>{protocol.caveats}</p><p>LTC ve PPB ayrı karar kurallarıdır. Bağımsız MILP (HiGHS) doğrulamasının sonucu proje içindeki validation.json dosyasındadır.</p></div> },
        ]}/></div>
      </section>
      <div className="next-step"><p>Sonuçlar hazır. Rapor indirilebilir veya yazdırılabilir.</p><a className="run-button" href="#reports">Adım 3: Rapor →</a></div>
    </> : !running && <section className="card"><Empty icon={<FlaskConical size={30}/>} title="Henüz deney yok" action={<button className="run-button" onClick={start}><Play size={15}/>300 problemle başlat</button>}>Deney birkaç saniye sürer ve sonuç tarayıcıya kaydedilir. Daha önce indirilmiş bir deney dosyası “Gelişmiş ayarlar” bölümünden açılabilir.</Empty></section>}
    {deleting && <ConfirmDialog title="Deney kaydı silinsin mi?" onCancel={() => setDeleting(null)} onConfirm={removeHistory} confirmLabel="Kaydı sil"><p>{deleting.name} bu tarayıcıdan kaldırılacak. Saklamak için önce Rapor sayfasından JSON yedeğini indirin.</p></ConfirmDialog>}
  </>
}
