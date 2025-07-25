# Spieler Collection Types - Neustrukturierung Plan

## ✅ Bereinigung abgeschlossen

Folgende Collection Types wurden erfolgreich entfernt:
- `spieler` 
- `spielerstatistik`
- `spieler-statistik` (leerer Ordner)
- `spieler-saison-statistik` (leerer Ordner) 
- `mitglied`

Relationen in `team` Collection Type wurden bereinigt.

## 🎯 Neue Struktur - Empfehlung

### 1. Player Collection Type (Vereinfacht)
```json
{
  "kind": "collectionType",
  "collectionName": "players",
  "info": {
    "singularName": "player",
    "pluralName": "players", 
    "displayName": "Spieler"
  },
  "attributes": {
    "vorname": { "type": "string", "required": true },
    "nachname": { "type": "string", "required": true },
    "rueckennummer": { "type": "integer", "min": 1, "max": 99 },
    "position": { 
      "type": "enumeration",
      "enum": ["Torwart", "Abwehr", "Mittelfeld", "Sturm"]
    },
    "team": {
      "type": "relation",
      "relation": "manyToOne", 
      "target": "api::team.team",
      "inversedBy": "players"
    },
    "foto": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images"]
    },
    "status": {
      "type": "enumeration", 
      "enum": ["aktiv", "verletzt", "gesperrt"],
      "default": "aktiv"
    }
  }
}
```

### 2. Player Statistics Collection Type (Optional)
```json
{
  "kind": "collectionType", 
  "collectionName": "player_statistics",
  "info": {
    "singularName": "player-statistic",
    "pluralName": "player-statistics",
    "displayName": "Spieler Statistik"
  },
  "attributes": {
    "player": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::player.player"
    },
    "saison": {
      "type": "relation", 
      "relation": "manyToOne",
      "target": "api::saison.saison"
    },
    "tore": { "type": "integer", "default": 0 },
    "spiele": { "type": "integer", "default": 0 },
    "assists": { "type": "integer", "default": 0 }
  }
}
```

## 🔄 Team Collection Type Update

Das Team Schema muss erweitert werden um die neue Player Relation:

```json
{
  "players": {
    "type": "relation",
    "relation": "oneToMany", 
    "target": "api::player.player",
    "mappedBy": "team"
  }
}
```

## 📊 Vorteile der neuen Struktur

1. **Einfacher**: Weniger Collection Types, klarere Struktur
2. **Flexibler**: Einfache Erweiterung möglich
3. **Performanter**: Weniger komplexe Relationen
4. **Wartbarer**: Übersichtlichere API-Struktur

## 🚀 Implementierung

### Schritt 1: Player Collection Type erstellen
```bash
# Im Strapi Admin Panel:
# Content-Type Builder > Create new collection type > "Player"
```

### Schritt 2: Team Schema erweitern
```bash
# Team Collection Type bearbeiten
# Neue Relation "players" hinzufügen
```

### Schritt 3: CSV Import vorbereiten
```bash
# CSV-Datei anpassen für neue Struktur
# Import-Skript erstellen
```

## 📝 Nächste Schritte

1. ✅ Bereinigung abgeschlossen
2. 🔄 Strapi Server neu starten
3. 🆕 Neue Collection Types über Admin Panel erstellen
4. 📊 CSV-Daten importieren
5. 🧪 Frontend-Komponenten anpassen

## 🎯 Ziel

Eine saubere, einfache Spieler-Struktur ohne Relationsprobleme, die leicht erweiterbar ist und performant funktioniert.