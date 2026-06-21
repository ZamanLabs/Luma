'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { themes, type Theme } from './theme'

type ThemeContextType = {
  theme: Theme
  themeName: string
  setThemeName: (name: string) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: themes.midnight,
  themeName: 'midnight',
  setThemeName: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeNameState] = useState('midnight')

  useEffect(() => {
    const stored = localStorage.getItem('luma-theme')
    if (stored && themes[stored]) setThemeNameState(stored)
  }, [])

  const setThemeName = (name: string) => {
    setThemeNameState(name)
    localStorage.setItem('luma-theme', name)
  }

  return (
    <ThemeContext.Provider value={{ theme: themes[themeName], themeName, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)