'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { Theme } from '../theme'

/* Lets any page (e.g. the home avatar) open the profile menu owned by the layout. */
export const ProfileMenuContext = createContext<() => void>(() => {})
export const useProfileMenu = () => useContext(ProfileMenuContext)

/* ----------------------------------------------------------------------------
   Typography
---------------------------------------------------------------------------- */

export const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');"

export const serif = "'Cormorant Garamond', Georgia, serif"
export const sans = "'DM Sans', system-ui, -apple-system, sans-serif"

/* ----------------------------------------------------------------------------
   Global stylesheet — injected once by the dashboard layout.
   Hover / focus states read theme colors through CSS custom properties
   (--accent, --c2, …) which the layout sets from the active theme.
---------------------------------------------------------------------------- */

export const GLOBAL_CSS = `
* { -webkit-tap-highlight-color: transparent; }

::selection { background: color-mix(in srgb, var(--accent) 28%, transparent); }

::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 9px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted); }
::-webkit-scrollbar-track { background: transparent; }

@keyframes lumaFloat {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(-3%, 4%); }
}
@keyframes lumaPulse {
  0%, 100% { opacity: .55; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.04); }
}
@keyframes lumaAurora1 {
  0%, 100% { transform: translate(-6%, -4%) scale(1); }
  50%      { transform: translate(9%, 11%) scale(1.18); }
}
@keyframes lumaAurora2 {
  0%, 100% { transform: translate(9%, 7%) scale(1.12); }
  50%      { transform: translate(-9%, -7%) scale(1); }
}
@keyframes lumaToastIn {
  from { opacity: 0; transform: translateY(14px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.luma-input {
  transition: border-color .2s ease, box-shadow .25s ease, background .2s ease;
}
.luma-input::placeholder { color: var(--sub); }
.luma-input:focus {
  border-color: var(--accent) !important;
  background: var(--c3) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent);
}

.luma-btn {
  transition: transform .15s ease, box-shadow .25s ease, filter .2s ease;
}
.luma-btn:hover { filter: brightness(1.07); transform: translateY(-1px); }
.luma-btn:active { transform: translateY(0) scale(.985); filter: brightness(.98); }

.luma-ghost {
  transition: border-color .2s ease, color .2s ease, background .2s ease;
}
.luma-ghost:hover {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border)) !important;
  color: var(--txt) !important;
}

.luma-card { transition: border-color .3s ease, box-shadow .3s ease, transform .3s ease; }

.luma-icon-btn {
  transition: background .2s ease, color .2s ease, border-color .2s ease;
}
.luma-icon-btn:hover { background: var(--c3) !important; color: var(--txt) !important; }

.luma-row .luma-del { opacity: 0; transition: opacity .2s ease, color .2s ease, background .2s ease; }
.luma-row:hover .luma-del { opacity: 1; }
.luma-del:hover { color: var(--red) !important; background: color-mix(in srgb, var(--red) 14%, transparent) !important; }

.luma-tab { transition: color .25s ease; }
.luma-tab .luma-tab-pill { transition: background .25s ease, transform .25s ease, opacity .25s ease; }

.luma-link { transition: color .2s ease, opacity .2s ease; }
.luma-link:hover { opacity: 1 !important; color: var(--accent) !important; }

@media (prefers-reduced-motion: reduce) {
  .luma-ambient { animation: none !important; }
}

@media (pointer: fine) {
  .luma-cursor-on, .luma-cursor-on * { cursor: none; }
  .luma-cursor-on input, .luma-cursor-on textarea, .luma-cursor-on select, .luma-cursor-on [contenteditable] { cursor: auto; }
}
@media (pointer: coarse) { .luma-cur { display: none; } }
.luma-cur { position: fixed; top: 0; left: 0; z-index: 9999; pointer-events: none; border-radius: 50%; will-change: transform; }

/* Cursor-tracking spotlight on interactive tiles */
.luma-tile::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 0;
  background: radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--accent) 20%, transparent), transparent 60%);
  opacity: 0; transition: opacity .4s ease;
}
.luma-tile:hover::after { opacity: 1; }
.luma-tile > * { position: relative; z-index: 1; }

.luma-side-nav { display: none; }
.b-span2 { grid-column: span 2; }
.b-wide { grid-column: span 2; }

.luma-side-tab { transition: background .2s ease, color .2s ease; }
.luma-side-tab:hover { background: var(--c2); color: var(--txt); }

@media (min-width: 920px) {
  .luma-bottom-nav { display: none !important; }
  .luma-side-nav { display: flex !important; }
  .luma-main { padding-left: 244px !important; padding-bottom: 24px !important; }
  .luma-home { max-width: 1060px !important; }
  .luma-page { max-width: 660px !important; }
  .luma-bento { grid-template-columns: repeat(4, 1fr) !important; gap: 16px !important; }
  .b-wide { grid-column: span 4 !important; }
}
`

