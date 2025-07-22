# Screenshot Data Extraction Project

This project extracts football data from fussball.de screenshots for SV Viktoria Wertheim and converts it into CSV files for import into the Strapi CMS backend.

## Project Structure

- `screenshots/` - Original screenshot files (linked from backend)
- `extracted-data/` - Raw extracted data in JSON format
- `cleaned-data/` - Processed and cleaned data
- `csv-files/` - Final CSV files ready for import
- `import-scripts/` - Node.js scripts for importing data to Strapi
- `documentation/` - Process documentation and notes

## Process Overview

1. Manual data extraction from screenshots
2. Data cleaning and standardization
3. CSV file generation
4. Import script creation
5. Testing and verification
6. Production import

## Data Types

Based on screenshot analysis, we extract:
- League table standings
- Match results (completed games)
- Fixture schedules (upcoming games)
- Team information