# Viktoria Wertheim - Frontend

Das Frontend für die offizielle Website des Fußballvereins Viktoria Wertheim.

## 🚀 Technologien

- **Next.js 14** - React Framework mit App Router
- **TypeScript** - Typsicherheit
- **Tailwind CSS** - Utility-First CSS Framework
- **Framer Motion** - Animationen und Transitions
- **Lucide React** - Icons
- **Axios** - HTTP Client für API-Anfragen

## 📱 Features

- **Mobile-First Design** - Optimiert für mobile Geräte
- **Responsive Layout** - Funktioniert auf allen Bildschirmgrößen
- **Animationen** - Smooth Transitions mit Framer Motion
- **Accessibility** - WCAG-konforme Bedienbarkeit
- **SEO-optimiert** - Meta-Tags und strukturierte Daten
- **Performance** - Optimierte Bundle-Größe und Ladezeiten

## 🎨 Design System

### Farben
- **Viktoria Blue**: `#003366` - Primärfarbe
- **Viktoria Yellow**: `#FFD700` - Akzentfarbe
- **Viktoria Green**: `#00A86B` - Sekundärfarbe

### Komponenten
- `Header` - Navigation mit Burger-Menü
- `MobileNav` - Untere Navigation für Mobile
- `PageLayout` - Layout-Wrapper für alle Seiten

## 🏗️ Projektstruktur

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── news/
│   │   └── page.tsx
│   └── teams/
│       └── page.tsx
├── components/
│   ├── Header.tsx
│   ├── MobileNav.tsx
│   └── PageLayout.tsx
├── lib/
│   └── strapi.ts
└── types/
    └── strapi.ts
```

## 🔧 Installation

1. **Dependencies installieren**:
```bash
npm install
```

2. **Umgebungsvariablen einrichten**:
```bash
cp .env.local.example .env.local
```

Dann die Werte in `.env.local` anpassen:
```
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_API_TOKEN=your-api-token-here
```

3. **Entwicklungsserver starten**:
```bash
npm run dev
```

Die Anwendung ist dann unter `http://localhost:3000` erreichbar.

## 📄 Verfügbare Seiten

- **Home** (`/`) - Startseite mit Übersicht
- **News** (`/news`) - Nachrichten und Artikel
- **Teams** (`/teams`) - Mannschaften und Trainer
- **Fixtures** (`/fixtures`) - Spielplan und Ergebnisse (geplant)
- **Table** (`/table`) - Tabellenstände (geplant)

## 🔌 API Integration

Die Anwendung nutzt Strapi als Headless CMS für Content Management:

- **News-Artikel**: Dynamische Inhalte aus Strapi
- **Mannschaften**: Team-Informationen und Spieler
- **Spiele**: Spielplan und Ergebnisse
- **Kategorien**: Für News-Artikel

## 🎯 Nächste Schritte

1. **Fixtures-Seite** implementieren
2. **Tabellen-Seite** erstellen
3. **Detail-Seiten** für News und Teams
4. **Bilder-Galerie** hinzufügen
5. **Suchfunktion** implementieren

## 🚀 Deployment

Das Projekt ist für Vercel optimiert:

1. Repository mit Vercel verknüpfen
2. Umgebungsvariablen in Vercel setzen
3. Automatisches Deployment bei Git Push

## 🤝 Beitragen

1. Fork erstellen
2. Feature Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add some AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request erstellen

## 📄 Lizenz

Dieses Projekt ist Eigentum von Viktoria Wertheim e.V. 