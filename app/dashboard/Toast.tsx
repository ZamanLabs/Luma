'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useTheme } from '../ThemeContext'
import { Icon, sans } from './ui'

type ToastType = 'info' | 'error' | 'success'
type Toast = { id: number; message: string; type: ToastType; actionLabel?: string; onAction?: () => void }
type ShowOpts = { type?: ToastType; actionLabel?: string; onAction?: () => void; onExpire?: () => void; duration?: number }

type ToastApi = {
  show: (message: string, opts?: ShowOpts) => void
  /** Optimistic-delete pattern: onCommit runs if not undone within the window. */
  undo: (message: string, o: { onUndo: () => void; onCommit: () => void; duration?: number }) => void
  error: (message: string, o?: { onRetry?: () => void }) => void
  success: (message: string) => void
}

const Ctx = createContext<ToastApi>({ show() {}, undo() {}, error() {}, success() {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const idRef = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id))
    const tm = timers.current.get(id)
    if (tm) clearTimeout(tm)
    timers.current.delete(id)
  }, [])

  const show = useCallback((message: string, opts: ShowOpts = {}) => {
    const id = ++idRef.current
    const duration = opts.duration ?? (opts.type === 'error' ? 6000 : 4000)
    setToasts(t => [...t.slice(-2), { id, message, type: opts.type ?? 'info', actionLabel: opts.actionLabel, onAction: opts.onAction }])
    const tm = setTimeout(() => { remove(id); opts.onExpire?.() }, duration)
    timers.current.set(id, tm)
  }, [remove])

  const api: ToastApi = {
    show,
    undo: (message, o) => show(message, { actionLabel: 'Undo', onAction: o.onUndo, onExpire: o.onCommit, duration: o.duration ?? 5000 }),
    error: (message, o = {}) => show(message, { type: 'error', actionLabel: o.onRetry ? 'Retry' : undefined, onAction: o.onRetry, duration: 6000 }),
    success: (message) => show(message, { type: 'success' }),
  }

  const accentFor = (t: ToastType) => (t === 'error' ? theme.red : t === 'success' ? theme.green : theme.accent)

  return (
    <Ctx.Provider value={api}>
      {children}
      <div role="status" aria-live="polite" style={{
        position: 'fixed', left: 0, right: 0, bottom: 'calc(94px + env(safe-area-inset-bottom, 0px))',
        zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none', padding: '0 16px',
      }}>
        {toasts.map(t => {
          const accent = accentFor(t.type)
          return (
            <div key={t.id} style={{
              pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 12,
              maxWidth: 440, width: 'fit-content',
              background: `color-mix(in srgb, ${theme.c1} 92%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accent} 40%, ${theme.border})`,
              borderRadius: 14, padding: '12px 14px 12px 16px',
              boxShadow: `0 18px 44px -18px rgba(0,0,0,0.6)`,
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              fontFamily: sans, animation: 'lumaToastIn .26s cubic-bezier(0.22,1,0.36,1) both',
            }}>
              <span style={{ color: accent, display: 'flex', flexShrink: 0 }}>
                <Icon name={t.type === 'error' ? 'x' : t.type === 'success' ? 'check' : 'clock'} size={16} stroke={2} />
              </span>
              <span style={{ fontSize: 13.5, color: theme.txt, lineHeight: 1.3 }}>{t.message}</span>
              {t.actionLabel && (
                <button onClick={() => { t.onAction?.(); remove(t.id) }} style={{
                  flexShrink: 0, marginLeft: 4, background: 'transparent',
                  border: `1px solid color-mix(in srgb, ${accent} 50%, ${theme.border})`,
                  borderRadius: 9, padding: '5px 12px', cursor: 'pointer',
                  fontFamily: sans, fontSize: 12.5, fontWeight: 600, color: accent,
                }}>{t.actionLabel}</button>
              )}
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
