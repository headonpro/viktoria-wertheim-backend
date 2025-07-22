# Validation Quick Reference Guide

## Emergency Fixes

### Admin Interface Not Working
```bash
# Quick fix for admin validation errors
rm -rf .strapi/
npm run build
npm run develop
```

### Database Constraint Errors
```bash
# Fix PostgreSQL enum constraints
node scripts/fix-postgres-enum.js
node scripts/database-enum-repair.js
```

### Schema Compilation Issues
```bash
# Rebuild schema and types
node scripts/schema-rebuild-utility.js
npm run build
```

## Common Error Messages

| Error | Quick Fix | Script |
|-------|-----------|--------|
| "Invalid status" | Clear cache + restart | `rm -rf .strapi/ && npm run develop` |
| "Validation error" | Run diagnostic | `node scripts/comprehensive-validation-diagnostic.js` |
| "Enum constraint violation" | Fix database enums | `node scripts/fix-postgres-enum.js` |
| "Type error" | Regenerate types | `npm run build` |

## Diagnostic Commands

```bash
# Full system check
node scripts/comprehensive-validation-diagnostic.js

# Test admin interface
node scripts/admin-validation-tester.js

# Check API consistency
npm test -- tests/api-consistency-validation.test.ts

# Monitor validation
node scripts/validation-consistency-monitor.js
```

## Validation Test Commands

```bash
# Test mannschaft creation
node scripts/test-mannschaft-creation.js

# Test all validations
node scripts/run-comprehensive-validation-tests.js

# Test admin interface
node scripts/run-admin-validation-tests.js

# Test API consistency
node scripts/run-api-consistency-tests.js
```

## Prevention Checklist

- [ ] Clear cache after schema changes
- [ ] Restart server after enum modifications
- [ ] Test both admin and API after changes
- [ ] Run validation tests before deployment
- [ ] Monitor validation error logs
- [ ] Keep documentation updated

## Emergency Contacts

- **Development Team**: Internal escalation
- **Database Admin**: For constraint issues
- **Strapi Community**: Discord/GitHub for core issues

---

*Keep this guide accessible for quick reference during validation issues.*