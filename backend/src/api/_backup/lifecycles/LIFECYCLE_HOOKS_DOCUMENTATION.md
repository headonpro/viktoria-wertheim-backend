# Lifecycle Hooks Documentation - Backup Created on 2025-01-26

## Overview

This backup contains all existing Strapi lifecycle hooks from the Viktoria Wertheim backend system before the refactoring process. The hooks were causing stability issues, performance problems, and blocking CRUD operations through complex validations and circular dependencies.

## Backup Contents

### Files Backed Up

1. **kategorie-lifecycles.ts** - Category content type lifecycle hooks
2. **news-artikel-lifecycles.ts** - News article content type lifecycle hooks  
3. **saison-lifecycles.ts** - Season content type lifecycle hooks
4. **sponsor-lifecycles.ts** - Sponsor content type lifecycle hooks
5. **tabellen-eintrag-lifecycles.ts** - Table entry content type lifecycle hooks
6. **team-lifecycles.ts** - Team content type lifecycle hooks
7. **veranstaltung-lifecycles.ts** - Event content type lifecycle hooks

## Current Hook Behavior Analysis

### 1. Kategorie (Category) Hooks
- **File**: `kategorie-lifecycles.ts`
- **Complexity**: Minimal
- **Issues**: None identified
- **Dependencies**: None
- **Hooks Implemented**: `afterCreate`
- **Behavior**: Empty placeholder for future category creation logic

### 2. News-Artikel (News Article) Hooks
- **File**: `news-artikel-lifecycles.ts`
- **Complexity**: Low
- **Issues**: None identified
- **Dependencies**: None
- **Hooks Implemented**: `beforeCreate`, `beforeUpdate`, `afterCreate`, `afterUpdate`
- **Behavior**: 
  - Sets publication date to current time if not provided
  - Basic validation (currently empty)
  - Logs article creation and updates

### 3. Saison (Season) Hooks
- **File**: `saison-lifecycles.ts`
- **Complexity**: High
- **Issues**: Multiple critical issues identified
- **Dependencies**: Teams, Leagues, complex date validation
- **Hooks Implemented**: `beforeCreate`, `beforeUpdate`, `beforeDelete`, `afterCreate`, `afterUpdate`, `afterDelete`
- **Critical Issues**:
  - Complex season overlap validation (currently disabled due to blocking issues)
  - Single active season constraint enforcement with automatic deactivation
  - Dependency validation for deletion that can block operations
  - Date range validation that can fail unexpectedly
- **Behavior**:
  - Validates season date ranges for logical consistency
  - Enforces single active season constraint by auto-deactivating others
  - Prevents deletion of active seasons
  - Checks for dependent teams and leagues before deletion
  - Comprehensive logging of all operations

### 4. Sponsor Hooks
- **File**: `sponsor-lifecycles.ts`
- **Complexity**: Minimal
- **Issues**: None identified
- **Dependencies**: None
- **Hooks Implemented**: `beforeCreate`
- **Behavior**: Sets default ordering based on sponsor category

### 5. Tabellen-Eintrag (Table Entry) Hooks
- **File**: `tabellen-eintrag-lifecycles.ts`
- **Complexity**: Medium-High
- **Issues**: Performance and validation issues
- **Dependencies**: Table calculation service, complex field calculations
- **Hooks Implemented**: `beforeCreate`, `beforeUpdate`
- **Critical Issues**:
  - Complex table data validation that can block operations
  - Automatic field calculations that may fail
  - Database queries within hooks that can cause performance issues
  - Dependency on service layer that may not be available
- **Behavior**:
  - Validates table data consistency (games = wins + draws + losses)
  - Calculates derived values (goal difference, points)
  - Recalculates values on updates to base fields

### 6. Team Hooks
- **File**: `team-lifecycles.ts`
- **Complexity**: Medium (simplified from original)
- **Issues**: Validation disabled due to blocking issues
- **Dependencies**: Liga, Saison relationships (validation disabled)
- **Hooks Implemented**: `beforeCreate`, `beforeUpdate`, `afterCreate`, `afterUpdate`
- **Critical Issues**:
  - All strict validation has been disabled due to blocking CRUD operations
  - Original complex saison-liga validation removed
  - Error handling that swallows exceptions
- **Behavior**:
  - Logging of team operations
  - Validation temporarily disabled with TODO comments
  - Error swallowing to prevent operation blocking

### 7. Veranstaltung (Event) Hooks
- **File**: `veranstaltung-lifecycles.ts`
- **Complexity**: Minimal
- **Issues**: None identified
- **Dependencies**: None
- **Hooks Implemented**: `beforeCreate`, `afterCreate`
- **Behavior**: 
  - Sets default values for public visibility and registration requirements
  - Logs event creation

## Identified Problems

### Critical Issues

1. **Saison Hooks**: Complex validation logic that blocks operations
   - Season overlap validation causes failures
   - Automatic season deactivation can cause race conditions
   - Dependency checks prevent legitimate deletions

2. **Tabellen-Eintrag Hooks**: Performance-critical calculations in synchronous hooks
   - Database queries within hooks
   - Complex validation that can fail unexpectedly
   - Automatic calculations that may timeout

3. **Team Hooks**: Originally complex validation completely disabled
   - All business logic validation removed due to blocking issues
   - Error swallowing masks real problems
   - TODO comments indicate incomplete refactoring

### Performance Issues

1. **Synchronous Database Operations**: Multiple hooks perform database queries synchronously
2. **Complex Calculations**: Table calculations performed in real-time during CRUD operations
3. **Cascading Updates**: Season activation triggers multiple database updates

### Stability Issues

1. **Error Handling**: Inconsistent error handling across hooks
2. **Race Conditions**: Multiple hooks can interfere with each other
3. **Circular Dependencies**: Hooks can trigger other hooks creating loops

## Dependencies Identified

### Inter-Content-Type Dependencies

1. **Saison → Team**: Season deletion checks for dependent teams
2. **Saison → Liga**: Season deletion checks for dependent leagues  
3. **Team → Saison**: Team validation depends on season data
4. **Team → Liga**: Team validation depends on league data
5. **Tabellen-Eintrag → Service Layer**: Depends on calculation services

### Service Dependencies

1. **Tabellen-Eintrag**: Depends on `api::tabellen-eintrag.tabellen-eintrag` service
2. **All Hooks**: Depend on Strapi entity service and logging

### External Dependencies

1. **Database**: All hooks perform database operations
2. **Strapi Core**: Entity service, logging, error handling
3. **Date/Time**: Season validation depends on date calculations

## Refactoring Recommendations

Based on this analysis, the refactoring should address:

1. **Separate Critical from Non-Critical Validations**
2. **Move Complex Calculations to Background Jobs**
3. **Implement Graceful Degradation for Non-Critical Failures**
4. **Create Modular Validation Services**
5. **Add Comprehensive Error Handling and Logging**
6. **Implement Configuration-Based Validation Rules**

## Backup Verification

- ✅ All 7 lifecycle files successfully backed up
- ✅ Original file structure preserved in backup naming
- ✅ All hook implementations documented
- ✅ Dependencies and issues identified
- ✅ Backup created on: 2025-01-26

## Restoration Instructions

To restore any of these hooks:

1. Copy the desired file from `backend/src/api/_backup/lifecycles/`
2. Rename to `lifecycles.ts`
3. Place in the appropriate content-type directory:
   - `backend/src/api/{content-type}/content-types/{content-type}/lifecycles.ts`

**Warning**: Restoring these hooks may reintroduce the stability and performance issues that necessitated this refactoring.