import type { Metadata } from 'next'
import { ThemeProvider } from './ThemeContext'

export const metadata: Metadata = {
  title: 'Luma',
  description: 'Your personal tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0f0e0c' }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}