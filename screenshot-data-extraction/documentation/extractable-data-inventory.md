# Extractable Data Inventory

## Overview
This document catalogs all data that can be extracted from the fussball.de screenshots for SV Viktoria Wertheim.

## Data Categories

### 1. Team/Mannschaft Data
**Source Screenshots**: TBD after manual examination
**Extractable Fields**:
- Team name (standardized)
- League assignment
- Current season
- League position (if in table)
- Points total
- Matches played
- Wins, draws, losses
- Goals for/against
- Goal difference
- Team status (active/inactive)

**Data Quality Notes**:
- Team names may need standardization
- Some statistics may be incomplete
- League assignments need verification

### 2. Match Results (Completed Games)
**Source Screenshots**: TBD after manual examination
**Extractable Fields**:
- Match date
- Home team name
- Away team name
- Home team score
- Away team score
- League/competition
- Match day/round
- Season
- Match status (completed)

**Data Quality Notes**:
- Date formats may vary
- Team names need standardization
- Some scores may be unclear

### 3. Fixtures (Upcoming Matches)
**Source Screenshots**: TBD after manual examination
**Extractable Fields**:
- Scheduled date
- Home team name
- Away team name
- League/competition
- Match day/round
- Season
- Match status (planned)
- Venue (if available)

**Data Quality Notes**:
- Future dates may be estimates
- Some fixtures may be tentative
- Venue information may be limited

### 4. League Table Data
**Source Screenshots**: TBD after manual examination
**Extractable Fields**:
- League name
- Season
- Team positions (1-N)
- All team statistics per position
- Last updated date (if available)

**Data Quality Notes**:
- Table may be partial/cropped
- Some teams may be cut off
- Statistics need validation

## Data Mapping to Strapi Schema

### Mannschaft Content Type
```
name -> Team name (standardized)
liga -> League assignment
tabellenplatz -> League position
punkte -> Points total
spiele_gesamt -> Matches played
siege -> Wins
unentschieden -> Draws
niederlagen -> Losses
tore_fuer -> Goals for
tore_gegen -> Goals against
tordifferenz -> Goal difference
saison -> Season (2025/26)
status -> 'aktiv'
```

### Spiel Content Type
```
datum -> Match date (YYYY-MM-DD)
heimmannschaft -> Home team (relationship)
auswaertsmannschaft -> Away team (relationship)
tore_heim -> Home team score
tore_auswaerts -> Away team score
liga -> League name
spieltag -> Match day/round
saison -> Season (2025/26)
status -> 'beendet' or 'geplant'
```

## Extraction Challenges

### Expected Issues
1. **Image Quality**: Screenshots may have compression artifacts
2. **Partial Data**: Tables/lists may be cropped or scrolled
3. **Text Recognition**: Manual reading may introduce errors
4. **Inconsistent Formats**: Different pages may show data differently
5. **Missing Information**: Some fields may not be visible

### Mitigation Strategies
1. **Double-check**: Verify each data point against screenshot
2. **Cross-reference**: Use multiple screenshots to verify data
3. **Document Assumptions**: Note any unclear or estimated data
4. **Validation Rules**: Apply business logic checks
5. **Fallback Values**: Use defaults for missing optional data

## Quality Assurance Checklist

- [ ] All screenshots examined and cataloged
- [ ] Data types identified for each screenshot
- [ ] Team names standardized and mapped
- [ ] Date formats validated and converted
- [ ] Numerical data checked for reasonableness
- [ ] Missing data documented
- [ ] Extraction assumptions documented
- [ ] Data ready for CSV conversion

## Notes
- This inventory will be updated after manual screenshot examination
- Actual extractable data may differ from expectations
- Some screenshots may contain duplicate or overlapping information
- Priority should be given to league table and recent match data