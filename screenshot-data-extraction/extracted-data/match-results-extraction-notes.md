# Match Results Data Extraction Notes

## Extraction Status: MANUAL REVIEW REQUIRED

This document tracks the manual extraction of completed match results from the fussball.de screenshots.

## Screenshots to Examine for Match Results

1. **screencapture-fussball-de-mannschaft-sv-viktoria-wertheim-sv-vikt-wertheim-2000-baden-saison-2526-team-id-011MIE0UN0000000VTVG0001VTR8C1K7-2025-07-21-01_28_06.png**
   - **Status**: Not examined
   - **Expected Content**: Team page may show recent results
   - **Match Results Found**: TBD

2. **Screenshot 2025-07-21 013007.png**
   - **Status**: Not examined
   - **Expected Content**: Unknown - may contain match results
   - **Match Results Found**: TBD

3. **Screenshot 2025-07-21 013016.png**
   - **Status**: Not examined
   - **Expected Content**: Unknown - may contain match results
   - **Match Results Found**: TBD

4. **Screenshot 2025-07-21 013022.png**
   - **Status**: Not examined
   - **Expected Content**: Unknown - may contain match results
   - **Match Results Found**: TBD

5. **Screenshot 2025-07-21 013044.png**
   - **Status**: Not examined
   - **Expected Content**: Unknown - may contain match results
   - **Match Results Found**: TBD

6. **Screenshot 2025-07-21 013105.png**
   - **Status**: Not examined
   - **Expected Content**: Unknown - may contain match results
   - **Match Results Found**: TBD

7. **Screenshot 2025-07-21 013211.png**
   - **Status**: Not examined
   - **Expected Content**: Unknown - may contain match results
   - **Match Results Found**: TBD

## Manual Extraction Process for Match Results

### Step 1: Identify Match Results Sections
For each screenshot:
1. Look for sections labeled "Ergebnisse", "Spiele", "Resultate", or similar
2. Find tables or lists showing completed matches
3. Identify matches involving SV Viktoria Wertheim
4. Note if results are from current season (2025/26) or previous seasons

### Step 2: Extract Match Data
For each completed match found:
1. **Date**: Extract match date (format may vary - convert to YYYY-MM-DD)
2. **Teams**: Extract home and away team names (exact spelling)
3. **Score**: Extract final score (home goals - away goals)
4. **League**: Note which league/competition
5. **Match Day**: Extract round/match day number if visible
6. **Status**: Should be "beendet" (finished) for completed matches
7. **Additional Info**: Note any extra details (venue, time, etc.)

### Step 3: Data Validation
1. Verify scores are reasonable (typically 0-10 goals per team)
2. Check that dates are in the past (completed matches)
3. Ensure team names match those in league table
4. Confirm league assignments are consistent
5. Validate that SV Viktoria Wertheim is involved in each match

## Data Quality Checklist

- [ ] All screenshots examined for match results
- [ ] Completed matches identified and extracted
- [ ] Match dates converted to YYYY-MM-DD format
- [ ] Team names standardized and consistent
- [ ] Final scores extracted accurately
- [ ] League/competition information captured
- [ ] Match status confirmed as "beendet"
- [ ] Incomplete or unclear data documented

## Expected Data Structure

Each match result should include:
```json
{
  "match_id": "unique_identifier",
  "date": "YYYY-MM-DD",
  "home_team": "Team Name",
  "away_team": "Team Name", 
  "home_score": 2,
  "away_score": 1,
  "league": "Kreisliga A Würzburg",
  "match_day": 5,
  "season": "2025/26",
  "status": "beendet",
  "venue": "Sportplatz Name (if available)",
  "notes": "Any additional information"
}
```

## Extraction Results Summary

### Total Matches Found
- **Completed Matches**: [TO BE COUNTED]
- **SV Viktoria Wertheim Home Games**: [TO BE COUNTED]
- **SV Viktoria Wertheim Away Games**: [TO BE COUNTED]

### Season Coverage
- **Earliest Match Date**: [TO BE EXTRACTED]
- **Latest Match Date**: [TO BE EXTRACTED]
- **Season**: 2025/26

### League Information
- **Primary League**: [TO BE EXTRACTED]
- **Cup/Tournament Matches**: [TO BE EXTRACTED]

## Data Quality Issues

### Issues Found During Extraction
- [TO BE DOCUMENTED]

### Missing Information
- [TO BE DOCUMENTED]

### Unclear or Ambiguous Data
- [TO BE DOCUMENTED]

### Assumptions Made
- [TO BE DOCUMENTED]

## Special Considerations

### Date Format Variations
- German date formats (DD.MM.YYYY)
- Abbreviated dates (DD.MM.)
- Relative dates ("letzten Samstag")

### Team Name Variations
- Full official names vs. abbreviations
- Different spellings or formatting
- Home/away designation indicators

### Score Presentation
- Standard format (2:1, 3-0, etc.)
- Penalty shootout results
- Abandoned or postponed matches

## Next Steps

1. **IMMEDIATE**: Manually examine all screenshots for match results
2. **THEN**: Update match-results-raw.json with extracted data
3. **VALIDATE**: Cross-check results with league table statistics
4. **DOCUMENT**: Complete this file with all findings and issues

## Notes for CSV Conversion

When converting to CSV for Strapi import:
- Convert team names to IDs (will need team lookup)
- Ensure date format is YYYY-MM-DD
- Set status to "beendet" for all completed matches
- Map league names consistently
- Handle missing venue information appropriately