import React from 'react'

// Mock für Next.js dynamic imports
const dynamic = (fn, options = {}) => {
  const Component = React.forwardRef((props, ref) => {
    // Versuche die Komponente zu laden
    try {
      const LoadedComponent = fn()
      if (LoadedComponent && LoadedComponent.default) {
        return React.createElement(LoadedComponent.default, { ...props, ref })
      }
      if (LoadedComponent) {
        return React.createElement(LoadedComponent, { ...props, ref })
      }
    } catch (error) {
      console.warn('Dynamic import mock failed:', error)
    }
    
    // Fallback: Render children oder leeres div
    if (props.children) {
      return React.createElement('div', { ...props, ref }, props.children)
    }
    return React.createElement('div', { ...props, ref })
  })
  
  Component.displayName = 'DynamicComponent'
  return Component
}

export default dynamic