# Liga-Tabellen Strapi Admin Interface Guide

## Übersicht

Diese Anleitung beschreibt die technische Implementierung und Konfiguration des Liga-Tabellen-Systems im Strapi Admin Panel.

## Collection Type Konfiguration

### Tabellen-Eintrag Collection Type

#### Schema-Konfiguration
```json
{
  "kind": "collectionType",
  "collectionName": "tabellen_eintraege",
  "info": {
    "singularName": "tabellen-eintrag",
    "pluralName": "tabellen-eintraege",
    "displayName": "Tabellen-Eintrag",
    "description": "Liga-Tabelleneinträge für alle Mannschaften"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "liga": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::liga.liga",
      "required": true,
      "inversedBy": "tabellen_eintraege"
    },
    "team_name": {
      "type": "string",
      "required": true,
      "maxLength": 100,
      "minLength": 2
    },
    "team_logo": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "platz": {
      "type": "integer",
      "required": true,
      "min": 1,
      "max": 20
    },
    "spiele": {
      "type": "integer",
      "required": false,
      "min": 0,
      "default": 0
    },
    "siege": {
      "type": "integer",
      "required": false,
      "min": 0,
      "default": 0
    },
    "unentschieden": {
      "type": "integer",
      "required": false,
      "min": 0,
      "default": 0
    },
    "niederlagen": {
      "type": "integer",
      "required": false,
      "min": 0,
      "default": 0
    },
    "tore_fuer": {
      "type": "integer",
      "required": false,
      "min": 0,
      "default": 0
    },
    "tore_gegen": {
      "type": "integer",
      "required": false,
      "min": 0,
      "default": 0
    },
    "tordifferenz": {
      "type": "integer",
      "required": false,
      "default": 0
    },
    "punkte": {
      "type": "integer",
      "required": false,
      "min": 0,
      "default": 0
    }
  }
}
```

#### Admin Panel Konfiguration
```javascript
// src/admin/app.js - Custom Admin Configuration
export default {
  config: {
    // Custom field configurations for Tabellen-Eintrag
    'tabellen-eintrag': {
      listView: {
        layout: [
          { name: 'team_name', size: 3 },
          { name: 'liga', size: 2 },
          { name: 'platz', size: 1 },
          { name: 'punkte', size: 1 },
          { name: 'spiele', size: 1 },
          { name: 'tore_fuer', size: 1 },
          { name: 'tore_gegen', size: 1 },
          { name: 'updatedAt', size: 2 }
        ],
        defaultSort: 'platz:asc'
      },
      editView: {
        layout: [
          [
            { name: 'team_name', size: 6 },
            { name: 'liga', size: 6 }
          ],
          [
            { name: 'platz', size: 3 },
            { name: 'punkte', size: 3 },
            { name: 'team_logo', size: 6 }
          ],
          [
            { name: 'spiele', size: 2 },
            { name: 'siege', size: 2 },
            { name: 'unentschieden', size: 2 },
            { name: 'niederlagen', size: 2 },
            { name: 'tore_fuer', size: 2 },
            { name: 'tore_gegen', size: 2 }
          ],
          [
            { name: 'tordifferenz', size: 6 }
          ]
        ]
      }
    }
  }
};
```

### Liga Collection Type (Enhanced)

#### Erweiterte Schema-Konfiguration
```json
{
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "kurz_name": {
      "type": "string",
      "required": true
    },
    "saison": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::saison.saison"
    },
    "tabellen_eintraege": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::tabellen-eintrag.tabellen-eintrag",
      "mappedBy": "liga"
    },
    "teams": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::team.team",
      "mappedBy": "liga"
    }
  }
}
```

### Team Collection Type (Cleaned)

#### Bereinigte Schema-Konfiguration
```json
{
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "trainer": {
      "type": "string",
      "required": false
    },
    "form_letzte_5": {
      "type": "string",
      "required": false,
      "maxLength": 5,
      "regex": "^[SUN]*$"
    },
    "team_typ": {
      "type": "enumeration",
      "enum": ["viktoria_mannschaft", "gegner_verein"],
      "default": "viktoria_mannschaft",
      "required": true
    },
    "trend": {
      "type": "enumeration",
      "enum": ["up", "down", "stable"],
      "required": false
    },
    "teamfoto": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "liga": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::liga.liga",
      "inversedBy": "teams"
    },
    "saison": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::saison.saison",
      "inversedBy": "teams"
    }
  }
}
```

