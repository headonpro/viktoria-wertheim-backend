'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('viktoria-theme') as Theme
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setTheme(savedTheme)
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error)
      // Fallback to light theme
      setTheme('light')
    }
    setMounted(true)
  }, [])

  // Apply theme to document root and save to localStorage
  useEffect(() => {
    if (!mounted) return

    try {
      // Apply theme class to document root
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(theme)

      // Save theme preference to localStorage
      localStorage.setItem('viktoria-theme', theme)
    } catch (error) {
      console.warn('Failed to apply theme or save to localStorage:', error)
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  const isDark = theme === 'dark'

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}