'use client'

import { useTheme } from '../../ThemeContext'
import { themes } from '../../theme'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { styles, PageHeader, CardLabel, Icon, serif, sans } from '../ui'

export default function SettingsPage() {
  const { theme, themeName, setThemeName } = useTheme()
  const supabase = createClient()
  const router = useRouter()
  const s = styles(theme)

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={s.page}>
      <PageHeader t={theme} eyebrow="Preferences" title="Settings" />

      {/* Theme picker */}
      <div className="luma-card" style={s.card}>
        <CardLabel t={theme}>Appearance</CardLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          {Object.entries(themes).map(([key, t]) => {
            const active = themeName === key
            return (
              <div key={key} className="luma-card" onClick={() => setThemeName(key)} style={{
                background: `linear-gradient(165deg, ${t.c1}, ${t.bg})`,
                border: `1.5px solid ${active ? t.accent : t.border}`,
                borderRadius: 16, padding: 15, cursor: 'pointer',
                boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${t.accent} 18%, transparent), 0 16px 34px -24px rgba(0,0,0,0.8)` : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`, flexShrink: 0, boxShadow: `0 3px 8px -2px ${t.accent}` }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.green }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.blue }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.purple }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontFamily: serif, color: t.txt }}>{t.name}</span>
                  {active && <span style={{ color: t.accent, display: 'flex' }}><Icon name="check" size={15} stroke={2.2} /></span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Account */}
      <div className="luma-card" style={s.card}>
        <CardLabel t={theme}>Account</CardLabel>
        <button onClick={signOut} style={{
          width: '100%', background: 'transparent', border: `1px solid color-mix(in srgb, ${theme.red} 45%, ${theme.border})`,
          borderRadius: 12, padding: '12px 0', fontSize: 13.5, fontWeight: 600,
          color: theme.red, cursor: 'pointer', fontFamily: sans,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon name="arrowRight" size={16} />Sign Out
        </button>
      </div>

      <div style={{ ...s.label, color: theme.sub, textAlign: 'center', marginTop: 20, letterSpacing: '0.18em' }}>
        Luma · Personal Tracker
      </div>
    </div>
  )
}