## Admin Panel Customizations

### Custom List Views

#### Tabellen-Eintrag List View
```javascript
// src/admin/extensions/tabellen-eintrag/strapi-admin.js
export default {
  register(app) {
    app.customFields.register({
      name: 'viktoria-highlight',
      pluginId: 'tabellen-eintrag',
      type: 'string',
      intlLabel: {
        id: 'viktoria-highlight.label',
        defaultMessage: 'Viktoria Team Highlight'
      },
      intlDescription: {
        id: 'viktoria-highlight.description',
        defaultMessage: 'Highlights Viktoria teams in the table'
      },
      component: async () => {
        const component = await import('./components/ViktoriaHighlight');
        return component.default || component;
      },
      options: {
        advanced: [
          {
            sectionTitle: {
              id: 'viktoria-highlight.options.advanced.settings',
              defaultMessage: 'Settings'
            },
            items: [
              {
                name: 'highlightColor',
                type: 'select',
                intlLabel: {
                  id: 'viktoria-highlight.options.advanced.highlightColor',
                  defaultMessage: 'Highlight Color'
                },
                options: [
                  { key: 'yellow', value: 'yellow', metadatas: { intlLabel: { id: 'Yellow', defaultMessage: 'Yellow' } } },
                  { key: 'blue', value: 'blue', metadatas: { intlLabel: { id: 'Blue', defaultMessage: 'Blue' } } }
                ]
              }
            ]
          }
        ]
      }
    });
  }
};
```

### Custom Filters

#### Liga-basierte Filter
```javascript
// src/admin/extensions/tabellen-eintrag/components/LigaFilter.js
import React from 'react';
import { Select, Option } from '@strapi/design-system';

const LigaFilter = ({ value, onChange }) => {
  const ligas = [
    { id: 1, name: 'Kreisliga Tauberbischofsheim' },
    { id: 2, name: 'Kreisklasse A Tauberbischofsheim' },
    { id: 3, name: 'Kreisklasse B Tauberbischofsheim' }
  ];

  return (
    <Select
      placeholder="Liga auswählen"
      value={value}
      onChange={onChange}
    >
      {ligas.map(liga => (
        <Option key={liga.id} value={liga.id}>
          {liga.name}
        </Option>
      ))}
    </Select>
  );
};

export default LigaFilter;
```

### Bulk Operations

#### Bulk Update für Tabellenplätze
```javascript
// src/admin/extensions/tabellen-eintrag/components/BulkUpdatePlatz.js
import React, { useState } from 'react';
import { Button, NumberInput, Flex } from '@strapi/design-system';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

const BulkUpdatePlatz = ({ selectedEntries }) => {
  const [startPlatz, setStartPlatz] = useState(1);
  const { modifiedData, onChange } = useCMEditViewDataManager();

  const handleBulkUpdate = () => {
    selectedEntries.forEach((entry, index) => {
      onChange({
        target: {
          name: `${entry.id}.platz`,
          value: startPlatz + index
        }
      });
    });
  };

  return (
    <Flex gap={2}>
      <NumberInput
        label="Start Platz"
        value={startPlatz}
        onValueChange={setStartPlatz}
        min={1}
      />
      <Button onClick={handleBulkUpdate}>
        Plätze aktualisieren
      </Button>
    </Flex>
  );
};

export default BulkUpdatePlatz;
```

## Database Optimizations

### Indizes für Performance
```sql
-- Optimierte Indizes für Tabellen-Einträge
CREATE INDEX idx_tabellen_eintraege_liga ON tabellen_eintraege(liga);
CREATE INDEX idx_tabellen_eintraege_platz ON tabellen_eintraege(platz);
CREATE INDEX idx_tabellen_eintraege_liga_platz ON tabellen_eintraege(liga, platz);
CREATE INDEX idx_tabellen_eintraege_team_name ON tabellen_eintraege(team_name);

-- Index für Team-Namen Suche (case-insensitive)
CREATE INDEX idx_tabellen_eintraege_team_name_lower ON tabellen_eintraege(LOWER(team_name));
```

