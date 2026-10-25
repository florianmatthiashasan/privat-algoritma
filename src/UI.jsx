import React, { useId } from 'react'

export function PageHead({ step, title, children, actions }) {
  return <section className="page-head"><div>{step && <p className="eyebrow">{step}</p>}<h1 id="page-title" tabIndex="-1">{title}</h1>{children && <p className="lead">{children}</p>}</div>{actions && <div className="head-actions">{actions}</div>}</section>
}

export function Tabs({ tabs, active, onChange, label }) {
  const id = useId()
  const current = tabs.find(t => t.id === active) ?? tabs[0]
  const key = e => {
    const i = tabs.findIndex(t => t.id === current.id)
    const next = e.key === 'ArrowRight' ? tabs[(i + 1) % tabs.length] : e.key === 'ArrowLeft' ? tabs[(i - 1 + tabs.length) % tabs.length] : null
    if (next) { e.preventDefault(); onChange(next.id); document.getElementById(`${id}-${next.id}`)?.focus() }
  }
  return <div className="tabs">
    <div className="tab-list" role="tablist" aria-label={label} onKeyDown={key}>{tabs.map(t => <button key={t.id} id={`${id}-${t.id}`} role="tab" aria-selected={t.id === current.id} aria-controls={`${id}-panel`} tabIndex={t.id === current.id ? 0 : -1} onClick={() => onChange(t.id)}>{t.label}{t.badge != null && <span className="tab-badge">{t.badge}</span>}</button>)}</div>
    <div className="tab-panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${current.id}`}>{current.render()}</div>
  </div>
}

export function Segmented({ value, options, onChange, label }) {
  return <div className="segmented" role="radiogroup" aria-label={label}>{options.map(([id, text, hint]) => <button key={id} role="radio" aria-checked={value === id} className={value === id ? 'on' : ''} onClick={() => onChange(id)}><b>{text}</b>{hint && <small>{hint}</small>}</button>)}</div>
}

export function Empty({ icon, title, children, action }) {
  return <div className="empty">{icon}<h3>{title}</h3>{children && <p>{children}</p>}{action}</div>
}