/* ----------------------------------------------------------------------------
   Line-icon set — single source of truth, replaces every emoji in the app.
   1.6px strokes, currentColor, 24px grid.
---------------------------------------------------------------------------- */

const ICONS: Record<string, ReactNode> = {
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" /></>,
  nutrition: <><path d="M20 4C9 4 4 9 4 13a7 7 0 0 0 7 7c5 0 9-5 9-16Z" /><path d="M4.5 19.5C8 14 12 11 17 9" /></>,
  finance: <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10.5h18" /><path d="M7 15.5h3" /></>,
  move: <path d="M2 12h4l2.5 7 5-15 2.5 8h4" />,
  meds: <><path d="M10.6 20.4 3.6 13.4a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7Z" /><path d="M8.1 8.1l7 7" /></>,
  journal: <><path d="M12 6c-2-1.4-4.6-2-7.5-2v14c2.9 0 5.5.6 7.5 2 2-1.4 4.6-2 7.5-2V4c-2.9 0-5.5.6-7.5 2Z" /><path d="M12 6v14" /></>,
  settings: <><circle cx="8" cy="8" r="2.2" /><path d="M10.5 8H20" /><path d="M4 8h1.5" /><circle cx="16" cy="16" r="2.2" /><path d="M4 16h9.5" /><path d="M18.5 16H20" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  x: <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>,
  chevronLeft: <path d="M14.5 6l-6 6 6 6" />,
  chevronRight: <path d="M9.5 6l6 6-6 6" />,
  arrowRight: <><path d="M4 12h15" /><path d="M13 6l6 6-6 6" /></>,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9.5h16" /><path d="M8.5 3v4" /><path d="M15.5 3v4" /></>,
  edit: <><path d="M4 20.5h4.5L20 9 15.5 4.5 4 16Z" /><path d="M14 6l4.5 4.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>,
  trash: <><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6.5 7l.9 12a1 1 0 0 0 1 .95h7.2a1 1 0 0 0 1-.95L17.5 7" /></>,
  sparkle: <path d="M12 3l1.8 5.7L19.5 11l-5.7 1.8L12 18l-1.8-5.2L4.5 11l5.7-2.3Z" />,
  bell: <><path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.4 7-2.4 7h16.8S18 14.5 18 8.5Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  bellOff: <><path d="M8.7 4.2A6 6 0 0 1 18 8.5c0 2.6.5 4.3 1 5.4M5.4 9.9C5.7 13.6 4 15.5 4 15.5h12M10 20a2 2 0 0 0 4 0" /><path d="M3 3l18 18" /></>,
  trend: <><path d="M3 17l6-6 4 4 7-7" /><path d="M17 7h4v4" /></>,
  utensils: <><path d="M6 3v8a2 2 0 0 0 4 0V3" /><path d="M8 11v10" /><path d="M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v9" /></>,
}

export function Icon({
  name,
  size = 20,
  stroke = 1.6,
  fill = 'none',
  style,
}: {
  name: keyof typeof ICONS | string
  size?: number
  stroke?: number
  fill?: string
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {ICONS[name] ?? null}
    </svg>
  )
}

/* ----------------------------------------------------------------------------
   Style helpers — theme-aware, shared across every page for consistency.
---------------------------------------------------------------------------- */

