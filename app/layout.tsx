import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from './ThemeContext'
import RegisterSW from './RegisterSW'

export const metadata: Metadata = {
  applicationName: 'Luma',
  title: { default: 'Luma', template: '%s · Luma' },
  description: 'Tend your days — food, money, movement, meds, and journal in one quiet place.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Luma',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#0f0e0c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0f0e0c' }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <RegisterSW />
      </body>
    </html>
  )
}
