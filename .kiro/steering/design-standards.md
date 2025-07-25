# Design Standards

## Card Components

### Card Title Styling Standard
Alle Card-Komponenten verwenden einheitliche Titel-Styling:

```tsx
<h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
  Titel
</h3>
```

**Eigenschaften:**
- **Schriftgröße**: `text-sm md:text-base` (14px mobile, 16px desktop)
- **Schriftgewicht**: `font-semibold`
- **Farbe Light Mode**: `text-gray-800` (#1f2937)
- **Farbe Dark Mode**: `text-gray-100` (#f3f4f6)
- **Transformation**: `uppercase`
- **Buchstabenabstand**: `tracking-wide`

**Farbdefinitionen:**
- **Light Mode Titel**: `text-gray-800` - Dunkles Grau für gute Lesbarkeit auf hellem Hintergrund
- **Dark Mode Titel**: `text-gray-100` - Helles Grau für gute Lesbarkeit auf dunklem Hintergrund

**Anwendung:**
- TeamStatus: "Mannschaften"
- LeagueTable: Liga-Namen
- TopScorers: "Torschützenkönig"
- GameCards: "Last" / "Next"
- NewsCarousel: "Neueste Nachrichten"
- SponsorShowcase: "Unsere Partner"

### Card Container Styling Standard
Alle Card-Komponenten verwenden reduzierte Glow-Effekte:

```tsx
className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0"
```

**Eigenschaften:**
- Subtile Schatten statt starke Glow-Effekte
- Konsistente Glasmorphism-Optik
- Mobile-first responsive Design

## Viktoria Wertheim Farbpalette

### Primärfarben
- **Viktoria Gelb**: `viktoria-yellow` (#FFD700) - Hauptakzentfarbe für aktive Zustände, Buttons und Highlights
- **Viktoria Blau**: `viktoria-blue` (#003366) - Primäre Markenfarbe
- **Viktoria Blau Hell**: `viktoria-blue-light` (#354992) - Sekundäre Blauvariation

### Button States (Team Status Card)
```tsx
// Aktiver Button (ausgewähltes Team)
className="bg-viktoria-yellow text-gray-800 shadow-sm shadow-viktoria-yellow/20"

// Inaktiver Button
className="bg-white/10 backdrop-blur-sm text-gray-700 dark:text-gray-200 hover:bg-white/15 hover:text-gray-600 dark:hover:text-white border border-white/20 hover:border-white/30 shadow-sm hover:shadow-md"
```

**Viktoria Gelb Verwendung:**
- Aktive Team-Auswahl Buttons
- Hervorhebungen und Akzente
- Call-to-Action Elemente
- Torschützenkönig Highlights
- News-Kategorie Badges