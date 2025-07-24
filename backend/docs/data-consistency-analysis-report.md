# Data Consistency Analysis Report

**Generated:** 2025-07-23T05:53:18.355Z

## Summary

- **Total Schemas:** 14
- **Duplicate Groups:** 2
- **Broken Relations:** 0
- **Orphaned Directories:** 2
- **Inconsistent Mappings:** 4

## Duplicate Schema Issues

### Team/Mannschaft Duplication
**Reason:** Both represent team entities with similar attributes
**Affected Schemas:**
- api::team.team (C:\Users\cirak\Projekte\ViktoriaWertheim\backend\src\api\team\content-types\team\schema.json)
- api::mannschaft.mannschaft (C:\Users\cirak\Projekte\ViktoriaWertheim\backend\src\api\mannschaft\content-types\mannschaft\schema.json)

### Player Statistics Duplication
**Reason:** Multiple player statistics concepts detected
**Affected Schemas:**
- api::spielerstatistik.spielerstatistik (C:\Users\cirak\Projekte\ViktoriaWertheim\backend\src\api\spielerstatistik\content-types\spielerstatistik\schema.json)
**Potential Orphaned Directories:**
- spieler-statistik
- spieler-saison-statistik

## Recommendations

### Schema Consolidation (HIGH Priority)
**Issue:** Team/Mannschaft duplication
**Recommendation:** Consolidate team and mannschaft into a single content type. Migrate all relations and data to the chosen schema.
**Estimated Effort:** Medium

### Code Cleanup (MEDIUM Priority)
**Issue:** Orphaned directories
**Recommendation:** Remove orphaned directories or create proper schema files if they are needed.
**Estimated Effort:** Low
