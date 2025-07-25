# Troubleshooting Guide

## Strapi Admin Panel 500 Errors beim Bearbeiten von Content Types

### Problem
- PUT Requests im Strapi Admin Panel (Content Manager) schlagen mit 500 Internal Server Error fehl
- Betrifft alle Bearbeitungsversuche: Textfelder, Dropdowns, etc.
- Frontend API-Calls funktionieren normal

### Ursache
Custom Error Handler Middleware (`src/middlewares/error-handler.ts`) interferiert mit Strapi's internen Admin-Routen.

### Symptome
```
PUT http://localhost:1337/content-manager/collection-types/api::team.team/[id]? 500 (Internal Server Error)
```

### Lösung
Error Handler Middleware so modifizieren, dass Admin-Routen ausgeschlossen werden:

```typescript
export default (config, { strapi }) => {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      // Skip error handling for Strapi admin routes to avoid interference
      if (ctx.url.startsWith('/admin') || ctx.url.startsWith('/content-manager')) {
        throw error; // Let Strapi handle admin errors natively
      }
      
      // Rest of error handling logic...
    }
  };
};
```

### Debugging-Schritte
1. Middleware temporär in `config/middlewares.ts` deaktivieren
2. Testen ob Admin Panel funktioniert
3. Wenn ja: Admin-Routen vom Error Handler ausschließen
4. Middleware wieder aktivieren

### Zusätzliche Hinweise
- Lifecycle hooks können auch Probleme verursachen - bei Debugging temporär deaktivieren
- Strapi v5 hat andere API Response-Struktur: `response.data.data` statt `response.data`
- Populate-Syntax geändert: `populate: '*'` statt `populate: 'field1,field2'`

### Datum
25.07.2025 - Mehrere Stunden Debugging für dieses Problem aufgewendet