export function styles(t: Theme) {
  const label: CSSProperties = {
    fontFamily: sans,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: t.sub,
  }

  return {
    label,

    page: {
      padding: '34px 20px 40px',
      maxWidth: 500,
      margin: '0 auto',
      fontFamily: sans,
    } as CSSProperties,

    // Big editorial title (serif)
    title: {
      fontFamily: serif,
      fontSize: 38,
      fontWeight: 400,
      color: t.txt,
      lineHeight: 1,
      letterSpacing: '-0.015em',
    } as CSSProperties,

    eyebrow: { ...label, marginBottom: 10 } as CSSProperties,

    sub: {
      fontFamily: sans,
      fontSize: 12.5,
      fontWeight: 400,
      color: t.sub,
    } as CSSProperties,

    // Display number (serif, tabular)
    bigNum: {
      fontFamily: serif,
      fontWeight: 400,
      lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.02em',
    } as CSSProperties,

    card: {
      background: `linear-gradient(170deg, ${t.c1}, ${t.bg})`,
      border: `1px solid ${t.border}`,
      borderRadius: 22,
      padding: 20,
      marginBottom: 14,
      boxShadow: `0 1px 0 color-mix(in srgb, ${t.txt} 6%, transparent) inset, 0 16px 38px -22px rgba(0,0,0,0.32)`,
    } as CSSProperties,

    input: {
      background: t.c2,
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      padding: '12px 14px',
      color: t.txt,
      fontSize: 14,
      fontFamily: sans,
      outline: 'none',
      WebkitAppearance: 'none',
      appearance: 'none',
    } as CSSProperties,

    primaryBtn: {
      background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
      border: 'none',
      borderRadius: 12,
      padding: '12px 22px',
      fontSize: 13.5,
      fontWeight: 600,
      fontFamily: sans,
      letterSpacing: '0.01em',
      cursor: 'pointer',
      color: t.bg,
      boxShadow: `0 6px 18px -8px ${t.accent}`,
    } as CSSProperties,

    ghostBtn: {
      background: 'transparent',
      border: `1px solid ${t.border}`,
      borderRadius: 11,
      padding: '8px 14px',
      fontSize: 12.5,
      fontWeight: 500,
      fontFamily: sans,
      color: t.muted,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
    } as CSSProperties,

    // Small circular icon button (delete, etc.)
    iconBtn: {
      background: 'transparent',
      border: `1px solid ${t.border}`,
      color: t.sub,
      borderRadius: 9,
      width: 28,
      height: 28,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      flexShrink: 0,
    } as CSSProperties,

    chip: (color: string): CSSProperties => ({
      fontFamily: sans,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.02em',
      padding: '4px 10px',
      borderRadius: 999,
      background: `color-mix(in srgb, ${color} 16%, transparent)`,
      color,
      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }),

    track: {
      background: t.c2,
      borderRadius: 999,
      height: 8,
      overflow: 'hidden',
      border: `1px solid color-mix(in srgb, ${t.border} 60%, transparent)`,
    } as CSSProperties,

    bar: (color: string): CSSProperties => ({
      height: '100%',
      borderRadius: 999,
      width: '0%',
      background: `linear-gradient(90deg, color-mix(in srgb, ${color} 75%, ${t.bg}), ${color})`,
      boxShadow: `0 0 12px -2px ${color}`,
    }),

    unit: {
      fontFamily: sans,
      fontSize: 12.5,
      color: t.muted,
      fontWeight: 400,
      marginLeft: 7,
      alignSelf: 'flex-end',
    } as CSSProperties,
  }
}

/* ----------------------------------------------------------------------------
   Section header used at the top of each page.
---------------------------------------------------------------------------- */

export function PageHeader({
  t,
  eyebrow,
  title,
  right,
}: {
  t: Theme
  eyebrow: string
  title: string
  right?: ReactNode
}) {
  const s = styles(t)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 26 }}>
      <div>
        <div style={s.eyebrow}>{eyebrow}</div>
        <h1 style={s.title}>{title}</h1>
      </div>
      {right}
    </div>
  )
}

/* Subtle uppercase section label inside cards */
export function CardLabel({ t, children, style }: { t: Theme; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...styles(t).label, marginBottom: 14, ...style }}>{children}</div>
}

/* Centered loading state */
export function Loader({ t }: { t: Theme }) {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: serif,
        fontSize: 26,
        fontWeight: 400,
        color: t.muted,
        letterSpacing: '0.04em',
      }}
    >
      <span className="luma-ambient" style={{ animation: 'lumaPulse 1.8s ease-in-out infinite' }}>
        Luma
      </span>
    </div>
  )
}

/* ----------------------------------------------------------------------------
   Radial gauge — the app's signature progress element (replaces thin bars).
---------------------------------------------------------------------------- */

