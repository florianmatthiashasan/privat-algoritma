import React, { useEffect, useId, useRef } from 'react'
export default function ConfirmDialog({ title, children, onCancel, onConfirm, confirmLabel = 'Sil' }) {
  const id = useId(); const dialog = useRef(null); const cancel = useRef(onCancel); cancel.current = onCancel
  useEffect(() => {
    const previous = document.activeElement
    dialog.current?.querySelector('button')?.focus()
    const key = e => {
      if (e.key === 'Escape') cancel.current()
      if (e.key === 'Tab') {
        const nodes = [...dialog.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled)')]
        if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); nodes.at(-1)?.focus() }
        else if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); nodes[0]?.focus() }
      }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); previous?.focus() }
  }, [])
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}><section ref={dialog} className="help-dialog" role="dialog" aria-modal="true" aria-labelledby={id}><h2 id={id}>{title}</h2>{children}<div className="button-row"><button className="secondary-button" onClick={onCancel}>Vazgeç</button><button className="run-button" onClick={onConfirm}>{confirmLabel}</button></div></section></div>
}
