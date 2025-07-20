'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { IconSun, IconMoon } from '@tabler/icons-react'
import { motion } from 'framer-motion'

export default function DarkModeToggle() {
  // Safe theme usage with fallback
  let theme = 'light'
  let toggleTheme = () => {}
  let isDark = false

  try {
    const themeContext = useTheme()
    theme = themeContext.theme
    toggleTheme = themeContext.toggleTheme
    isDark = themeContext.isDark
  } catch (error) {
    console.warn('ThemeContext not available, using fallback values')
  }

  return (
    <motion.button
      onClick={toggleTheme}
      className={`
        flex items-center justify-center w-6 h-4 rounded-sm transition-all duration-300 ease-in-out
        ${isDark 
          ? 'bg-transparent text-viktoria-yellow' 
          : 'bg-transparent text-viktoria-blue'
        }
        hover:bg-white/10 focus:outline-none
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
    >
      {/* Single Icon with smooth transition */}
      <motion.div
        className="flex items-center justify-center"
        animate={{
          rotate: isDark ? 180 : 0,
        }}
        transition={{ 
          duration: 0.4,
          ease: "easeInOut"
        }}
      >
        {isDark ? (
          <IconSun size={14} className="text-viktoria-yellow drop-shadow-sm" style={{ filter: 'drop-shadow(0 0 4px rgba(254, 240, 138, 0.4))' }} />
        ) : (
          <IconMoon size={14} className="text-viktoria-blue drop-shadow-sm" style={{ filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.3))' }} />
        )}
      </motion.div>
    </motion.button>
  )
}