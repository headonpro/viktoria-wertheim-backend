# Plan: Designstandards für Vereinsinformationsseiten

## Analyseergebnis der aktuellen Vereinsseiten

### Geprüfte Seiten:
- `/ueber-uns` - Über uns
- `/vorstand` - Vorstandsteam  
- `/mitgliedschaft` - Mitgliedschaft
- `/impressum` - Impressum
- `/datenschutz` - Datenschutzerklärung
- `/agb` - Allgemeine Geschäftsbedingungen
- `/satzung` - Vereinssatzung
- `/sponsoren` - Sponsoren & Partner

## Aktuelle Probleme & Inkonsistenzen

### 1. Card Title Styling
**Problem:** Inkonsistente Titel-Styling zwischen den Seiten
- ❌ `ueber-uns`: Verwendet `text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide`
- ❌ `vorstand`: Verwendet `text-lg font-bold text-viktoria-blue dark:text-white`
- ❌ `impressum`: Verwendet `text-lg font-bold text-viktoria-blue dark:text-white`
- ❌ `datenschutz`: Verwendet `text-xl font-bold text-viktoria-blue dark:text-white`
- ❌ `agb`: Verwendet `text-xl md:text-2xl font-bold text-viktoria-blue dark:text-white`

**Soll-Standard:**
```tsx
<h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
  Titel
</h3>
```

### 2. Card Container Styling
**Problem:** Verschiedene Card-Container Implementierungen
- ✅ `ueber-uns`: Verwendet korrekten Standard mit reduziertem Glow
- ❌ `impressum/datenschutz/agb`: Verwenden vereinfachte Card-Styles ohne Glasmorphism
- ❌ `satzung`: Minimale Card-Implementation
- ❌ `sponsoren`: Korrekte Cards, aber inkonsistente Titel

**Soll-Standard:**
```tsx
className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0"
```

### 3. Viktoria Gelb Verwendung
**Problem:** Inkonsistente Verwendung der Viktoria-Farben
- ❌ `impressum/datenschutz/agb`: Verwenden `viktoria-blue` und `viktoria-yellow` für Titel/Icons
- ❌ Sollten Viktoria Gelb nur für aktive Zustände verwenden

**Soll-Standard:**
- Viktoria Gelb nur für: Aktive Buttons, Highlights, Call-to-Action
- Titel sollten `text-gray-800 dark:text-gray-100` verwenden

### 4. Mobile/Desktop Responsiveness
**Problem:** Uneinheitliche responsive Implementierung
- ❌ Verschiedene Breakpoint-Verwendung
- ❌ Inkonsistente Padding/Margin-Werte

## Umsetzungsplan

### Phase 1: Card Title Standardisierung
**Dateien zu bearbeiten:**
- `frontend/src/app/vorstand/page.tsx`
- `frontend/src/app/impressum/page.tsx`
- `frontend/src/app/datenschutz/page.tsx`
- `frontend/src/app/agb/page.tsx`
- `frontend/src/app/satzung/page.tsx`
- `frontend/src/app/sponsoren/page.tsx`

**Änderungen:**
1. Alle Sektions-Titel auf Standard-Format umstellen
2. Haupttitel (h1) beibehalten, aber Sektions-Titel (h2/h3) standardisieren

### Phase 2: Card Container Standardisierung
**Dateien zu bearbeiten:**
- `frontend/src/app/impressum/page.tsx`
- `frontend/src/app/datenschutz/page.tsx`
- `frontend/src/app/agb/page.tsx`
- `frontend/src/app/satzung/page.tsx`

**Änderungen:**
1. Vollständige Glasmorphism-Cards implementieren
2. Hover-Effekte hinzufügen
3. Konsistente Schatten und Backdrop-Blur

### Phase 3: Farbschema Korrektur
**Dateien zu bearbeiten:**
- `frontend/src/app/impressum/page.tsx`
- `frontend/src/app/datenschutz/page.tsx`
- `frontend/src/app/agb/page.tsx`

**Änderungen:**
1. Viktoria-Farben nur für spezielle Akzente verwenden
2. Standard-Grautöne für Titel und Text
3. Icons in Standard-Grau statt Viktoria-Gelb

### Phase 4: Responsive Design Vereinheitlichung
**Alle Dateien:**

**Änderungen:**
1. Konsistente Container-Größen: `max-w-4xl lg:max-w-5xl lg:mx-auto`
2. Einheitliche Spacing: `space-y-6 md:space-y-8`
3. Standardisierte Padding: `px-4 md:px-6 lg:px-0`

### Phase 5: Dark Mode Optimierung
**Alle Dateien:**

**Änderungen:**
1. Konsistente Dark Mode Farben
2. Optimierte Kontraste für Lesbarkeit
3. Einheitliche Hover-States

## Spezifische Implementierungsdetails

### Standard Card Component Pattern:
```tsx
<AnimatedSection delay={0.X}>
  <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0">
    <div className="px-8 md:px-12 py-6 md:py-8 text-center">
      <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
        Sektion Titel
      </h3>
    </div>
    <div className="p-6 relative z-10">
      {/* Content */}
    </div>
  </div>
</AnimatedSection>
```

### Standard Layout Pattern:
```tsx
<PageLayout>
  <div className="px-4 md:px-6 lg:px-0">
    <div className="container max-w-4xl lg:max-w-5xl lg:mx-auto space-y-6 md:space-y-8">
      {/* Content */}
    </div>
  </div>
</PageLayout>
```

## Priorität der Umsetzung

### Hoch (Sofort):
1. `impressum/page.tsx` - Rechtlich wichtige Seite
2. `datenschutz/page.tsx` - Rechtlich wichtige Seite
3. `agb/page.tsx` - Rechtlich wichtige Seite

### Mittel (Diese Woche):
4. `vorstand/page.tsx` - Wichtige Vereinsseite
5. `sponsoren/page.tsx` - Wichtige Partnerseite

### Niedrig (Nächste Woche):
6. `satzung/page.tsx` - Weniger frequentiert

## Testing-Checkliste

### Mobile (375px - 768px):
- [ ] Card-Titel lesbar und korrekt skaliert
- [ ] Glasmorphism-Effekte funktionieren
- [ ] Touch-freundliche Abstände
- [ ] Dark Mode korrekt

### Desktop (768px+):
- [ ] Card-Layout optimal genutzt
- [ ] Hover-Effekte funktionieren
- [ ] Typografie skaliert korrekt
- [ ] Dark Mode korrekt

### Cross-Browser:
- [ ] Chrome/Edge (Webkit)
- [ ] Firefox (Gecko)
- [ ] Safari (Mobile)

## Erfolgsmessung

### Vorher/Nachher Vergleich:
1. Screenshots aller Seiten (Mobile + Desktop, Light + Dark)
2. Konsistenz-Score (1-10) für jede Seite
3. Accessibility-Score (Lighthouse)
4. Performance-Impact Messung

### Zielwerte:
- 100% Konsistenz bei Card-Titeln
- 100% Konsistenz bei Card-Containern  
- 100% korrekte Farbverwendung
- 100% responsive Funktionalität
- Lighthouse Accessibility Score > 95