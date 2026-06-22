'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'
import Bloom, { type BloomInput } from '../Bloom'

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');

@keyframes lumaRise {
  from { opacity: 0; transform: translateY(18px); filter: blur(7px); }
  to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
}
.luma-rise { animation: lumaRise 1.1s cubic-bezier(0.22, 1, 0.36, 1) both; }

@media (prefers-reduced-motion: reduce) {
  .luma-rise { animation-duration: 0.01ms !important; animation-delay: 0ms !important; }
}
`

// An idealised, calm bloom — the brand emblem (no user data on the login).
const EMBLEM: BloomInput = {
  growth: 0.96, warmth: 1, motion: 0.5, petals: 26, seed: 70741,
  green: '#72b07c', amber: '#e8a53a', off: '#c95f52', particle: '#9b7fc9',
}

export default function LoginPage() {
  const supabase = createClient()
  const [btnHovered, setBtnHovered] = useState(false)

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
        background: 'radial-gradient(135% 90% at 50% 32%, #0e0b08 0%, #050403 74%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', padding: '0 24px',
      }}>

        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 45%, black 10%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 45%, black 10%, transparent 100%)',
        }} />
        {/* Grain */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.16,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")`,
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560, textAlign: 'center' }}>

          {/* Living emblem — the same bloom that lives on the dashboard */}
          <div className="luma-rise" style={{ animationDelay: '0.05s', marginBottom: -30 }}>
            <Bloom input={EMBLEM} height={300} />
          </div>

          <div className="luma-rise" style={{
            animationDelay: '0.35s',
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 76, fontWeight: 400, color: '#f4ecdd',
            letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 14,
            textShadow: '0 0 60px rgba(232,165,58,0.28)',
          }}>
            Luma
          </div>

          <div className="luma-rise" style={{
            animationDelay: '0.5s',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11, color: 'rgba(240,230,214,0.36)',
            letterSpacing: '0.24em', textTransform: 'uppercase',
            marginBottom: 56, fontWeight: 500,
          }}>
            Tend your days
          </div>

          <button
            className="luma-rise"
            onClick={signInWithGoogle}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              animationDelay: '0.65s',
              display: 'flex', alignItems: 'center', gap: 10, margin: '0 auto',
              background: btnHovered ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${btnHovered ? 'rgba(232,165,58,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 14, padding: '14px 30px', color: '#e8dcc8',
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400,
              cursor: 'pointer', backdropFilter: 'blur(8px)', letterSpacing: '0.02em',
              transform: btnHovered ? 'translateY(-2px)' : 'translateY(0)',
              transition: 'background .3s ease, border-color .3s ease, box-shadow .3s ease, transform .3s ease',
              boxShadow: btnHovered ? '0 10px 34px rgba(232,165,58,0.18)' : '0 2px 14px rgba(0,0,0,0.35)',
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
