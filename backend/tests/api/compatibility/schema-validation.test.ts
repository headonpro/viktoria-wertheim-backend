/**
 * Schema Validation Tests
 * Ensures API schemas remain compatible with frontend expectations
 */

import fs from 'fs';
import path from 'path';

describe('API Schema Compatibility', () => {
  describe('Tabellen-Eintrag Schema', () => {
    let schema: any;

    beforeAll(() => {
      const schemaPath = path.join(__dirname, '../../../src/api/tabellen-eintrag/content-types/tabellen-eintrag/schema.json');
      schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    });

    test('should maintain required fields for frontend', () => {
      const attributes = schema.attributes;
      
      // Essential fields that frontend depends on
      const requiredFields = [
        'team_name',
        'platz',
        'spiele',
        'siege',
        'unentschieden',
        'niederlagen',
        'tore_fuer',
        'tore_gegen',
        'tordifferenz',
        'punkte'
      ];

      requiredFields.forEach(field => {
        expect(attributes).toHaveProperty(field);
        expect(attributes[field]).toHaveProperty('type');
      });
    });

    test('should maintain relation fields', () => {
      const attributes = schema.attributes;
      
      expect(attributes.liga).toHaveProperty('type', 'relation');
      expect(attributes.liga).toHaveProperty('target', 'api::liga.liga');
      
      expect(attributes.team).toHaveProperty('type', 'relation');
      expect(attributes.team).toHaveProperty('target', 'api::team.team');
    });

    test('should maintain field types for calculations', () => {
      const attributes = schema.attributes;
      
      const integerFields = ['spiele', 'siege', 'unentschieden', 'niederlagen', 'tore_fuer', 'tore_gegen', 'punkte'];
      
      integerFields.forEach(field => {
        expect(attributes[field].type).toBe('integer');
        expect(attributes[field]).toHaveProperty('required', true);
        expect(attributes[field]).toHaveProperty('min', 0);
      });

      // Special case for platz (min: 1)
      expect(attributes.platz.type).toBe('integer');
      expect(attributes.platz).toHaveProperty('required', true);
      expect(attributes.platz).toHaveProperty('min', 1);

      // Special case for tordifferenz (no min constraint)
      expect(attributes.tordifferenz.type).toBe('integer');
      expect(attributes.tordifferenz).toHaveProperty('required', true);
    });

    test('should maintain collection configuration', () => {
      expect(schema.kind).toBe('collectionType');
      expect(schema.collectionName).toBe('tabellen_eintraege');
      expect(schema.info.singularName).toBe('tabellen-eintrag');
      expect(schema.info.pluralName).toBe('tabellen-eintraege');
      expect(schema.options.draftAndPublish).toBe(false);
    });
  });

  describe('Spiel Schema', () => {
    let schema: any;

    beforeAll(() => {
      const schemaPath = path.join(__dirname, '../../../src/api/spiel/content-types/spiel/schema.json');
      schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    });

    test('should maintain required fields for frontend', () => {
      const attributes = schema.attributes;
      
      const requiredFields = [
        'datum',
        'heim_tore',
        'gast_tore',
        'spieltag',
        'status'
      ];

      requiredFields.forEach(field => {
        expect(attributes).toHaveProperty(field);
        expect(attributes[field]).toHaveProperty('type');
      });
    });

    test('should maintain relation fields', () => {
      const attributes = schema.attributes;
      
      expect(attributes.liga).toHaveProperty('type', 'relation');
      expect(attributes.liga).toHaveProperty('target', 'api::liga.liga');
      
      expect(attributes.saison).toHaveProperty('type', 'relation');
      expect(attributes.saison).toHaveProperty('target', 'api::saison.saison');
      
      expect(attributes.heim_team).toHaveProperty('type', 'relation');
      expect(attributes.heim_team).toHaveProperty('target', 'api::team.team');
      
      expect(attributes.gast_team).toHaveProperty('type', 'relation');
      expect(attributes.gast_team).toHaveProperty('target', 'api::team.team');
    });

    test('should maintain status enumeration', () => {
      const attributes = schema.attributes;
      
      expect(attributes.status.type).toBe('enumeration');
      expect(attributes.status.enum).toEqual(['geplant', 'beendet', 'abgesagt', 'verschoben']);
      expect(attributes.status.default).toBe('geplant');
      expect(attributes.status.required).toBe(true);
    });

    test('should maintain score field configuration', () => {
      const attributes = schema.attributes;
      
      expect(attributes.heim_tore.type).toBe('integer');
      expect(attributes.heim_tore.min).toBe(0);
      expect(attributes.heim_tore.required).toBe(false);
      
      expect(attributes.gast_tore.type).toBe('integer');
      expect(attributes.gast_tore.min).toBe(0);
      expect(attributes.gast_tore.required).toBe(false);
    });

    test('should maintain collection configuration', () => {
      expect(schema.kind).toBe('collectionType');
      expect(schema.collectionName).toBe('spiele');
      expect(schema.info.singularName).toBe('spiel');
      expect(schema.info.pluralName).toBe('spiele');
      expect(schema.options.draftAndPublish).toBe(false);
    });
  });

  describe('Route Configuration', () => {
    test('tabellen-eintrag routes should exist', () => {
      const routePath = path.join(__dirname, '../../../src/api/tabellen-eintrag/routes/tabellen-eintrag.ts');
      expect(fs.existsSync(routePath)).toBe(true);
      
      const routeContent = fs.readFileSync(routePath, 'utf8');
      expect(routeContent).toContain('createCoreRouter');
      expect(routeContent).toContain('api::tabellen-eintrag.tabellen-eintrag');
    });

    test('spiel routes should exist', () => {
      const routePath = path.join(__dirname, '../../../src/api/spiel/routes/spiel.ts');
      expect(fs.existsSync(routePath)).toBe(true);
      
      const routeContent = fs.readFileSync(routePath, 'utf8');
      expect(routeContent).toContain('createCoreRouter');
      expect(routeContent).toContain('api::spiel.spiel');
    });

    test('admin routes should exist for new functionality', () => {
      const adminRoutePath = path.join(__dirname, '../../../src/api/tabellen-eintrag/routes/admin.ts');
      expect(fs.existsSync(adminRoutePath)).toBe(true);
      
      const monitoringRoutePath = path.join(__dirname, '../../../src/api/tabellen-eintrag/routes/monitoring.ts');
      expect(fs.existsSync(monitoringRoutePath)).toBe(true);
    });
  });

  describe('Controller Configuration', () => {
    test('tabellen-eintrag controller should exist', () => {
      const controllerPath = path.join(__dirname, '../../../src/api/tabellen-eintrag/controllers/tabellen-eintrag.ts');
      expect(fs.existsSync(controllerPath)).toBe(true);
      
      const controllerContent = fs.readFileSync(controllerPath, 'utf8');
      expect(controllerContent).toContain('createCoreController');
      expect(controllerContent).toContain('api::tabellen-eintrag.tabellen-eintrag');
    });

    test('spiel controller should exist', () => {
      const controllerPath = path.join(__dirname, '../../../src/api/spiel/controllers/spiel.ts');
      expect(fs.existsSync(controllerPath)).toBe(true);
      
      const controllerContent = fs.readFileSync(controllerPath, 'utf8');
      expect(controllerContent).toContain('createCoreController');
      expect(controllerContent).toContain('api::spiel.spiel');
    });

    test('admin controllers should exist for new functionality', () => {
      const adminControllerPath = path.join(__dirname, '../../../src/api/tabellen-eintrag/controllers/admin.ts');
      expect(fs.existsSync(adminControllerPath)).toBe(true);
      
      const monitoringControllerPath = path.join(__dirname, '../../../src/api/tabellen-eintrag/controllers/monitoring.ts');
      expect(fs.existsSync(monitoringControllerPath)).toBe(true);
    });
  });

  describe('Service Configuration', () => {
    test('tabellen-eintrag service should exist', () => {
      const servicePath = path.join(__dirname, '../../../src/api/tabellen-eintrag/services/tabellen-eintrag.ts');
      expect(fs.existsSync(servicePath)).toBe(true);
      
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      expect(serviceContent).toContain('createCoreService');
      expect(serviceContent).toContain('api::tabellen-eintrag.tabellen-eintrag');
    });

    test('spiel service should exist', () => {
      const servicePath = path.join(__dirname, '../../../src/api/spiel/services/spiel.ts');
      expect(fs.existsSync(servicePath)).toBe(true);
      
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      expect(serviceContent).toContain('createCoreService');
      expect(serviceContent).toContain('api::spiel.spiel');
    });

    test('automation services should exist', () => {
      const automationServices = [
        'tabellen-berechnung.ts',
        'queue-manager.ts',
        'snapshot.ts'
      ];

      automationServices.forEach(service => {
        const servicePath = path.join(__dirname, '../../../src/api/tabellen-eintrag/services', service);
        expect(fs.existsSync(servicePath)).toBe(true);
      });

      const spielValidationPath = path.join(__dirname, '../../../src/api/spiel/services/validation.ts');
      expect(fs.existsSync(spielValidationPath)).toBe(true);
    });
  });

  describe('API Documentation', () => {
    test('API documentation should exist', () => {
      const docPath = path.join(__dirname, '../../../docs/api/endpoints.md');
      expect(fs.existsSync(docPath)).toBe(true);
      
      const docContent = fs.readFileSync(docPath, 'utf8');
      expect(docContent).toContain('/api/tabellen-eintraege');
      expect(docContent).toContain('/api/spiele');
      expect(docContent).toContain('Backward Compatibility');
    });
  });
});