### Database Constraints
```sql
-- Eindeutige Plätze pro Liga
ALTER TABLE tabellen_eintraege 
ADD CONSTRAINT unique_platz_per_liga 
UNIQUE (liga, platz);

-- Team-Name eindeutig pro Liga
ALTER TABLE tabellen_eintraege 
ADD CONSTRAINT unique_team_per_liga 
UNIQUE (liga, team_name);

-- Tordifferenz Konsistenz-Check
ALTER TABLE tabellen_eintraege 
ADD CONSTRAINT check_tordifferenz 
CHECK (tordifferenz = tore_fuer - tore_gegen);
```

## API Customizations

### Custom Controller für Tabellen-Einträge
```javascript
// src/api/tabellen-eintrag/controllers/tabellen-eintrag.js
'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::tabellen-eintrag.tabellen-eintrag', ({ strapi }) => ({
  // Custom find method with optimized queries
  async find(ctx) {
    const { query } = ctx;
    
    // Add default sorting by platz
    if (!query.sort) {
      query.sort = 'platz:asc';
    }
    
    // Optimize population
    if (query.populate === '*') {
      query.populate = {
        liga: {
          fields: ['name', 'kurz_name']
        },
        team_logo: {
          fields: ['url', 'alternativeText']
        }
      };
    }
    
    const { data, meta } = await super.find(ctx);
    
    return { data, meta };
  },

  // Custom method to get league standings
  async findByLiga(ctx) {
    const { ligaName } = ctx.params;
    
    const entries = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
      filters: {
        liga: {
          name: {
            $eq: ligaName
          }
        }
      },
      sort: 'platz:asc',
      populate: {
        liga: {
          fields: ['name', 'kurz_name']
        },
        team_logo: {
          fields: ['url', 'alternativeText']
        }
      }
    });
    
    return { data: entries };
  },

  // Bulk update method for table positions
  async bulkUpdatePlatz(ctx) {
    const { updates } = ctx.request.body;
    
    const results = await Promise.all(
      updates.map(async ({ id, platz }) => {
        return await strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', id, {
          data: { platz }
        });
      })
    );
    
    return { data: results };
  }
}));
```

### Custom Routes
```javascript
// src/api/tabellen-eintrag/routes/custom-routes.js
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/tabellen-eintraege/liga/:ligaName',
      handler: 'tabellen-eintrag.findByLiga',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/tabellen-eintraege/bulk-update-platz',
      handler: 'tabellen-eintrag.bulkUpdatePlatz',
      config: {
        policies: [],
        middlewares: [],
      },
    }
  ]
};
```

## Validation & Middleware

### Custom Validation
```javascript
// src/api/tabellen-eintrag/middlewares/validate-tabellen-eintrag.js
'use strict';

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    if (ctx.request.method === 'POST' || ctx.request.method === 'PUT') {
      const { data } = ctx.request.body;
      
      // Validate tordifferenz calculation
      if (data.tore_fuer !== undefined && data.tore_gegen !== undefined) {
        data.tordifferenz = data.tore_fuer - data.tore_gegen;
      }
      
      // Validate platz uniqueness per liga
      if (data.platz && data.liga) {
        const existingEntry = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
          filters: {
            liga: data.liga,
            platz: data.platz,
            id: { $ne: ctx.params.id } // Exclude current entry for updates
          }
        });
        
        if (existingEntry.length > 0) {
          return ctx.badRequest('Platz bereits vergeben in dieser Liga');
        }
      }
      
      // Validate team_name uniqueness per liga
      if (data.team_name && data.liga) {
        const existingTeam = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
          filters: {
            liga: data.liga,
            team_name: data.team_name,
            id: { $ne: ctx.params.id }
          }
        });
        
        if (existingTeam.length > 0) {
          return ctx.badRequest('Team bereits in dieser Liga vorhanden');
        }
      }
    }
    
    await next();
  };
};
```

## Content Manager Permissions

