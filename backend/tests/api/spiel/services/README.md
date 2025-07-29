# Validation Service Tests

## Implementation Status

The SpielValidationService has been fully implemented with comprehensive validation rules and input sanitization. The service includes:

### Core Validation Methods

1. **validateSpielResult(spiel)** - Main validation method that combines all validation checks
2. **validateTeamConsistency(heimTeam, gastTeam)** - Ensures teams are different (team cannot play against itself)
3. **validateScores(heimTore, gastTore)** - Validates scores are non-negative integers
4. **validateStatusTransition(oldStatus, newStatus)** - Validates allowed status transitions
5. **validateRequiredFields(spiel)** - Validates required fields based on game status
6. **validateSpieltagRange(spieltag)** - Validates spieltag is between 1-34
7. **sanitizeSpielInput(input)** - Sanitizes input data to prevent common issues

### Validation Rules Implemented

#### Status Transitions
- **From GEPLANT**: Can transition to BEENDET, ABGESAGT, VERSCHOBEN
- **From VERSCHOBEN**: Can transition to GEPLANT, BEENDET, ABGESAGT  
- **From ABGESAGT**: Can transition to GEPLANT, VERSCHOBEN
- **From BEENDET**: Cannot transition to any other status (completed games are final)

#### Score Validation
- Scores must be non-negative integers
- Decimal values are rejected
- Warnings for unusually high scores (>10)
- Warnings for unusual score differences (>5)

#### Required Fields
- For completed games (BEENDET): heim_tore and gast_tore are required
- For all games: heim_team, gast_team, liga, saison, datum are required
- Team IDs must be different (team cannot play against itself)

#### Spieltag Range
- Must be between 1 and 34 (inclusive)
- Must be an integer value

### Input Sanitization

The service includes comprehensive input sanitization:
- Negative scores are converted to 0
- Decimal scores are floored to integers
- Spieltag values are clamped to 1-34 range
- Invalid status values default to 'geplant'
- String fields are trimmed of whitespace

### Error Handling

The service uses structured error codes:
- `NEGATIVE_SCORE` - Score values cannot be negative
- `TEAM_AGAINST_ITSELF` - Team cannot play against itself
- `MISSING_REQUIRED_FIELD` - Required field is missing
- `INVALID_STATUS_TRANSITION` - Status transition not allowed
- `INVALID_SPIELTAG_RANGE` - Spieltag outside valid range
- `SCORES_REQUIRED_FOR_COMPLETED` - Scores required for completed games

### Warning System

The service includes warnings for unusual but valid data:
- `HIGH_SCORE_VALUE` - Score unusually high (>10)
- `UNUSUAL_SCORE_DIFFERENCE` - Large score difference (>5)

## Test Coverage

Comprehensive tests have been implemented covering:
- All validation methods
- Edge cases and error scenarios
- Input sanitization
- Performance with large datasets
- Status transition validation
- Required field validation
- Spieltag range validation

## Requirements Fulfilled

This implementation fulfills all requirements from tasks 2.1 and 2.2:

### Task 2.1 Requirements ✅
- ✅ ValidationService class with validateSpielResult method
- ✅ Score validation (non-negative integers)
- ✅ Team consistency validation (team cannot play against itself)
- ✅ ValidationError and ValidationResult interfaces

### Task 2.2 Requirements ✅
- ✅ Status transition validation (geplant -> beendet)
- ✅ Required field validation for completed games
- ✅ Validation for spieltag ranges (1-34)
- ✅ Comprehensive unit tests for all validation scenarios

The validation service is production-ready and provides robust data validation for the Tabellen-Automatisierung system.