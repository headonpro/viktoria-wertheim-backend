'use client'

import { motion } from 'framer-motion'

interface AnimatedSectionProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export default function AnimatedSection({ 
  children, 
  className = "", 
  delay = 0 
}: AnimatedSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

export function AnimatedDiv({ 
  children, 
  className = "", 
  delay = 0,
  direction = 'up' 
}: AnimatedSectionProps & { direction?: 'up' | 'left' | 'right' }) {
  const getInitial = () => {
    switch (direction) {
      case 'left': return { opacity: 0, x: -20 }
      case 'right': return { opacity: 0, x: 20 }
      default: return { opacity: 0, y: 20 }
    }
  }

  const getAnimate = () => {
    switch (direction) {
      case 'left': 
      case 'right': return { opacity: 1, x: 0 }
      default: return { opacity: 1, y: 0 }
    }
  }

  return (
    <motion.div
      initial={getInitial()}
      animate={getAnimate()}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
      className={className}
    >
      {children}
    </motion.div>
  )
} 