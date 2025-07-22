# League Table Data Extraction Notes

## Extraction Status: MANUAL REVIEW REQUIRED

This document tracks the manual extraction of league table data from the fussball.de screenshots.

## Screenshots to Examine

1. **screencapture-fussball-de-mannschaft-sv-viktoria-wertheim-sv-vikt-wertheim-2000-baden-saison-2526-team-id-011MIE0UN0000000VTVG0001VTR8C1K7-2025-07-21-01_28_06.png**
   - **Status**: Not examined
   - **Expected Content**: Team overview page, may contain league position
   - **Data Found**: TBD

2. **Screenshot 2025-07-21 013007.png**
   - **Status**: Not examined
   - **Expected Content**: Unknown
   - **Data Found**: TBD

3. **Screenshot 2025-07-21 013016.png**
   - **Status**: Not examined
   - **Expected Content**: Unknown
   - **Data Found**: TBD

4. **Screenshot 2025-07-21 013022.png**
   - **Status**: Not examined
   - **Expected Content**: Unknown
   - **Data Found**: TBD

5. **Screenshot 2025-07-21 013044.png**
   - **Status**: Not examined
   - **Expected Content**: Unknown
   - **Data Found**: TBD

6. **Screenshot 2025-07-21 013105.png**
   - **Status**: Not examined
   - **Expected Content**: Unknown
   - **Data Found**: TBD

7. **Screenshot 2025-07-21 013211.png**
   - **Status**: Not examined
   - **Expected Content**: Unknown
   - **Data Found**: TBD

## Manual Extraction Process

### Step 1: Screenshot Examination
For each screenshot:
1. Open the image file
2. Look for league table/standings sections
3. Identify if it shows SV Viktoria Wertheim's league
4. Note the league name and division
5. Check if full table is visible or partially cropped

### Step 2: Data Extraction
For each league table found:
1. Extract league name (e.g., "Kreisliga A Würzburg")
2. Extract season (should be 2025/26)
3. For each team in the table, extract:
   - Position (1, 2, 3, etc.)
   - Team name (exact spelling)
   - Matches played
   - Wins
   - Draws
   - Losses
   - Goals for
   - Goals against
   - Goal difference
   - Points

### Step 3: Data Validation
1. Check that points calculation matches wins/draws (3 points per win, 1 per draw)
2. Verify goal difference = goals for - goals against
3. Ensure team positions are sequential
4. Cross-check data across multiple screenshots if available

## Data Quality Checklist

- [ ] All screenshots examined for league table content
- [ ] League name identified and verified
- [ ] Season confirmed as 2025/26
- [ ] SV Viktoria Wertheim position identified
- [ ] All team statistics extracted accurately
- [ ] Mathematical consistency verified (points, goal difference)
- [ ] Team names standardized for database import
- [ ] Missing or unclear data documented

## Extraction Results

### League Information
- **League Name**: [TO BE EXTRACTED]
- **Season**: 2025/26
- **Division Level**: [TO BE EXTRACTED]
- **Number of Teams**: [TO BE EXTRACTED]

### SV Viktoria Wertheim Data
- **Current Position**: [TO BE EXTRACTED]
- **Points**: [TO BE EXTRACTED]
- **Matches Played**: [TO BE EXTRACTED]
- **Goals For**: [TO BE EXTRACTED]
- **Goals Against**: [TO BE EXTRACTED]

### Full League Table
[TO BE POPULATED AFTER MANUAL EXTRACTION]

## Issues and Notes

### Data Quality Issues Found
- [TO BE DOCUMENTED]

### Missing Information
- [TO BE DOCUMENTED]

### Assumptions Made
- [TO BE DOCUMENTED]

### Unclear Data Points
- [TO BE DOCUMENTED]

## Next Steps

1. **IMMEDIATE**: Manually examine all screenshots
2. **THEN**: Update league-table-raw.json with actual extracted data
3. **FINALLY**: Complete this documentation with findings

## Contact for Questions
- Refer to original screenshots in viktoria-wertheim-backend/public/screenshots/
- Cross-reference with fussball.de website if needed for verification