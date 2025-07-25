# Design Document

## Overview

Dieses Design implementiert die einheitlichen Designstandards der Viktoria Wertheim Website auf den Seiten News, Teams, Shop und Kontakt. Das Design basiert auf der erfolgreichen Implementierung der Startseite und stellt sicher, dass alle Seiten eine konsistente visuelle Identität haben.

## Architecture

### Design System Hierarchie

```
Design Standards
├── Card Components
│   ├── Title Styling
│   └── Container Styling
├── Color Palette
│   ├── Primary Colors
│   └── Theme Variants
└── Responsive Breakpoints
    ├── Mobile (< 768px)
    └── Desktop (≥ 768px)
```

### Seiten-spezifische Anpassungen

1. **News Page**: Artikel-Cards, Kategorie-Filter, Modal-Komponenten
2. **Teams Page**: Team-Cards, Informations-Grids
3. **Shop Page**: Produkt-Kategorien, Coming-Soon Banner
4. **Kontakt Page**: Kontakt-Cards, Formular-Komponenten, Ansprechpartner-Cards

## Components and Interfaces

### Card Title Component Standard

```tsx
interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

const CardTitle: React.FC<CardTitleProps> = ({ children, className = "" }) => (
  <h3 className={`text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide ${className}`}>
    {children}
  </h3>
)
```

### Card Container Component Standard

```tsx
interface CardContainerProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

const CardContainer: React.FC<CardContainerProps> = ({ children, className = "", onClick }) => (
  <div 
    className={`relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
)
```

### Color System

```scss
// Primary Colors
$viktoria-yellow: #FFD700;
$viktoria-blue: #003366;
$viktoria-blue-light: #354992;

// Theme-specific Text Colors
$text-light-primary: #1f2937; // text-gray-800
$text-light-secondary: #374151; // text-gray-700
$text-dark-primary: #f3f4f6; // text-gray-100
$text-dark-secondary: #d1d5db; // text-gray-300
```

## Data Models

### Page-specific Styling Configurations

```typescript
interface PageStyleConfig {
  pageName: 'news' | 'teams' | 'shop' | 'kontakt'
  cardComponents: CardComponentConfig[]
  colorOverrides?: ColorOverride[]
  responsiveBreakpoints: ResponsiveConfig
}

interface CardComponentConfig {
  selector: string
  titleStyling: boolean
  containerStyling: boolean
  customClasses?: string[]
}

interface ColorOverride {
  component: string
  property: string
  lightMode: string
  darkMode: string
}

interface ResponsiveConfig {
  mobile: {
    padding: string
    fontSize: string
    borderRadius: string
  }
  desktop: {
    padding: string
    fontSize: string
    borderRadius: string
  }
}
```

## Error Handling

### Theme Switching Errors

```typescript
const handleThemeError = (error: Error) => {
  console.warn('Theme switching error:', error)
  // Fallback to light mode
  document.documentElement.classList.add('light')
}
```

### Responsive Layout Errors

```typescript
const handleResponsiveError = (breakpoint: string, error: Error) => {
  console.warn(`Responsive error at ${breakpoint}:`, error)
  // Apply mobile-first fallback
  return 'mobile'
}
```

### Component Rendering Errors

```typescript
const ComponentErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<div className="bg-gray-100/40 dark:bg-white/[0.04] p-4 rounded-xl">
        <p className="text-gray-600 dark:text-gray-300">Komponente konnte nicht geladen werden</p>
      </div>}
    >
      {children}
    </ErrorBoundary>
  )
}
```

## Testing Strategy

### Visual Regression Testing

1. **Screenshot Tests**: Automatische Screenshots aller vier Seiten in Light/Dark Mode
2. **Cross-browser Testing**: Chrome, Firefox, Safari, Edge
3. **Responsive Testing**: Mobile (375px), Tablet (768px), Desktop (1024px, 1440px)

### Component Testing

```typescript
describe('Design Standards Implementation', () => {
  test('Card titles use correct styling', () => {
    render(<CardTitle>Test Title</CardTitle>)
    const title = screen.getByText('Test Title')
    expect(title).toHaveClass('text-sm', 'md:text-base', 'font-semibold', 'uppercase', 'tracking-wide')
  })

  test('Card containers use glassmorphism styling', () => {
    render(<CardContainer>Test Content</CardContainer>)
    const container = screen.getByText('Test Content').parentElement
    expect(container).toHaveClass('bg-gray-100/11', 'dark:bg-white/[0.012]', 'backdrop-blur-xl')
  })

  test('Colors work in both themes', () => {
    const { rerender } = render(<div className="text-gray-800 dark:text-gray-100">Test</div>)
    
    // Light mode
    document.documentElement.classList.add('light')
    expect(screen.getByText('Test')).toHaveClass('text-gray-800')
    
    // Dark mode
    document.documentElement.classList.remove('light')
    document.documentElement.classList.add('dark')
    rerender(<div className="text-gray-800 dark:text-gray-100">Test</div>)
    expect(screen.getByText('Test')).toHaveClass('dark:text-gray-100')
  })
})
```

### Accessibility Testing

1. **Color Contrast**: Mindestens WCAG AA Standard (4.5:1)
2. **Keyboard Navigation**: Alle interaktiven Elemente erreichbar
3. **Screen Reader**: Semantische HTML-Struktur
4. **Focus Management**: Sichtbare Focus-Indikatoren

### Performance Testing

1. **Bundle Size**: Keine signifikante Vergrößerung durch Style-Änderungen
2. **Render Performance**: Smooth Animationen bei 60fps
3. **Memory Usage**: Keine Memory Leaks bei Theme-Switches

## Implementation Phases

### Phase 1: News Page
- Artikel-Cards standardisieren
- Kategorie-Filter anpassen
- Modal-Komponenten aktualisieren

### Phase 2: Teams Page
- Team-Cards vereinheitlichen
- Informations-Grids anpassen
- Hover-Effekte standardisieren

### Phase 3: Shop Page
- Coming-Soon Banner anpassen
- Produkt-Kategorie Cards standardisieren
- Newsletter-Signup Form aktualisieren

### Phase 4: Kontakt Page
- Kontakt-Form Steps standardisieren
- Ansprechpartner-Cards anpassen
- Quick-Action Buttons vereinheitlichen

## Quality Assurance

### Code Review Checklist

- [ ] Alle Card-Titel verwenden Standard-Styling
- [ ] Alle Card-Container verwenden Glassmorphism-Design
- [ ] Viktoria-Farben korrekt implementiert
- [ ] Light/Dark Mode funktioniert
- [ ] Mobile/Desktop responsive
- [ ] Keine Funktionalitäts-Regressionen
- [ ] Performance nicht beeinträchtigt
- [ ] Accessibility Standards erfüllt

### Browser Compatibility Matrix

| Browser | Version | Light Mode | Dark Mode | Mobile | Desktop |
|---------|---------|------------|-----------|---------|---------|
| Chrome  | 90+     | ✅         | ✅        | ✅      | ✅      |
| Firefox | 88+     | ✅         | ✅        | ✅      | ✅      |
| Safari  | 14+     | ✅         | ✅        | ✅      | ✅      |
| Edge    | 90+     | ✅         | ✅        | ✅      | ✅      |