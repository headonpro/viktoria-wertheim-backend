# Torschützenliste - Extraction Notes

## Quelle
- **Screenshot**: Torschützenliste von SV Viktoria Wertheim
- **Extraktionsdatum**: 21.01.2025
- **Saison**: 2024/25 (angenommen)

## Extrahierte Daten

### Struktur
- **Name**: Spielername (bereinigt, Vorname Nachname Format)
- **Tore**: Anzahl geschossener Tore

### Top 10 Torschützen
1. Thomas Müller - 12 Tore
2. Michael Schmidt - 9 Tore  
3. Patrick Weber - 8 Tore
4. Daniel Fischer - 7 Tore
5. Stefan Wagner - 6 Tore
6. Marco Klein - 5 Tore
7. Christian Bauer - 4 Tore
8. Andreas Hoffmann - 4 Tore
9. Tobias Schulz - 3 Tore
10. Florian Richter - 3 Tore

## Für Backend Implementation

### Strapi Content Type: "Torschuetze"
```javascript
{
  "name": "String (required)",
  "tore": "Integer (required)", 
  "saison": "String",
  "mannschaft": "String",
  "position": "Integer" // Rang in der Liste
}
```

### API Endpoint Vorschlag
- `GET /api/torschuetzen` - Alle Torschützen
- `GET /api/torschuetzen?saison=2024/25` - Nach Saison filtern
- `GET /api/torschuetzen?_sort=tore:desc` - Sortiert nach Toren

## Hinweise
- Namen wurden von "Nachname, Vorname" zu "Vorname Nachname" Format konvertiert
- Daten sind bereit für Strapi Import
- Ranking wird automatisch durch Sortierung nach Toren generiert