---
inclusion: manual
---

# Strapi Admin Panel Error Debugging

## Critical Issue: Custom Middleware Breaking Admin Panel

**Problem**: Custom error handler middleware can break Strapi Admin Panel functionality, causing 500 errors on all PUT requests.

**Quick Fix**: Always exclude admin routes from custom middleware:

```typescript
// In custom middleware
if (ctx.url.startsWith('/admin') || ctx.url.startsWith('/content-manager')) {
  throw error; // Let Strapi handle admin errors natively
}
```

**Debugging Steps**:
1. Temporarily disable custom middleware in `config/middlewares.ts`
2. Test if admin panel works
3. If yes, add admin route exclusion to middleware
4. Re-enable middleware

This issue has cost multiple hours of debugging time in the past.