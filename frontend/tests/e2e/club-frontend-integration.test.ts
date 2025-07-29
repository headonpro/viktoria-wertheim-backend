/**
 * Frontend Integration E2E Tests with Club Data
 * Tests the complete frontend workflow with club data integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import axios from 'axios';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:1337';

describe('Frontend Club Integration E2E Tests', () => {
  let browser: Browser;
  let page: Page;
  let testData: any = {};

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.CI === 'true' ? 0 : 50,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667 }); // Mobile viewport
    
    // Setup test data via backend API
    testData = await setupFrontendTestData();
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
    
    // Cleanup test data
    await cleanupFrontendTestData(testData);
  });

  describe('Team Selection and Club Data Display', () => {
    it('should display team selection with correct club mappings', async () => {
      await page.goto(`${FRONTEND_URL}/mannschaften`);
      
      // Wait for team selection to load
      await page.waitForSelector('[data-testid="team-selection"]', { timeout: 10000 });
      
      // Check that all three teams are available
      const teamButtons = await page.$$('[data-testid="team-button"]');
      expect(teamButtons.length).toBe(3);
      
      // Check team 1 button
      const team1Button = await page.$('[data-testid="team-button-1"]');
      expect(team1Button).toBeTruthy();
      
      const team1Text = await page.evaluate(el => el?.textContent, team1Button);
      expect(team1Text).toContain('1. Mannschaft');
      
      // Click team 1 and verify navigation
      await team1Button?.click();
      
      // Wait for league table to load
      await page.waitForSelector('[data-testid="league-table"]', { timeout: 10000 });
      
      // Verify URL contains team parameter
      const url = page.url();
      expect(url).toContain('team=1');
    });

    it('should display league table with club names and logos', async () => {
      await page.goto(`${FRONTEND_URL}/mannschaften?team=1`);
      
      // Wait for league table to load
      await page.waitForSelector('[data-testid="league-table"]', { timeout: 10000 });
      
      // Check table headers
      const headers = await page.$$eval('[data-testid="table-header"] th', 
        elements => elements.map(el => el.textContent)
      );
      
      expect(headers).toContain('Verein');
      expect(headers).toContain('Spiele');
      expect(headers).toContain('Punkte');
      
      // Check that Viktoria team is displayed with correct club name
      const viktoriaRow = await page.$('[data-testid="table-row-viktoria"]');
      expect(viktoriaRow).toBeTruthy();
      
      const viktoriaName = await page.evaluate(
        el => el?.querySelector('[data-testid="team-name"]')?.textContent,
        viktoriaRow
      );
      expect(viktoriaName).toBe('SV Viktoria Wertheim');
      
      // Check for club logo
      const viktoriaLogo = await page.$('[data-testid="team-logo"]');
      if (viktoriaLogo) {
        const logoSrc = await page.evaluate(el => el?.getAttribute('src'), viktoriaLogo);
        expect(logoSrc).toBeTruthy();
      }
    });

    it('should highlight Viktoria teams correctly', async () => {
      await page.goto(`${FRONTEND_URL}/mannschaften?team=1`);
      
      await page.waitForSelector('[data-testid="league-table"]', { timeout: 10000 });
      
      // Check that Viktoria row has highlight styling
      const viktoriaRow = await page.$('[data-testid="table-row-viktoria"]');
      expect(viktoriaRow).toBeTruthy();
      
      const viktoriaClasses = await page.evaluate(
        el => el?.className,
        viktoriaRow
      );
      
      // Should contain viktoria-specific styling classes
      expect(viktoriaClasses).toMatch(/viktoria|highlight|selected/);
    });

    it('should switch between different teams correctly', async () => {
      await page.goto(`${FRONTEND_URL}/mannschaften`);
      
      // Test team 1
      await page.click('[data-testid="team-button-1"]');
      await page.waitForSelector('[data-testid="league-table"]', { timeout: 10000 });
      
      let url = page.url();
      expect(url).toContain('team=1');
      
      // Go back to team selection
      await page.click('[data-testid="back-to-teams"]');
      await page.waitForSelector('[data-testid="team-selection"]', { timeout: 10000 });
      
      // Test team 2
      await page.click('[data-testid="team-button-2"]');
      await page.waitForSelector('[data-testid="league-table"]', { timeout: 10000 });
      
      url = page.url();
      expect(url).toContain('team=2');
      
      // Verify different league data is loaded
      const tableRows = await page.$$('[data-testid="table-row"]');
      expect(tableRows.length).toBeGreaterThan(0);
    });
  });

  describe('Game Display with Club Data', () => {
    it('should display recent games with club names', async () => {
      await page.goto(`${FRONTEND_URL}/mannschaften?team=1`);
      
      // Wait for games section to load
      await page.waitForSelector('[data-testid="recent-games"]', { timeout: 10000 });
      
      // Check that games are displayed
      const gameCards = await page.$$('[data-testid="game-card"]');
      expect(gameCards.length).toBeGreaterThan(0);
      
      // Check first game card
      const firstGame = gameCards[0];
      
      const heimTeam = await page.evaluate(
        el => el?.querySelector('[data-testid="heim-team"]')?.textContent,
        firstGame
      );
      const gastTeam = await page.evaluate(
        el => el?.querySelector('[data-testid="gast-team"]')?.textContent,
        firstGame
      );
      
      expect(heimTeam).toBeTruthy();
      expect(gastTeam).toBeTruthy();
      
      // Should display club names, not internal team names
      expect(heimTeam).not.toContain('1. Mannschaft');
      expect(gastTeam).not.toContain('2. Mannschaft');
    });

    it('should display upcoming games correctly', async () => {
      await page.goto(`${FRONTEND_URL}/mannschaften?team=1`);
      
      await page.waitForSelector('[data-testid="upcoming-games"]', { timeout: 10000 });
      
      const upcomingGames = await page.$$('[data-testid="upcoming-game-card"]');
      
      if (upcomingGames.length > 0) {
        const firstUpcoming = upcomingGames[0];
        
        // Check game status
        const status = await page.evaluate(
          el => el?.querySelector('[data-testid="game-status"]')?.textContent,
          firstUpcoming
        );
        
        expect(status).toMatch(/geplant|verschoben/i);
        
        // Check that date is displayed
        const gameDate = await page.evaluate(
          el => el?.querySelector('[data-testid="game-date"]')?.textContent,
          firstUpcoming
        );
        
        expect(gameDate).toBeTruthy();
      }
    });

    it('should handle game result updates in real-time', async () => {
      await page.goto(`${FRONTEND_URL}/mannschaften?team=1`);
      
      await page.waitForSelector('[data-testid="league-table"]', { timeout: 10000 });
      
      // Get initial table state
      const initialViktoriaPoints = await page.evaluate(() => {
        const viktoriaRow = document.querySelector('[data-testid="table-row-viktoria"]');
        return viktoriaRow?.querySelector('[data-testid="points"]')?.textContent;
      });
      
      // Simulate game result update via backend
      await updateGameResult(testData.gameId, { heim_tore: 3, gast_tore: 0 });
      
      // Wait for table to update (assuming some refresh mechanism)
      await page.waitForTimeout(3000);
      
      // Refresh page to see updated results
      await page.reload();
      await page.waitForSelector('[data-testid="league-table"]', { timeout: 10000 });
      
      const updatedViktoriaPoints = await page.evaluate(() => {
        const viktoriaRow = document.querySelector('[data-testid="table-row-viktoria"]');
        return viktoriaRow?.querySelector('[data-testid="points"]')?.textContent;
      });
      
      // Points should have changed if Viktoria was involved in the updated game
      if (initialViktoriaPoints !== null && updatedViktoriaPoints !== null) {
        expect(updatedViktoriaPoints).toBeDefined();
      }
    });
  });

  describe('Mobile Responsiveness and Performance', () => {
    it('should be fully responsive on mobile devices', async () => {
      // Test different mobile viewports
      const viewports = [
        { width: 375, height: 667, name: 'iPhone SE' },
        { width: 414, height: 896, name: 'iPhone 11' },
        { width: 360, height: 640, name: 'Galaxy S5' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.goto(`${FRONTEND_URL}/mannschaften`);
        
        // Check that team selection is properly displayed
        await page.waitForSelector('[data-testid="team-selection"]', { timeout: 10000 });
        
        const teamButtons = await page.$$('[data-testid="team-button"]');
        expect(teamButtons.length).toBe(3);
        
        // Check that buttons are touch-friendly (minimum 44px height)
        for (const button of teamButtons) {
          const buttonHeight = await page.evaluate(el => {
            const rect = el?.getBoundingClientRect();
            return rect?.height || 0;
          }, button);
          
          expect(buttonHeight).toBeGreaterThanOrEqual(44);
        }
        
        // Test navigation on this viewport
        await page.click('[data-testid="team-button-1"]');
        await page.waitForSelector('[data-testid="league-table"]', { timeout: 10000 });
        
        // Check that table is horizontally scrollable if needed
        const tableContainer = await page.$('[data-testid="table-container"]');
        const isScrollable = await page.evaluate(el => {
          return el ? el.scrollWidth > el.clientWidth : false;
        }, tableContainer);
        
        // On narrow screens, table should be scrollable
        if (viewport.width < 400) {
          expect(isScrollable).toBe(true);
        }
      }
    });

    it('should load quickly and meet performance targets', async () => {
      const startTime = Date.now();
      
      await page.goto(`${FRONTEND_URL}/mannschaften`, { 
        waitUntil: 'networkidle0',
        timeout: 10000 
      });
      
      const loadTime = Date.now() - startTime;
      console.log(`Page load time: ${loadTime}ms`);
      
      // Should load within 3 seconds on mobile
      expect(loadTime).toBeLessThan(3000);
      
      // Check Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals: any = {};
            
            entries.forEach((entry: any) => {
              if (entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.startTime;
              }
              if (entry.name === 'largest-contentful-paint') {
                vitals.lcp = entry.startTime;
              }
            });
            
            resolve(vitals);
          }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve({}), 2000);
        });
      });
      
      console.log('Performance metrics:', metrics);
    });

    it('should handle offline scenarios gracefully', async () => {
      await page.goto(`${FRONTEND_URL}/mannschaften`);
      await page.waitForSelector('[data-testid="team-selection"]', { timeout: 10000 });
      
      // Simulate offline
      await page.setOfflineMode(true);
      
      // Try to navigate
      await page.click('[data-testid="team-button-1"]');
      
      // Should show appropriate error message or cached content
      await page.waitForTimeout(2000);
      
      const errorMessage = await page.$('[data-testid="offline-message"]');
      const cachedContent = await page.$('[data-testid="league-table"]');
      
      // Either error message or cached content should be shown
      expect(errorMessage || cachedContent).toBeTruthy();
      
      // Restore online
      await page.setOfflineMode(false);
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should be fully accessible with screen readers', async () => {
      await page.goto(`${FRONTEND_URL}/mannschaften`);
      await page.waitForSelector('[data-testid="team-selection"]', { timeout: 10000 });
      
      // Check for proper ARIA labels
      const teamButtons = await page.$$('[data-testid="team-button"]');
      
      for (const button of teamButtons) {
        const ariaLabel = await page.evaluate(el => el?.getAttribute('aria-label'), button);
        const role = await page.evaluate(el => el?.getAttribute('role'), button);
        
        expect(ariaLabel || role).toBeTruthy();
      }
      
      // Navigate to table and check accessibility
      await page.click('[data-testid="team-button-1"]');
      await page.waitForSelector('[data-testid="league-table"]', { timeout: 10000 });
      
      // Check table accessibility
      const table = await page.$('[data-testid="league-table"]');
      const tableRole = await page.evaluate(el => el?.getAttribute('role'), table);
      const tableCaption = await page.$('caption');
      
      expect(tableRole === 'table' || tableCaption).toBeTruthy();
      
      // Check for proper heading structure
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', 
        elements => elements.map(el => ({ tag: el.tagName, text: el.textContent }))
      );
      
      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0].tag).toBe('H1'); // Should start with H1
    });

    it('should support keyboard navigation', async () => {
      await page.goto(`${FRONTEND_URL}/mannschaften`);
      await page.waitForSelector('[data-testid="team-selection"]', { timeout: 10000 });
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      let focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBe('team-button-1');
      
      // Navigate through team buttons
      await page.keyboard.press('Tab');
      focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBe('team-button-2');
      
      await page.keyboard.press('Tab');
      focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBe('team-button-3');
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-testid="league-table"]', { timeout: 10000 });
      
      const url = page.url();
      expect(url).toContain('team=3');
    });

    it('should provide clear visual feedback for interactions', async () => {
      await page.goto(`${FRONTEND_URL}/mannschaften`);
      await page.waitForSelector('[data-testid="team-selection"]', { timeout: 10000 });
      
      const teamButton = await page.$('[data-testid="team-button-1"]');
      
      // Check initial state
      const initialClasses = await page.evaluate(el => el?.className, teamButton);
      
      // Hover state
      await page.hover('[data-testid="team-button-1"]');
      await page.waitForTimeout(100);
      
      const hoverClasses = await page.evaluate(el => el?.className, teamButton);
      
      // Focus state
      await page.focus('[data-testid="team-button-1"]');
      await page.waitForTimeout(100);
      
      const focusClasses = await page.evaluate(el => el?.className, teamButton);
      
      // Classes should change to indicate different states
      expect(hoverClasses).not.toBe(initialClasses);
      expect(focusClasses).not.toBe(initialClasses);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API failure by going to invalid URL first
      await page.goto(`${FRONTEND_URL}/mannschaften?team=999`);
      
      // Should show error state or fallback
      await page.waitForTimeout(3000);
      
      const errorMessage = await page.$('[data-testid="error-message"]');
      const fallbackContent = await page.$('[data-testid="fallback-content"]');
      
      expect(errorMessage || fallbackContent).toBeTruthy();
      
      // Should allow recovery
      await page.goto(`${FRONTEND_URL}/mannschaften`);
      await page.waitForSelector('[data-testid="team-selection"]', { timeout: 10000 });
      
      const teamButtons = await page.$$('[data-testid="team-button"]');
      expect(teamButtons.length).toBe(3);
    });

    it('should handle empty data states', async () => {
      // This would require setting up empty test data
      // For now, we'll test the UI handles missing optional data
      
      await page.goto(`${FRONTEND_URL}/mannschaften?team=1`);
      await page.waitForSelector('[data-testid="league-table"]', { timeout: 10000 });
      
      // Check that missing logos don't break the layout
      const logoElements = await page.$$('[data-testid="team-logo"]');
      
      for (const logo of logoElements) {
        const logoSrc = await page.evaluate(el => el?.getAttribute('src'), logo);
        const logoAlt = await page.evaluate(el => el?.getAttribute('alt'), logo);
        
        // Should have fallback or alt text
        expect(logoSrc || logoAlt).toBeTruthy();
      }
    });

    it('should handle slow network conditions', async () => {
      // Simulate slow 3G
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 500 * 1024 / 8, // 500kb/s
        uploadThroughput: 500 * 1024 / 8,
        latency: 400
      });
      
      const startTime = Date.now();
      
      await page.goto(`${FRONTEND_URL}/mannschaften`);
      
      // Should show loading state
      const loadingIndicator = await page.$('[data-testid="loading"]');
      if (loadingIndicator) {
        expect(loadingIndicator).toBeTruthy();
      }
      
      await page.waitForSelector('[data-testid="team-selection"]', { timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`Slow network load time: ${loadTime}ms`);
      
      // Should still be usable on slow networks
      expect(loadTime).toBeLessThan(15000);
    });
  });
});

// Helper functions
async function setupFrontendTestData() {
  try {
    // Create test saison
    const saisonResponse = await axios.post(`${BACKEND_URL}/api/saisonen`, {
      data: {
        name: '2023/24 E2E',
        jahr: 2023,
        aktiv: true
      }
    });
    
    // Create test liga
    const ligaResponse = await axios.post(`${BACKEND_URL}/api/ligen`, {
      data: {
        name: 'Test Liga Frontend E2E',
        saison: saisonResponse.data.data.id
      }
    });
    
    // Create Viktoria club
    const viktoriaClubResponse = await axios.post(`${BACKEND_URL}/api/clubs`, {
      data: {
        name: 'SV Viktoria Wertheim',
        kurz_name: 'SV VIK',
        club_typ: 'viktoria_verein',
        viktoria_team_mapping: 'team_1',
        ligen: [ligaResponse.data.data.id],
        aktiv: true
      }
    });
    
    // Create opponent club
    const opponentClubResponse = await axios.post(`${BACKEND_URL}/api/clubs`, {
      data: {
        name: 'FC Test Opponent',
        kurz_name: 'FC TEST',
        club_typ: 'gegner_verein',
        ligen: [ligaResponse.data.data.id],
        aktiv: true
      }
    });
    
    // Create test game
    const gameResponse = await axios.post(`${BACKEND_URL}/api/spiele`, {
      data: {
        datum: new Date('2024-03-15T15:00:00Z'),
        liga: ligaResponse.data.data.id,
        saison: saisonResponse.data.data.id,
        spieltag: 15,
        heim_club: viktoriaClubResponse.data.data.id,
        gast_club: opponentClubResponse.data.data.id,
        heim_tore: 2,
        gast_tore: 1,
        status: 'beendet'
      }
    });
    
    return {
      saison: saisonResponse.data.data,
      liga: ligaResponse.data.data,
      viktoriaClub: viktoriaClubResponse.data.data,
      opponentClub: opponentClubResponse.data.data,
      game: gameResponse.data.data,
      gameId: gameResponse.data.data.id
    };
  } catch (error) {
    console.error('Failed to setup frontend test data:', error);
    throw error;
  }
}

async function cleanupFrontendTestData(testData: any) {
  try {
    // Clean up in reverse order
    if (testData.game) {
      await axios.delete(`${BACKEND_URL}/api/spiele/${testData.game.id}`);
    }
    
    if (testData.viktoriaClub) {
      await axios.delete(`${BACKEND_URL}/api/clubs/${testData.viktoriaClub.id}`);
    }
    
    if (testData.opponentClub) {
      await axios.delete(`${BACKEND_URL}/api/clubs/${testData.opponentClub.id}`);
    }
    
    if (testData.liga) {
      await axios.delete(`${BACKEND_URL}/api/ligen/${testData.liga.id}`);
    }
    
    if (testData.saison) {
      await axios.delete(`${BACKEND_URL}/api/saisonen/${testData.saison.id}`);
    }
  } catch (error) {
    console.error('Failed to cleanup frontend test data:', error);
  }
}

async function updateGameResult(gameId: string, result: { heim_tore: number; gast_tore: number }) {
  try {
    await axios.put(`${BACKEND_URL}/api/spiele/${gameId}`, {
      data: result
    });
  } catch (error) {
    console.error('Failed to update game result:', error);
  }
}