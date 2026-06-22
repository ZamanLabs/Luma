'use client'

import { useState } from 'react'
import type { Theme } from '../../theme'
import { styles, serif, sans, Icon } from '../ui'

export default function Onboarding({ t, name, onComplete }: {
  t: Theme
  name: string
  onComplete: (goal: number, budget: number) => void
}) {
  const s = styles(t)
  const [goal, setGoal] = useState('2000')
  const [budget, setBudget] = useState('15000')

  const field = (label: string, value: string, set: (v: string) => void, prefix?: string) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...s.label, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: t.c2, border: `1px solid ${t.border}`, borderRadius: 12, padding: '0 14px' }}>
        {prefix && <span style={{ color: t.muted, fontFamily: serif, fontSize: 18 }}>{prefix}</span>}
        <input className="luma-input" value={value} onChange={e => set(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: t.txt, fontFamily: serif, fontSize: 24, padding: '12px 0', width: '100%' }} />
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
      <div style={{
        width: '100%', maxWidth: 420, animation: 'lumaToastIn .32s cubic-bezier(0.22,1,0.36,1) both',
        background: `linear-gradient(170deg, ${t.c1}, ${t.bg})`, border: `1px solid ${t.border}`,
        borderRadius: 26, padding: 26, boxShadow: `0 1px 0 color-mix(in srgb, ${t.txt} 7%, transparent) inset, 0 34px 80px -30px rgba(0,0,0,0.75)`,
      }}>
        <div style={{ ...s.label, marginBottom: 10 }}>Welcome{name ? `, ${name}` : ''}</div>
        <div style={{ fontFamily: serif, fontSize: 34, color: t.txt, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 10 }}>Let&apos;s set up Luma</div>
        <div style={{ fontSize: 13, color: t.muted, marginBottom: 24, lineHeight: 1.55, fontFamily: sans }}>
          Two quick numbers so your rings and bloom actually mean something. You can change them anytime.
        </div>

        {field('Daily calorie goal', goal, setGoal)}
        {field('Monthly budget', budget, setBudget, '৳')}

        <button className="luma-btn" onClick={() => onComplete(parseInt(goal) || 2000, parseInt(budget) || 15000)}
          style={{ ...s.primaryBtn, width: '100%', marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Start tending <Icon name="arrowRight" size={16} />
        </button>
      </div>
    </div>
  )
}