export function Ring({
  size = 120,
  stroke = 10,
  pct,
  color,
  track,
  glow = true,
  children,
}: {
  size?: number
  stroke?: number
  pct: number
  color: string
  track: string
  glow?: boolean
  children?: ReactNode
}) {
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(r)
  }, [])

  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct))
  const offset = grown ? circ * (1 - clamped / 100) : circ

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)',
            filter: glow ? `drop-shadow(0 0 5px color-mix(in srgb, ${color} 55%, transparent))` : 'none',
          }}
        />
      </svg>
      {children && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* Rich, category-tinted tile surface for the bento dashboard. */
export function tileStyle(t: Theme, accent: string): CSSProperties {
  return {
    position: 'relative',
    background: `linear-gradient(155deg, color-mix(in srgb, ${accent} 17%, ${t.c1}), ${t.c1} 72%)`,
    border: `1px solid color-mix(in srgb, ${accent} 30%, ${t.border})`,
    borderRadius: 24,
    padding: 18,
    cursor: 'pointer',
    overflow: 'hidden',
    boxShadow: `0 1px 0 color-mix(in srgb, ${t.txt} 8%, transparent) inset, 0 22px 48px -26px color-mix(in srgb, ${accent} 35%, rgba(0,0,0,0.5))`,
  }
}

/* ----------------------------------------------------------------------------
   Weekly bar chart — 7-day trend, today highlighted, optional goal line.
---------------------------------------------------------------------------- */

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Array of YYYY-MM-DD for the n days ending at (and including) `end`. */
export function lastNDays(n: number, end: string): string[] {
  const out: string[] = []
  const base = new Date(end + 'T12:00')
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export function WeekChart({
  t,
  data,
  color,
  goal,
  fmt = (v: number) => String(Math.round(v)),
}: {
  t: Theme
  data: { date: string; value: number }[]
  color: string
  goal?: number
  fmt?: (v: number) => string
}) {
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(r)
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const H = 92
  const max = Math.max(goal ?? 0, ...data.map(d => d.value), 1)
  const fullLabel = (d: string) => new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div>
      <div style={{ position: 'relative', height: H, display: 'flex', alignItems: 'flex-end', gap: 7 }}>
        {goal && goal <= max && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: (goal / max) * H,
            borderTop: `1px dashed color-mix(in srgb, ${t.muted} 70%, transparent)`,
            opacity: 0.6, pointerEvents: 'none',
          }} />
        )}
        {data.map(d => {
          const isToday = d.date === today
          const bh = grown ? Math.max(d.value > 0 ? 5 : 2, (d.value / max) * H) : 0
          const c = isToday ? color : `color-mix(in srgb, ${color} 36%, ${t.c2})`
          return (
            <div key={d.date} style={{ flex: 1, position: 'relative', height: H, display: 'flex', alignItems: 'flex-end' }}>
              {isToday && d.value > 0 && (
                <span style={{
                  position: 'absolute', left: 0, right: 0, textAlign: 'center',
                  top: Math.max(0, H - bh - 16),
                  fontFamily: serif, fontSize: 12, color, fontVariantNumeric: 'tabular-nums',
                  transition: 'top .7s cubic-bezier(0.22,1,0.36,1)',
                }}>{fmt(d.value)}</span>
              )}
              <div
                title={`${fullLabel(d.date)} · ${fmt(d.value)}`}
                style={{
                  width: '100%', maxWidth: 24, margin: '0 auto', height: bh, minHeight: 2, borderRadius: 7,
                  background: `linear-gradient(180deg, ${c}, color-mix(in srgb, ${c} 55%, ${t.bg}))`,
                  boxShadow: isToday ? `0 0 12px -2px ${color}` : 'none',
                  transition: 'height .7s cubic-bezier(0.22,1,0.36,1)',
                }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
        {data.map(d => {
          const isToday = d.date === today
          return (
            <div key={d.date} style={{
              flex: 1, textAlign: 'center', fontFamily: sans, fontSize: 9.5,
              fontWeight: isToday ? 700 : 500, letterSpacing: '0.04em',
              color: isToday ? color : t.sub,
            }}>
              {DOW[new Date(d.date + 'T12:00').getDay()]}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Empty state with a line icon */
export function EmptyState({ t, icon, text, hint }: { t: Theme; icon: string; text: string; hint?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '54px 0', color: t.sub }}>
      <div style={{ display: 'inline-flex', color: t.sub, opacity: 0.7, marginBottom: 14 }}>
        <Icon name={icon} size={34} stroke={1.3} />
      </div>
      <div style={{ fontSize: 13.5, fontFamily: sans, color: t.muted }}>{text}</div>
      {hint && <div style={{ fontSize: 12, fontFamily: sans, marginTop: 6 }}>{hint}</div>}
    </div>
  )
}
