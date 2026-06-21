'use client'

import { useTheme } from '../../ThemeContext'
import { themes } from '../../theme'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

const THEME_PREVIEWS: Record<string, { bg: string; accent: string }> = {
  midnight: { bg: '#1d1812', accent: '#e8a53a' },
  nord:     { bg: '#222839', accent: '#88c0d0' },
  sage:     { bg: '#141c18', accent: '#7ab885' },
  crimson:  { bg: '#1e1010', accent: '#e85a5a' },
  paper:    { bg: '#ede8de', accent: '#c4852a' },
  snow:     { bg: '#ffffff', accent: '#4a6cf0' },
}

export default function SettingsPage() {
  const { theme, themeName, setThemeName } = useTheme()
  const supabase = createClient()
  const router = useRouter()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.accent, marginBottom: 2 }}>Settings</h1>
      </div>

      {/* Theme picker */}
      <div style={{ background: theme.c1, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px', color: theme.sub, marginBottom: 14 }}>Theme</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {Object.entries(themes).map(([key, t]) => {
            const preview = THEME_PREVIEWS[key]
            const active = themeName === key
            return (
              <div key={key} onClick={() => setThemeName(key)} style={{
                background: preview.bg,
                border: `2px solid ${active ? preview.accent : theme.border}`,
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                transition: 'border-color .2s',
              }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: preview.accent, marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: preview.accent }}>{t.name}</div>
                {active && <div style={{ fontSize: 10, color: preview.accent, marginTop: 2, opacity: .7 }}>Active</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sign out */}
      <div style={{ background: theme.c1, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px', color: theme.sub, marginBottom: 14 }}>Account</div>
        <button onClick={signOut} style={{
          width: '100%', background: 'transparent', border: `1px solid ${theme.red}`,
          borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 600,
          color: theme.red, cursor: 'pointer',
        }}>
          Sign Out
        </button>
      </div>
    </div>
  )
}