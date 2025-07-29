/**
 * Strapi Test Helpers
 * Utilities for setting up and tearing down Strapi in tests
 */

import { createStrapi } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';

let instance: any;

/**
 * Setup Strapi instance for testing
 */
export async function setupStrapi(): Promise<any> {
  if (!instance) {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Create test database if it doesn't exist
    const testDbPath = path.join(__dirname, '../../.tmp/test.db');
    const testDbDir = path.dirname(testDbPath);
    
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }

    // Initialize Strapi
    instance = await createStrapi({
      distDir: path.join(__dirname, '../../dist'),
      appDir: path.join(__dirname, '../../'),
      autoReload: false,
      serveAdminPanel: false
    }).load();

    // Start the server
    await instance.server.mount();
  }

  return instance;
}

/**
 * Cleanup Strapi instance after testing
 */
export async function cleanupStrapi(strapi?: any): Promise<void> {
  const strapiInstance = strapi || instance;
  
  if (strapiInstance) {
    // Close database connections
    if (strapiInstance.db && strapiInstance.db.connection) {
      await strapiInstance.db.connection.destroy();
    }

    // Stop the server
    if (strapiInstance.server && strapiInstance.server.httpServer) {
      await strapiInstance.server.httpServer.close();
    }

    // Destroy the instance
    await strapiInstance.destroy();
  }

  instance = null;
}

/**
 * Reset database to clean state
 */
export async function resetDatabase(strapi: any): Promise<void> {
  // Get all content types
  const contentTypes = Object.keys(strapi.contentTypes);
  
  // Clear all data
  for (const contentType of contentTypes) {
    if (contentType.startsWith('api::')) {
      try {
        const entries = await strapi.entityService.findMany(contentType);
        for (const entry of entries) {
          await strapi.entityService.delete(contentType, entry.id);
        }
      } catch (error) {
        // Ignore errors for content types that don't exist or can't be cleared
      }
    }
  }
}

/**
 * Create test data for common entities
 */
export async function createTestData(strapi: any) {
  // Create test saison
  const saison = await strapi.entityService.create('api::saison.saison', {
    data: {
      name: 'Test Saison 2024/25',
      aktiv: true,
      publishedAt: new Date()
    }
  });

  // Create test liga
  const liga = await strapi.entityService.create('api::liga.liga', {
    data: {
      name: 'Test Liga',
      publishedAt: new Date()
    }
  });

  // Create test teams
  const team1 = await strapi.entityService.create('api::team.team', {
    data: {
      name: 'Test Team 1',
      liga: liga.id,
      publishedAt: new Date()
    }
  });

  const team2 = await strapi.entityService.create('api::team.team', {
    data: {
      name: 'Test Team 2',
      liga: liga.id,
      publishedAt: new Date()
    }
  });

  return {
    saison,
    liga,
    teams: [team1, team2]
  };
}

/**
 * Create admin user for testing
 */
export async function createAdminUser(strapi: any) {
  const adminUser = await strapi.admin.services.user.create({
    email: 'admin@test.com',
    firstname: 'Test',
    lastname: 'Admin',
    password: 'testpassword',
    isActive: true,
    roles: []
  });

  return adminUser;
}

/**
 * Authenticate as admin user
 */
export async function authenticateAdmin(strapi: any, agent: any) {
  const adminUser = await createAdminUser(strapi);
  
  const response = await agent
    .post('/admin/login')
    .send({
      email: 'admin@test.com',
      password: 'testpassword'
    });

  return {
    user: adminUser,
    token: response.body.data.token
  };
}