### Role-based Access Control
```javascript
// config/admin.js - Permission Configuration
module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  permissions: {
    'tabellen-eintrag': {
      'content-manager': {
        main: [
          'plugins::content-manager.explorer.create',
          'plugins::content-manager.explorer.read',
          'plugins::content-manager.explorer.update',
          'plugins::content-manager.explorer.delete'
        ]
      },
      'content-editor': {
        main: [
          'plugins::content-manager.explorer.create',
          'plugins::content-manager.explorer.read',
          'plugins::content-manager.explorer.update'
        ]
      },
      'viewer': {
        main: [
          'plugins::content-manager.explorer.read'
        ]
      }
    }
  }
});
```

## Monitoring & Logging

### Custom Logging für Tabellen-Updates
```javascript
// src/api/tabellen-eintrag/services/tabellen-eintrag.js
'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::tabellen-eintrag.tabellen-eintrag', ({ strapi }) => ({
  async create(params) {
    const result = await super.create(params);
    
    // Log table entry creation
    strapi.log.info(`Tabellen-Eintrag created: ${result.team_name} in ${result.liga?.name} at position ${result.platz}`);
    
    return result;
  },

  async update(entityId, params) {
    const oldEntry = await super.findOne(entityId);
    const result = await super.update(entityId, params);
    
    // Log significant changes
    if (oldEntry.platz !== result.platz) {
      strapi.log.info(`Table position changed: ${result.team_name} from ${oldEntry.platz} to ${result.platz}`);
    }
    
    if (oldEntry.punkte !== result.punkte) {
      strapi.log.info(`Points updated: ${result.team_name} from ${oldEntry.punkte} to ${result.punkte} points`);
    }
    
    return result;
  }
}));
```

## Backup & Migration Scripts

### Automated Backup Script
```javascript
// scripts/backup-tabellen-data.js
const fs = require('fs');
const path = require('path');

const backupTabellenData = async () => {
  const strapi = require('@strapi/strapi')();
  await strapi.load();
  
  const tabellenEintraege = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
    populate: ['liga']
  });
  
  const backup = {
    timestamp: new Date().toISOString(),
    data: tabellenEintraege
  };
  
  const backupPath = path.join(__dirname, '../backups', `tabellen-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  
  console.log(`Backup created: ${backupPath}`);
  await strapi.destroy();
};

backupTabellenData().catch(console.error);
```

## Troubleshooting

### Common Issues & Solutions

#### Issue: Duplicate Platz Values
```javascript
// scripts/fix-duplicate-platz.js
const fixDuplicatePlatz = async () => {
  const strapi = require('@strapi/strapi')();
  await strapi.load();
  
  const ligas = await strapi.entityService.findMany('api::liga.liga');
  
  for (const liga of ligas) {
    const entries = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
      filters: { liga: liga.id },
      sort: 'punkte:desc,tordifferenz:desc,tore_fuer:desc'
    });
    
    // Reassign positions
    for (let i = 0; i < entries.length; i++) {
      await strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', entries[i].id, {
        data: { platz: i + 1 }
      });
    }
  }
  
  await strapi.destroy();
};
```

#### Issue: Missing Liga Relations
```javascript
// scripts/fix-missing-liga-relations.js
const fixMissingLigaRelations = async () => {
  const strapi = require('@strapi/strapi')();
  await strapi.load();
  
  const entriesWithoutLiga = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
    filters: { liga: { $null: true } }
  });
  
  for (const entry of entriesWithoutLiga) {
    // Try to determine liga from team name patterns
    let ligaId = null;
    
    if (entry.team_name.includes('Viktoria Wertheim II')) {
      ligaId = 2; // Kreisklasse A
    } else if (entry.team_name.includes('Viktoria Wertheim 3') || entry.team_name.includes('SpG Vikt')) {
      ligaId = 3; // Kreisklasse B
    } else if (entry.team_name.includes('Viktoria Wertheim')) {
      ligaId = 1; // Kreisliga
    }
    
    if (ligaId) {
      await strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', entry.id, {
        data: { liga: ligaId }
      });
    }
  }
  
  await strapi.destroy();
};
```

Diese technische Dokumentation bietet eine vollständige Anleitung für die Konfiguration und Verwaltung des Liga-Tabellen-Systems im Strapi Admin Panel.