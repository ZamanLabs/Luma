'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import { useTheme } from '../ThemeContext'
import { FONT_IMPORT, GLOBAL_CSS, Icon, sans } from './ui'

const tabs = [
  { id: 'home',      icon: 'home',      label: 'Home',     path: '/dashboard/home'      },
  { id: 'nutrition', icon: 'nutrition', label: 'Eat',      path: '/dashboard/nutrition' },
  { id: 'finance',   icon: 'finance',   label: 'Money',    path: '/dashboard/finance'   },
  { id: 'exercise',  icon: 'move',      label: 'Move',     path: '/dashboard/exercise'  },
  { id: 'meds',      icon: 'meds',      label: 'Meds',     path: '/dashboard/meds'      },
  { id: 'journal',   icon: 'journal',   label: 'Journal',  path: '/dashboard/journal'   },
  { id: 'settings',  icon: 'settings',  label: 'Settings', path: '/dashboard/settings'  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme } = useTheme()

  // Expose theme colors as CSS custom properties so the global stylesheet
  // (focus rings, hovers) can stay theme-aware.
  const cssVars = {
    '--bg': theme.bg,
    '--c1': theme.c1,
    '--c2': theme.c2,
    '--c3': theme.c3,
    '--border': theme.border,
    '--txt': theme.txt,
    '--muted': theme.muted,
    '--sub': theme.sub,
    '--accent': theme.accent,
    '--accent2': theme.accent2,
    '--red': theme.red,
  } as CSSProperties

  return (
    <div style={{ ...cssVars, minHeight: '100vh', background: theme.bg, color: theme.txt, fontFamily: sans, position: 'relative' }}>
      <style>{FONT_IMPORT + GLOBAL_CSS}</style>

      {/* Ambient background — soft accent glow + faint grain, theme-aware */}
      <div
        className="luma-ambient"
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `radial-gradient(120% 80% at 50% -10%, color-mix(in srgb, ${theme.accent} 9%, transparent) 0%, transparent 55%)`,
          animation: 'lumaFloat 18s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.5,
          backgroundImage: 'radial-gradient(circle, color-mix(in srgb, currentColor 5%, transparent) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          color: theme.muted,
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 5%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 5%, transparent 75%)',
        }}
      />

      <main style={{ position: 'relative', zIndex: 1, paddingBottom: 96 }}>
        {children}
      </main>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10,
        background: `color-mix(in srgb, ${theme.bg} 82%, transparent)`,
        borderTop: `1px solid ${theme.border}`,
        display: 'flex', justifyContent: 'center', gap: 2,
        padding: '10px 8px calc(12px + env(safe-area-inset-bottom, 0px))',
        backdropFilter: 'blur(18px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
      }}>
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.path)
          return (
            <button
              key={tab.id}
              className="luma-tab"
              onClick={() => router.push(tab.path)}
              style={{
                position: 'relative',
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '7px 10px 5px', flex: '0 1 64px',
                color: active ? theme.accent : theme.muted,
                fontFamily: sans,
              }}
            >
              <span className="luma-tab-pill" style={{
                position: 'absolute', top: 0, width: 38, height: 30, borderRadius: 10,
                background: active ? `color-mix(in srgb, ${theme.accent} 16%, transparent)` : 'transparent',
                transform: active ? 'scale(1)' : 'scale(0.7)',
                opacity: active ? 1 : 0,
              }} />
              <span style={{ position: 'relative', display: 'flex' }}>
                <Icon name={tab.icon} size={21} stroke={active ? 1.9 : 1.6} />
              </span>
              <span style={{
                position: 'relative', fontSize: 9.5, fontWeight: active ? 600 : 500,
                letterSpacing: '0.04em', color: active ? theme.accent : theme.sub,
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
