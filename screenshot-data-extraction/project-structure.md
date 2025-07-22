# Screenshot Data Extraction - Project Structure

## Directory Structure

```
screenshot-data-extraction/
├── README.md                           # Project overview and instructions
├── project-structure.md               # This file - project organization
├── extracted-data/                    # Raw extracted data from screenshots
│   ├── league-tables.json             # Raw league table data
│   ├── match-results.json             # Raw completed match data
│   ├── fixtures.json                  # Raw upcoming match data
│   └── team-info.json                 # Raw team information
├── cleaned-data/                      # Processed and standardized data
│   ├── cleaned-league-tables.json     # Standardized league data
│   ├── cleaned-matches.json           # Standardized match data
│   ├── cleaned-fixtures.json          # Standardized fixture data
│   └── team-name-mappings.json        # Team name standardization map
├── csv-files/                         # Final CSV files for Strapi import
│   ├── mannschaften.csv               # Team data for mannschaft content type
│   ├── spiele.csv                     # Match data for spiel content type
│   └── fixtures.csv                   # Fixture data for spiel content type
├── import-scripts/                    # Node.js scripts for data import
│   ├── import-mannschaften.js         # Script to import team data
│   ├── import-spiele.js               # Script to import match/fixture data
│   ├── utils.js                       # Utility functions for imports
│   └── package.json                   # Dependencies for import scripts
└── documentation/                     # Process documentation
    ├── screenshot-inventory.md         # Catalog of all screenshots
    ├── extractable-data-inventory.md   # Detailed data extraction plan
    ├── extraction-notes.md             # Notes from manual extraction process
    ├── team-name-mappings.md           # Team name standardization decisions
    └── import-log.md                   # Import process results and issues
```

## File Purposes

### Raw Data Files (extracted-data/)
- **league-tables.json**: Direct extraction from league table screenshots
- **match-results.json**: Direct extraction from completed match screenshots  
- **fixtures.json**: Direct extraction from fixture/schedule screenshots
- **team-info.json**: Direct extraction from team detail screenshots

### Processed Data Files (cleaned-data/)
- **cleaned-*.json**: Standardized versions of raw data with consistent formatting
- **team-name-mappings.json**: Mapping between screenshot names and standardized names

### Import Ready Files (csv-files/)
- **mannschaften.csv**: Team data formatted for Strapi mannschaft content type
- **spiele.csv**: Match data formatted for Strapi spiel content type
- **fixtures.csv**: Future match data formatted for Strapi spiel content type

### Scripts (import-scripts/)
- **import-mannschaften.js**: Imports team data via Strapi API
- **import-spiele.js**: Imports match/fixture data via Strapi API
- **utils.js**: Common functions for CSV parsing, API calls, error handling
- **package.json**: Node.js dependencies (csv-parser, axios, etc.)

### Documentation (documentation/)
- **screenshot-inventory.md**: Catalog and analysis of all screenshot files
- **extractable-data-inventory.md**: Detailed plan for what data to extract
- **extraction-notes.md**: Notes and decisions made during manual extraction
- **team-name-mappings.md**: Documentation of team name standardization
- **import-log.md**: Results and issues from import process

## Workflow

1. **Analysis Phase**: Document screenshots and plan extraction
2. **Extraction Phase**: Manually extract data into JSON files
3. **Cleaning Phase**: Standardize and validate extracted data
4. **CSV Generation**: Convert cleaned data to Strapi-compatible CSV
5. **Import Phase**: Create and run import scripts
6. **Verification Phase**: Test and validate imported data

## Data Flow

```
Screenshots → Raw JSON → Cleaned JSON → CSV Files → Strapi Database
```

## Notes

- Screenshots are referenced from `viktoria-wertheim-backend/public/screenshots/`
- All data processing is manual to ensure accuracy
- Import scripts include error handling and validation
- Documentation tracks all decisions and assumptions made
- Project is designed for one-time use but documented for future reference