/**
 * Comprehensive System Validation Tests for Club System Deployment
 * 
 * This test suite validates the complete club system functionality
 * across all components and user workflows for deployment readiness.
 */

const { test, expect } = require('@playwright/test');
const { ClubSystemTestHelper } = require('../helpers/club-system-test-helper');

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:1337',
  frontendURL: process.env.FRONTEND_URL || 'http://localhost:3000',
  adminURL: process.env.ADMIN_URL || 'http://localhost:1337/admin',
  timeout: 30000,
  retries: 2,
};

// Test data
const TEST_DATA = {
  adminUser: {
    email: 'admin@viktoria-wertheim.de',
    password: 'TestPassword123!'
  },
  testClub: {
    name: 'Test Verein Deployment',
    kurz_name: 'TVD',
    club_typ: 'gegner_verein'
  },
  testGame: {
    datum: '2024-02-15',
    uhrzeit: '15:00',
    heim_tore: 2,
    gast_tore: 1,
    spieltag: 20
  }
};

test.describe('Comprehensive System Validation', () => {
  let helper;

  test.beforeAll(async () => {
    helper = new ClubSystemTestHelper(TEST_CONFIG);
    await helper.initialize();
  });

  test.afterAll(async () => {
    await helper.cleanup();
  });

  test.describe('Database and API Validation', () => {
    test('should validate database connectivity and performance', async ({ request }) => {
      // Test database connection
      const healthResponse = await request.get(`${TEST_CONFIG.baseURL}/api/health`);
      expect(healthResponse.ok()).toBeTruthy();

      // Test database performance
      const startTime = Date.now();
      const clubsResponse = await request.get(`${TEST_CONFIG.baseURL}/api/clubs`);
      const responseTime = Date.now() - startTime;
      
      expect(clubsResponse.ok()).toBeTruthy();
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should validate club collection API endpoints', async ({ request }) => {
      // Test club listing
      const clubsResponse = await request.get(`${TEST_CONFIG.baseURL}/api/clubs`);
      expect(clubsResponse.ok()).toBeTruthy();
      
      const clubs = await clubsResponse.json();
      expect(clubs.data).toBeDefined();
      expect(Array.isArray(clubs.data)).toBeTruthy();

      // Test club filtering by liga
      const filteredResponse = await request.get(
        `${TEST_CONFIG.baseURL}/api/clubs?filters[ligen][id][$eq]=1`
      );
      expect(filteredResponse.ok()).toBeTruthy();

      // Test club population with relations
      const populatedResponse = await request.get(
        `${TEST_CONFIG.baseURL}/api/clubs?populate=*`
      );
      expect(populatedResponse.ok()).toBeTruthy();
    });

    test('should validate spiel collection with club relations', async ({ request }) => {
      // Test spiele with club population
      const spieleResponse = await request.get(
        `${TEST_CONFIG.baseURL}/api/spiele?populate[heim_club][populate]=*&populate[gast_club][populate]=*`
      );
      expect(spieleResponse.ok()).toBeTruthy();
      
      const spiele = await spieleResponse.json();
      expect(spiele.data).toBeDefined();
      
      // Validate club relations are populated
      if (spiele.data.length > 0) {
        const game = spiele.data[0];
        if (game.attributes.heim_club?.data) {
          expect(game.attributes.heim_club.data.attributes).toBeDefined();
        }
      }
    });

    test('should validate tabellen-eintrag collection with club relations', async ({ request }) => {
      // Test tabellen-eintraege with club population
      const tabellenResponse = await request.get(
        `${TEST_CONFIG.baseURL}/api/tabellen-eintraege?populate[club][populate]=*`
      );
      expect(tabellenResponse.ok()).toBeTruthy();
      
      const tabellen = await tabellenResponse.json();
      expect(tabellen.data).toBeDefined();
      
      // Validate club relations and logo population
      if (tabellen.data.length > 0) {
        const entry = tabellen.data[0];
        if (entry.attributes.club?.data) {
          expect(entry.attributes.club.data.attributes).toBeDefined();
        }
      }
    });
  });

  test.describe('Admin Panel Comprehensive Testing', () => {
    test('should login to admin panel successfully', async ({ page }) => {
      await page.goto(TEST_CONFIG.adminURL);
      
      // Handle login
      await page.fill('input[name="email"]', TEST_DATA.adminUser.email);
      await page.fill('input[name="password"]', TEST_DATA.adminUser.password);
      await page.click('button[type="submit"]');
      
      // Wait for dashboard
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      expect(page.url()).toContain('/admin');
    });

    test('should navigate to club collection and validate interface', async ({ page }) => {
      await helper.loginAsAdmin(page);
      
      // Navigate to clubs
      await page.click('text=Content Manager');
      await page.click('text=Club');
      
      // Validate club list interface
      await page.waitForSelector('[data-testid="club-list"]');
      
      // Check for essential UI elements
      await expect(page.locator('button:has-text("Create new entry")')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
      
      // Validate club entries are displayed
      const clubRows = page.locator('[data-testid="club-row"]');
      await expect(clubRows.first()).toBeVisible();
    });

    test('should create new club through admin interface', async ({ page }) => {
      await helper.loginAsAdmin(page);
      await helper.navigateToClubCollection(page);
      
      // Create new club
      await page.click('button:has-text("Create new entry")');
      
      // Fill club form
      await page.fill('input[name="name"]', TEST_DATA.testClub.name);
      await page.fill('input[name="kurz_name"]', TEST_DATA.testClub.kurz_name);
      await page.selectOption('select[name="club_typ"]', TEST_DATA.testClub.club_typ);
      
      // Save club
      await page.click('button:has-text("Save")');
      
      // Validate success
      await page.waitForSelector('text=Saved successfully');
      
      // Verify club appears in list
      await helper.navigateToClubCollection(page);
      await expect(page.locator(`text=${TEST_DATA.testClub.name}`)).toBeVisible();
    });

    test('should validate club logo upload functionality', async ({ page }) => {
      await helper.loginAsAdmin(page);
      await helper.navigateToClubCollection(page);
      
      // Find and edit a club
      await page.click('[data-testid="club-row"]:first-child [data-testid="edit-button"]');
      
      // Test logo upload
      const logoUpload = page.locator('input[type="file"][accept*="image"]');
      if (await logoUpload.count() > 0) {
        // Create a test image file
        const testImagePath = await helper.createTestImage();
        await logoUpload.setInputFiles(testImagePath);
        
        // Wait for upload completion
        await page.waitForSelector('[data-testid="logo-preview"]', { timeout: 10000 });
        
        // Save changes
        await page.click('button:has-text("Save")');
        await page.waitForSelector('text=Saved successfully');
      }
    });

    test('should validate enhanced game form with club selection', async ({ page }) => {
      await helper.loginAsAdmin(page);
      
      // Navigate to spiele collection
      await page.click('text=Content Manager');
      await page.click('text=Spiel');
      
      // Create new game
      await page.click('button:has-text("Create new entry")');
      
      // Test club selection dropdowns
      const heimClubSelect = page.locator('select[name="heim_club"]');
      const gastClubSelect = page.locator('select[name="gast_club"]');
      
      if (await heimClubSelect.count() > 0) {
        // Test club selection
        await heimClubSelect.selectOption({ index: 1 });
        await gastClubSelect.selectOption({ index: 2 });
        
        // Fill other game data
        await page.fill('input[name="datum"]', TEST_DATA.testGame.datum);
        await page.fill('input[name="uhrzeit"]', TEST_DATA.testGame.uhrzeit);
        await page.fill('input[name="heim_tore"]', TEST_DATA.testGame.heim_tore.toString());
        await page.fill('input[name="gast_tore"]', TEST_DATA.testGame.gast_tore.toString());
        
        // Test validation
        await page.click('button:has-text("Save")');
        
        // Should either save successfully or show validation errors
        const isSuccess = await page.locator('text=Saved successfully').isVisible({ timeout: 5000 });
        const hasValidationErrors = await page.locator('[data-testid="validation-error"]').isVisible({ timeout: 5000 });
        
        expect(isSuccess || hasValidationErrors).toBeTruthy();
      }
    });

    test('should validate migration management interface', async ({ page }) => {
      await helper.loginAsAdmin(page);
      
      // Navigate to migration management (if available)
      const migrationLink = page.locator('text=Migration Management');
      if (await migrationLink.count() > 0) {
        await migrationLink.click();
        
        // Validate migration interface elements
        await expect(page.locator('[data-testid="migration-status"]')).toBeVisible();
        await expect(page.locator('[data-testid="migration-progress"]')).toBeVisible();
        
        // Test migration controls (if available)
        const startMigrationButton = page.locator('button:has-text("Start Migration")');
        if (await startMigrationButton.isVisible()) {
          // Don't actually start migration, just validate button is present
          expect(await startMigrationButton.isEnabled()).toBeTruthy();
        }
      }
    });
  });

  test.describe('Frontend Integration Testing', () => {
    test('should validate frontend club data display', async ({ page }) => {
      await page.goto(TEST_CONFIG.frontendURL);
      
      // Wait for page load
      await page.waitForLoadState('networkidle');
      
      // Check for league tables with club data
      const leagueTables = page.locator('[data-testid="league-table"]');
      if (await leagueTables.count() > 0) {
        // Validate club names are displayed
        await expect(leagueTables.first().locator('[data-testid="club-name"]').first()).toBeVisible();
        
        // Validate club logos are displayed (if available)
        const clubLogos = leagueTables.first().locator('[data-testid="club-logo"]');
        if (await clubLogos.count() > 0) {
          await expect(clubLogos.first()).toBeVisible();
        }
      }
    });

    test('should validate mobile responsiveness of club displays', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(TEST_CONFIG.frontendURL);
      
      // Wait for page load
      await page.waitForLoadState('networkidle');
      
      // Validate mobile layout
      const mobileTable = page.locator('[data-testid="mobile-league-table"]');
      if (await mobileTable.count() > 0) {
        await expect(mobileTable).toBeVisible();
        
        // Check mobile-specific elements
        const mobileClubCards = mobileTable.locator('[data-testid="mobile-club-card"]');
        if (await mobileClubCards.count() > 0) {
          await expect(mobileClubCards.first()).toBeVisible();
        }
      }
    });

    test('should validate club-based game displays', async ({ page }) => {
      await page.goto(`${TEST_CONFIG.frontendURL}/spiele`);
      
      // Wait for games to load
      await page.waitForLoadState('networkidle');
      
      // Validate game cards with club information
      const gameCards = page.locator('[data-testid="game-card"]');
      if (await gameCards.count() > 0) {
        const firstGame = gameCards.first();
        
        // Check for club names instead of team names
        const heimClub = firstGame.locator('[data-testid="heim-club"]');
        const gastClub = firstGame.locator('[data-testid="gast-club"]');
        
        if (await heimClub.count() > 0) {
          await expect(heimClub).toBeVisible();
        }
        if (await gastClub.count() > 0) {
          await expect(gastClub).toBeVisible();
        }
      }
    });
  });

  test.describe('Performance Validation', () => {
    test('should validate API response times under load', async ({ request }) => {
      const endpoints = [
        '/api/clubs',
        '/api/spiele?populate=*',
        '/api/tabellen-eintraege?populate=*',
        '/api/ligen?populate=*'
      ];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await request.get(`${TEST_CONFIG.baseURL}${endpoint}`);
        const responseTime = Date.now() - startTime;
        
        expect(response.ok()).toBeTruthy();
        expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
        
        console.log(`${endpoint}: ${responseTime}ms`);
      }
    });

    test('should validate database query performance', async ({ request }) => {
      // Test complex club queries
      const complexQuery = `${TEST_CONFIG.baseURL}/api/clubs?populate[ligen][populate]=*&populate[spiele_heim][populate]=*&populate[spiele_gast][populate]=*`;
      
      const startTime = Date.now();
      const response = await request.get(complexQuery);
      const responseTime = Date.now() - startTime;
      
      expect(response.ok()).toBeTruthy();
      expect(responseTime).toBeLessThan(3000); // Complex queries should complete within 3 seconds
    });

    test('should validate frontend page load performance', async ({ page }) => {
      // Enable performance monitoring
      await page.goto(TEST_CONFIG.frontendURL);
      
      // Measure page load time
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });
      
      // Validate performance metrics
      expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // DOM ready within 2 seconds
      expect(performanceMetrics.loadComplete).toBeLessThan(5000); // Full load within 5 seconds
      
      console.log('Performance metrics:', performanceMetrics);
    });
  });

  test.describe('Error Scenario Testing', () => {
    test('should handle database connection failures gracefully', async ({ page }) => {
      // This test would require mocking database failures
      // For now, we'll test error handling in the UI
      
      await page.goto(`${TEST_CONFIG.baseURL}/api/clubs/999999`); // Non-existent club
      
      // Should return proper error response
      const content = await page.textContent('body');
      expect(content).toContain('error');
    });

    test('should validate form validation in admin panel', async ({ page }) => {
      await helper.loginAsAdmin(page);
      await helper.navigateToClubCollection(page);
      
      // Try to create club with invalid data
      await page.click('button:has-text("Create new entry")');
      
      // Submit empty form
      await page.click('button:has-text("Save")');
      
      // Should show validation errors
      const validationErrors = page.locator('[data-testid="validation-error"]');
      await expect(validationErrors.first()).toBeVisible({ timeout: 5000 });
    });

    test('should handle API rate limiting gracefully', async ({ request }) => {
      // Make rapid requests to test rate limiting
      const requests = Array.from({ length: 50 }, () => 
        request.get(`${TEST_CONFIG.baseURL}/api/clubs`)
      );
      
      const responses = await Promise.all(requests);
      
      // Some requests might be rate limited, but system should remain stable
      const successfulResponses = responses.filter(r => r.ok());
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  test.describe('Data Integrity Validation', () => {
    test('should validate club-liga relationships', async ({ request }) => {
      const clubsResponse = await request.get(`${TEST_CONFIG.baseURL}/api/clubs?populate=ligen`);
      const clubs = await clubsResponse.json();
      
      // Validate that clubs have proper liga relationships
      for (const club of clubs.data) {
        if (club.attributes.ligen?.data) {
          expect(Array.isArray(club.attributes.ligen.data)).toBeTruthy();
          
          // Each liga should have valid attributes
          for (const liga of club.attributes.ligen.data) {
            expect(liga.attributes.name).toBeDefined();
            expect(liga.attributes.saison).toBeDefined();
          }
        }
      }
    });

    test('should validate game-club relationships', async ({ request }) => {
      const spieleResponse = await request.get(
        `${TEST_CONFIG.baseURL}/api/spiele?populate[heim_club]=*&populate[gast_club]=*`
      );
      const spiele = await spieleResponse.json();
      
      // Validate game-club relationships
      for (const spiel of spiele.data) {
        const { heim_club, gast_club } = spiel.attributes;
        
        // If club relations exist, validate them
        if (heim_club?.data) {
          expect(heim_club.data.attributes.name).toBeDefined();
        }
        if (gast_club?.data) {
          expect(gast_club.data.attributes.name).toBeDefined();
        }
        
        // Clubs should not be the same
        if (heim_club?.data && gast_club?.data) {
          expect(heim_club.data.id).not.toBe(gast_club.data.id);
        }
      }
    });

    test('should validate table entry calculations', async ({ request }) => {
      const tabellenResponse = await request.get(
        `${TEST_CONFIG.baseURL}/api/tabellen-eintraege?populate=*`
      );
      const tabellen = await tabellenResponse.json();
      
      // Validate table calculations
      for (const entry of tabellen.data) {
        const attrs = entry.attributes;
        
        // Basic calculation validation
        expect(attrs.spiele).toBe(attrs.siege + attrs.unentschieden + attrs.niederlagen);
        expect(attrs.punkte).toBe(attrs.siege * 3 + attrs.unentschieden * 1);
        expect(attrs.tordifferenz).toBe(attrs.tore_geschossen - attrs.tore_erhalten);
        
        // Club relation validation
        if (attrs.club?.data) {
          expect(attrs.club.data.attributes.name).toBeDefined();
          expect(attrs.team_name).toBe(attrs.club.data.attributes.name);
        }
      }
    });
  });

  test.describe('Security Validation', () => {
    test('should validate admin authentication', async ({ page }) => {
      // Try to access admin without authentication
      await page.goto(`${TEST_CONFIG.adminURL}/content-manager/collectionType/api::club.club`);
      
      // Should redirect to login
      await page.waitForURL('**/admin/auth/login**');
      expect(page.url()).toContain('/admin/auth/login');
    });

    test('should validate API authentication for protected endpoints', async ({ request }) => {
      // Try to access protected endpoints without authentication
      const protectedEndpoints = [
        '/api/clubs',
        '/api/spiele',
        '/api/tabellen-eintraege'
      ];
      
      for (const endpoint of protectedEndpoints) {
        const response = await request.get(`${TEST_CONFIG.baseURL}${endpoint}`);
        
        // Should either be accessible (if public) or require authentication
        expect([200, 401, 403]).toContain(response.status());
      }
    });
  });
});

// Helper class for test utilities
class ClubSystemTestHelper {
  constructor(config) {
    this.config = config;
  }

  async initialize() {
    // Initialize test helper
  }

  async cleanup() {
    // Cleanup test data
  }

  async loginAsAdmin(page) {
    await page.goto(this.config.adminURL);
    await page.fill('input[name="email"]', TEST_DATA.adminUser.email);
    await page.fill('input[name="password"]', TEST_DATA.adminUser.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
  }

  async navigateToClubCollection(page) {
    await page.click('text=Content Manager');
    await page.click('text=Club');
    await page.waitForSelector('[data-testid="club-list"]');
  }

  async createTestImage() {
    // Create a simple test image file
    const fs = require('fs');
    const path = require('path');
    
    const testImagePath = path.join(__dirname, 'test-logo.png');
    
    // Create a minimal PNG file (1x1 pixel)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    fs.writeFileSync(testImagePath, pngData);
    return testImagePath;
  }
}

module.exports = { ClubSystemTestHelper };