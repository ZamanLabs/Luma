'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useRef, useState } from 'react'

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap');

@keyframes lumaRise {
  from { opacity: 0; transform: translateY(16px); filter: blur(6px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
}
@keyframes lumaBreathe {
  0%, 100% { opacity: 0.45; transform: scale(1);    }
  50%      { opacity: 0.9;  transform: scale(1.08); }
}
.luma-rise { animation: lumaRise 1s cubic-bezier(0.22, 1, 0.36, 1) both; }

@media (prefers-reduced-motion: reduce) {
  .luma-rise    { animation-duration: 0.01ms !important; animation-delay: 0ms !important; }
  .luma-breathe { animation: none !important; }
  .luma-spot    { display: none !important; }
}
`

export default function LoginPage() {
  const supabase = createClient()

  const bigRef = useRef<HTMLDivElement>(null)
  const coreRef = useRef<HTMLDivElement>(null)
  const target = useRef({ x: 0, y: 0 })
  const pos = useRef({ x: 0, y: 0 })
  const raf = useRef<number | null>(null)

  const [ready, setReady] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    target.current = { x: cx, y: cy }
    pos.current = { x: cx, y: cy }

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX
      target.current.y = e.clientY
    }

    const loop = () => {
      const dx = target.current.x - pos.current.x
      const dy = target.current.y - pos.current.y
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        pos.current.x += dx * 0.12
        pos.current.y += dy * 0.12
        const t = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`
        if (bigRef.current) bigRef.current.style.transform = t
        if (coreRef.current) coreRef.current.style.transform = t
      }
      raf.current = requestAnimationFrame(loop)
    }

    loop()
    setReady(true)

    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) console.error(error)
  }

  return (
    <>
      <style>{STYLE}</style>
      <div style={{
        minHeight: '100vh',
        background: '#090806',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Cursor-following spotlights */}
        <div ref={bigRef} className="luma-spot" style={{
          position: 'absolute', left: 0, top: 0,
          width: 1400, height: 1100, marginLeft: -700, marginTop: -550,
          pointerEvents: 'none', willChange: 'transform',
          opacity: ready ? 1 : 0, transition: 'opacity 1.2s ease',
          background: 'radial-gradient(ellipse at center, rgba(232,165,58,0.22) 0%, rgba(232,165,58,0.06) 42%, transparent 70%)',
        }} />
        <div ref={coreRef} className="luma-spot" style={{
          position: 'absolute', left: 0, top: 0,
          width: 480, height: 400, marginLeft: -240, marginTop: -200,
          pointerEvents: 'none', willChange: 'transform', mixBlendMode: 'screen',
          opacity: ready ? 1 : 0, transition: 'opacity 1.2s ease',
          background: 'radial-gradient(ellipse at center, rgba(255,220,130,0.16) 0%, transparent 60%)',
        }} />

        {/* Breathing center glow */}
        <div className="luma-breathe" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          animation: 'lumaBreathe 7s ease-in-out infinite',
          background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(232,165,58,0.06) 0%, transparent 70%)',
        }} />

        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 100%)',
        }} />

        {/* Grain */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.18,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")`,
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>

          <div className="luma-rise" style={{
            animationDelay: '0.05s',
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 88, fontWeight: 300, color: '#f0e6d6',
            letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 12,
            textShadow: '0 0 70px rgba(232,165,58,0.3)',
          }}>
            Luma
          </div>

          <div className="luma-rise" style={{
            animationDelay: '0.2s',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11, color: 'rgba(240,230,214,0.34)',
            letterSpacing: '0.22em', textTransform: 'uppercase',
            marginBottom: 64, fontWeight: 500,
          }}>
            Personal Tracker
          </div>

          <button
            className="luma-rise"
            onClick={signInWithGoogle}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              animationDelay: '0.35s',
              display: 'flex', alignItems: 'center', gap: 10, margin: '0 auto',
              background: btnHovered ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${btnHovered ? 'rgba(232,165,58,0.45)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 12, padding: '13px 28px', color: '#d4c8b8',
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400,
              cursor: 'pointer', backdropFilter: 'blur(8px)', letterSpacing: '0.02em',
              transform: btnHovered ? 'translateY(-1px)' : 'translateY(0)',
              transition: 'background .3s ease, border-color .3s ease, box-shadow .3s ease, transform .3s ease',
              boxShadow: btnHovered ? '0 6px 28px rgba(232,165,58,0.14)' : '0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

        </div>
      </div>
    </>
  )
}