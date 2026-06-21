'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '../ThemeContext'

const tabs = [
  { id: 'home',      icon: '🏠', label: 'Home',      path: '/dashboard/home'      },
  { id: 'nutrition', icon: '🥗', label: 'Nutrition',  path: '/dashboard/nutrition' },
  { id: 'finance',   icon: '💳', label: 'Finance',    path: '/dashboard/finance'   },
  { id: 'exercise',  icon: '🏃', label: 'Move',       path: '/dashboard/exercise'  },
  { id: 'meds',      icon: '💊', label: 'Meds',       path: '/dashboard/meds'      },
  { id: 'journal',   icon: '📓', label: 'Journal',    path: '/dashboard/journal'   },
  { id: 'settings',  icon: '☰',  label: 'Settings',   path: '/dashboard/settings'  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme } = useTheme()

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.txt, fontFamily: 'sans-serif' }}>
      <main style={{ paddingBottom: 80 }}>
        {children}
      </main>
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: theme.bg + 'f7',
        borderTop: `1px solid ${theme.border}`,
        display: 'flex', justifyContent: 'space-around',
        padding: '8px 0 14px',
        backdropFilter: 'blur(12px)',
      }}>
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.path)
          return (
            <div key={tab.id} onClick={() => router.push(tab.path)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, cursor: 'pointer', padding: '4px 12px', borderRadius: 10,
              background: active ? theme.accent + '22' : 'transparent',
            }}>
              <span style={{ fontSize: 22 }}>{tab.icon}</span>
              <span style={{ fontSize: 10, color: active ? theme.accent : theme.sub }}>{tab.label}</span>
            </div>
          )
        })}
      </nav>
    </div>
  )
}