'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { forwardRef } from 'react'

// Client-only Wrapper für Framer Motion
// Diese Komponente löst SSR-Probleme mit Next.js 14

interface MotionWrapperProps {
  children: React.ReactNode
  className?: string
  initial?: any
  animate?: any
  transition?: any
  whileHover?: any
  whileTap?: any
  as?: keyof React.JSX.IntrinsicElements
  [key: string]: any
}

const MotionWrapper = forwardRef<HTMLElement, MotionWrapperProps>(
  ({ children, as = 'div', ...props }, ref) => {
    const MotionComponent = motion[as as keyof typeof motion] as any
    return (
      <MotionComponent ref={ref} {...props}>
        {children}
      </MotionComponent>
    )
  }
)

MotionWrapper.displayName = 'MotionWrapper'

export default MotionWrapper 