import React from 'react'

// Mock für AnimatedSection
export const AnimatedSection = ({ children, className, delay, ...props }) => {
  return React.createElement('section', { className, ...props }, children)
}

export const AnimatedDiv = ({ children, className, delay, ...props }) => {
  return React.createElement('div', { className, ...props }, children)
}

export default AnimatedSection