'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTheme } from '../ThemeContext'
import { themes } from '../theme'
import { createClient } from '@/utils/supabase/client'
import { FONT_IMPORT, GLOBAL_CSS, Icon, ProfileMenuContext, serif, sans } from './ui'
import Cursor from './Cursor'
import { ToastProvider } from './Toast'
import Ember from './Ember'
import Intro from './Intro'

const tabs = [
  { id: 'home',      icon: 'home',      label: 'Home',    path: '/dashboard/home'      },
  { id: 'nutrition', icon: 'nutrition', label: 'Eat',     path: '/dashboard/nutrition' },
  { id: 'finance',   icon: 'finance',   label: 'Money',   path: '/dashboard/finance'   },
  { id: 'exercise',  icon: 'move',      label: 'Move',    path: '/dashboard/exercise'  },
  { id: 'meds',      icon: 'meds',      label: 'Meds',    path: '/dashboard/meds'      },
  { id: 'journal',   icon: 'journal',   label: 'Journal', path: '/dashboard/journal'   },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, themeName, setThemeName } = useTheme()
  const supabase = createClient()

  const [menuOpen, setMenuOpen] = useState(false)
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [cursorOn, setCursorOn] = useState(true)

  useEffect(() => { try { setCursorOn(localStorage.getItem('luma-cursor') !== '0') } catch {} }, [])
  const toggleCursor = () => setCursorOn(p => { const n = !p; try { localStorage.setItem('luma-cursor', n ? '1' : '0') } catch {}; return n })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setProfile({ name: user.user_metadata?.full_name || user.email?.split('@')[0] || '', email: user.email || '' })
    })
  }, [supabase])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Aurora as a living depth layer — drifts with cursor + scroll (parallax).
  const aur1 = useRef<HTMLDivElement>(null)
  const aur2 = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const st = { tx: 0, ty: 0, cx: 0, cy: 0 }
    const onMove = (e: PointerEvent) => { st.tx = e.clientX / window.innerWidth - 0.5; st.ty = e.clientY / window.innerHeight - 0.5 }
    let raf = 0
    const loop = () => {
      st.cx += (st.tx - st.cx) * 0.05; st.cy += (st.ty - st.cy) * 0.05
      const sy = window.scrollY || 0
      if (aur1.current) aur1.current.style.transform = `translate(${st.cx * 38}px, ${st.cy * 28 + sy * 0.05}px)`
      if (aur2.current) aur2.current.style.transform = `translate(${st.cx * -28}px, ${st.cy * -20 - sy * 0.035}px)`
      if (!document.hidden) raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(loop)
    const onVis = () => { if (!document.hidden) { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop) } }
    document.addEventListener('visibilitychange', onVis)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  // Cursor-tracking spotlight + subtle magnetic tilt on interactive tiles.
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const tilt = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cur: HTMLElement | null = null
    const reset = (el: HTMLElement | null) => { if (el) { el.style.transform = ''; el.style.removeProperty('--mx'); el.style.removeProperty('--my') } }
    const onMove = (e: PointerEvent) => {
      const tile = (e.target as HTMLElement)?.closest?.('.luma-tile') as HTMLElement | null
      if (cur && cur !== tile) reset(cur)
      cur = tile
      if (!tile) return
      const r = tile.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
      tile.style.setProperty('--mx', px * 100 + '%')
      tile.style.setProperty('--my', py * 100 + '%')
      if (tilt) tile.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 7}deg) translateZ(0)`
    }
    const onOut = () => { reset(cur); cur = null }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('mouseleave', onOut)
    return () => { reset(cur); window.removeEventListener('pointermove', onMove); document.removeEventListener('mouseleave', onOut) }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initial = (profile.name || 'U').charAt(0).toUpperCase()

  // Aurora hues shift through the day, drawn from the active theme's palette.
  const hour = new Date().getHours()
  const aurora =
    hour < 5  ? [theme.blue, theme.purple] :   // night
    hour < 11 ? [theme.accent, theme.green] :  // morning
    hour < 17 ? [theme.green, theme.blue] :    // afternoon
    hour < 22 ? [theme.purple, theme.accent] : // evening
                [theme.blue, theme.purple]     // late night
  const isLight = theme.name === 'Snow' || theme.name === 'Paper'
  const auroraStrength = isLight ? 26 : 30

  const cssVars = {
    '--bg': theme.bg, '--c1': theme.c1, '--c2': theme.c2, '--c3': theme.c3,
    '--border': theme.border, '--txt': theme.txt, '--muted': theme.muted,
    '--sub': theme.sub, '--accent': theme.accent, '--accent2': theme.accent2, '--red': theme.red,
  } as CSSProperties

  const avatarStyle = (size: number): CSSProperties => ({
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: serif, fontSize: size * 0.42, color: theme.accent,
    background: `linear-gradient(150deg, color-mix(in srgb, ${theme.accent} 28%, ${theme.c1}), ${theme.c1})`,
    border: `1px solid color-mix(in srgb, ${theme.accent} 34%, ${theme.border})`,
  })

  return (
    <ProfileMenuContext.Provider value={() => setMenuOpen(true)}>
    <div style={{ ...cssVars, minHeight: '100vh', background: theme.bg, color: theme.txt, fontFamily: sans, position: 'relative' }}>
      <style>{FONT_IMPORT + GLOBAL_CSS}</style>
      {cursorOn && <Cursor accent={theme.accent} />}
      <Intro />

      {/* Signature ambient — a slow aurora that drifts and shifts with the
          time of day (warm at dawn, cool at night), tinted to the theme. */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div ref={aur1} style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
          <div className="luma-ambient" style={{
            position: 'absolute', top: '-25%', left: '-15%', width: '75vw', height: '75vw', borderRadius: '50%',
            background: `radial-gradient(circle, color-mix(in srgb, ${aurora[0]} ${auroraStrength}%, transparent), transparent 62%)`,
            filter: 'blur(72px)', animation: 'lumaAurora1 26s ease-in-out infinite',
          }} />
        </div>
        <div ref={aur2} style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
          <div className="luma-ambient" style={{
            position: 'absolute', top: '15%', right: '-20%', width: '70vw', height: '70vw', borderRadius: '50%',
            background: `radial-gradient(circle, color-mix(in srgb, ${aurora[1]} ${auroraStrength}%, transparent), transparent 62%)`,
            filter: 'blur(80px)', animation: 'lumaAurora2 34s ease-in-out infinite',
          }} />
        </div>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.5,
          backgroundImage: 'radial-gradient(circle, color-mix(in srgb, currentColor 5%, transparent) 1px, transparent 1px)',
          backgroundSize: '34px 34px', color: theme.muted,
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 5%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 5%, transparent 70%)',
        }} />
      </div>

      {/* Desktop: left sidebar */}
      <nav className="luma-side-nav" style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 244, zIndex: 10,
        flexDirection: 'column', padding: '32px 16px',
        background: `color-mix(in srgb, ${theme.bg} 78%, transparent)`,
        borderRight: `1px solid ${theme.border}`,
        backdropFilter: 'blur(18px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', marginBottom: 34 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11, overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 45%, #14110b, #070605)',
            border: `1px solid color-mix(in srgb, ${theme.accent} 30%, ${theme.border})`,
          }}>
            <Ember size={34} />
          </div>
          <span style={{ fontFamily: serif, fontSize: 26, color: theme.txt, letterSpacing: '-0.01em' }}>Luma</span>
        </div>
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.path)
          return (
            <button key={tab.id} className={`luma-side-tab${active ? ' is-active' : ''}`} onClick={() => router.push(tab.path)} style={{
              display: 'flex', alignItems: 'center', gap: 13, width: '100%',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              padding: '11px 14px', marginBottom: 3, borderRadius: 12,
              fontFamily: sans, fontSize: 14,
            }}>
              <Icon name={tab.icon} size={20} stroke={active ? 1.9 : 1.6} />
              {tab.label}
            </button>
          )
        })}

        {/* Profile / preferences */}
        <button className="luma-side-tab" onClick={() => setMenuOpen(true)} style={{
          marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 11, width: '100%',
          border: `1px solid ${theme.border}`, cursor: 'pointer', textAlign: 'left',
          padding: '10px 12px', borderRadius: 14, fontFamily: sans,
        }}>
          <span style={avatarStyle(32)}>{initial}</span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: 'block', fontSize: 13, color: theme.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name || 'Account'}</span>
            <span style={{ display: 'block', fontSize: 10.5, color: theme.sub }}>Preferences</span>
          </span>
          <Icon name="settings" size={16} stroke={1.6} />
        </button>
      </nav>

      <main className="luma-main" style={{ position: 'relative', zIndex: 1, paddingBottom: 96 }}>
        <ToastProvider>{children}</ToastProvider>
      </main>

      {/* Mobile: bottom nav */}
      <nav className="luma-bottom-nav" style={{
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
            <button key={tab.id} className={`luma-tab${active ? ' is-active' : ''}`} onClick={() => router.push(tab.path)} style={{
              position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '7px 10px 5px', flex: '0 1 60px', fontFamily: sans,
            }}>
              <span className="luma-tab-pill" style={{ position: 'absolute', top: 0, width: 38, height: 30, borderRadius: 10 }} />
              <span style={{ position: 'relative', display: 'flex' }}>
                <Icon name={tab.icon} size={21} stroke={active ? 1.9 : 1.6} />
              </span>
              <span className="luma-tab-label" style={{ position: 'relative', fontSize: 9.5, letterSpacing: '0.04em' }}>
                {tab.label}
              </span>
            </button>
          )
        })}
        {/* Profile button */}
        <button className="luma-tab" onClick={() => setMenuOpen(true)} style={{
          position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          padding: '7px 10px 5px', flex: '0 1 60px', fontFamily: sans,
        }}>
          <span className="luma-tab-pill" style={{ position: 'absolute', top: 0, width: 38, height: 30, borderRadius: 10 }} />
          <span style={{ position: 'relative', ...avatarStyle(22), fontSize: 11 }}>{initial}</span>
          <span className="luma-tab-label" style={{ position: 'relative', fontSize: 9.5, letterSpacing: '0.04em' }}>You</span>
        </button>
      </nav>

      {/* Profile menu — theme + account */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 384, animation: 'lumaRise .35s cubic-bezier(0.22,1,0.36,1) both',
            background: `linear-gradient(170deg, ${theme.c1}, ${theme.bg})`,
            border: `1px solid ${theme.border}`, borderRadius: 24, padding: 22,
            boxShadow: `0 1px 0 color-mix(in srgb, ${theme.txt} 7%, transparent) inset, 0 30px 70px -28px rgba(0,0,0,0.7)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 22 }}>
              <span style={avatarStyle(46)}>{initial}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: serif, fontSize: 22, color: theme.txt, lineHeight: 1 }}>{profile.name || 'Account'}</div>
                <div style={{ fontSize: 12, color: theme.sub, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.email}</div>
              </div>
              <button className="luma-icon-btn" onClick={() => setMenuOpen(false)} style={{
                background: 'transparent', border: `1px solid ${theme.border}`, color: theme.sub,
                borderRadius: 9, width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              }}><Icon name="x" size={15} /></button>
            </div>

            <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.sub, marginBottom: 12 }}>Theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9, marginBottom: 22 }}>
              {Object.entries(themes).map(([key, t]) => {
                const active = themeName === key
                return (
                  <button key={key} onClick={() => setThemeName(key)} style={{
                    background: `linear-gradient(160deg, ${t.c1}, ${t.bg})`, cursor: 'pointer',
                    border: `1.5px solid ${active ? t.accent : t.border}`, borderRadius: 13, padding: '11px 10px',
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
                    boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${t.accent} 18%, transparent)` : 'none',
                  }}>
                    <span style={{ display: 'flex', gap: 4 }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})` }} />
                      <span style={{ width: 8, height: 14, borderRadius: 5, background: t.green }} />
                      <span style={{ width: 8, height: 14, borderRadius: 5, background: t.blue }} />
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontFamily: serif, fontSize: 13, color: t.txt }}>{t.name}</span>
                      {active && <span style={{ color: t.accent, display: 'flex' }}><Icon name="check" size={13} stroke={2.4} /></span>}
                    </span>
                  </button>
                )
              })}
            </div>

            <button onClick={toggleCursor} role="switch" aria-checked={cursorOn} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              background: theme.c2, border: `1px solid ${theme.border}`, borderRadius: 12, padding: '12px 14px',
              cursor: 'pointer', marginBottom: 12, fontFamily: sans,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: theme.txt }}>
                <Icon name="sparkle" size={15} stroke={1.8} />Custom cursor
              </span>
              <span style={{
                width: 38, height: 22, borderRadius: 999, flexShrink: 0, position: 'relative',
                background: cursorOn ? `linear-gradient(135deg, ${theme.accent}, ${theme.accent2})` : theme.c3,
                border: `1px solid ${cursorOn ? 'transparent' : theme.border}`, transition: 'background .2s',
              }}>
                <span style={{
                  position: 'absolute', top: 2, left: cursorOn ? 18 : 2, width: 16, height: 16, borderRadius: '50%',
                  background: cursorOn ? theme.bg : theme.muted, transition: 'left .2s ease',
                }} />
              </span>
            </button>

            <button onClick={signOut} style={{
              width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'transparent', border: `1px solid color-mix(in srgb, ${theme.red} 45%, ${theme.border})`,
              borderRadius: 12, padding: '12px 0', fontSize: 13.5, fontWeight: 600, color: theme.red, cursor: 'pointer', fontFamily: sans,
            }}>
              <Icon name="arrowRight" size={16} />Sign out
            </button>
          </div>
        </div>
      )}
    </div>
    </ProfileMenuContext.Provider>
  )
}
