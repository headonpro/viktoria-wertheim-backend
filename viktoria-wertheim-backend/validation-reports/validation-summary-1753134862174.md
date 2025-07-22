# Validation Diagnostic Summary

**Generated:** 21/07/2025, 23:54:22
**Execution Time:** 2189ms
**Overall Health:** GOOD

## Summary Statistics

- **Total Tests:** 59
- **Discrepancies Found:** 8
- **High Severity Issues:** 8
- **Medium Severity Issues:** 0
- **Fields with Issues:** status, liga, altersklasse, trend

## Validation Discrepancies

### 1. status - "null" (HIGH)
**Description:** Invalid value "null" was accepted by API - possible validation bypass
**API Result:** ✅ Accepted
**Admin Result:** ❌ Rejected

### 2. status - "undefined" (HIGH)
**Description:** Invalid value "undefined" was accepted by API - possible validation bypass
**API Result:** ✅ Accepted
**Admin Result:** ❌ Rejected

### 3. liga - "null" (HIGH)
**Description:** Invalid value "null" was accepted by API - possible validation bypass
**API Result:** ✅ Accepted
**Admin Result:** ❌ Rejected

### 4. liga - "undefined" (HIGH)
**Description:** Invalid value "undefined" was accepted by API - possible validation bypass
**API Result:** ✅ Accepted
**Admin Result:** ❌ Rejected

### 5. altersklasse - "null" (HIGH)
**Description:** Invalid value "null" was accepted by API - possible validation bypass
**API Result:** ✅ Accepted
**Admin Result:** ❌ Rejected

### 6. altersklasse - "undefined" (HIGH)
**Description:** Invalid value "undefined" was accepted by API - possible validation bypass
**API Result:** ✅ Accepted
**Admin Result:** ❌ Rejected

### 7. trend - "null" (HIGH)
**Description:** Invalid value "null" was accepted by API - possible validation bypass
**API Result:** ✅ Accepted
**Admin Result:** ❌ Rejected

### 8. trend - "undefined" (HIGH)
**Description:** Invalid value "undefined" was accepted by API - possible validation bypass
**API Result:** ✅ Accepted
**Admin Result:** ❌ Rejected

## Recommendations

### 1. API accepts values that admin interface rejects (HIGH)
**Category:** Validation Discrepancy
**Solution:** Check admin panel validation logic and schema compilation
**Affected Fields:** status, liga, altersklasse, trend

### 2. Field "status" accepts values not defined in schema (MEDIUM)
**Category:** Schema Inconsistency
**Solution:** Update schema definition or fix validation logic

### 3. Field "liga" accepts values not defined in schema (MEDIUM)
**Category:** Schema Inconsistency
**Solution:** Update schema definition or fix validation logic

### 4. Field "altersklasse" accepts values not defined in schema (MEDIUM)
**Category:** Schema Inconsistency
**Solution:** Update schema definition or fix validation logic

### 5. Field "trend" accepts values not defined in schema (MEDIUM)
**Category:** Schema Inconsistency
**Solution:** Update schema definition or fix validation logic

### 6. Field "status" accepts invalid values (MEDIUM)
**Category:** Insufficient Validation
**Solution:** Strengthen validation rules for this field

### 7. Field "liga" accepts invalid values (MEDIUM)
**Category:** Insufficient Validation
**Solution:** Strengthen validation rules for this field

### 8. Field "altersklasse" accepts invalid values (MEDIUM)
**Category:** Insufficient Validation
**Solution:** Strengthen validation rules for this field

### 9. Field "trend" accepts invalid values (MEDIUM)
**Category:** Insufficient Validation
**Solution:** Strengthen validation rules for this field

