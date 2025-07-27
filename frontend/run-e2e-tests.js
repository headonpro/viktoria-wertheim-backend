#!/usr/bin/env node

/**
 * E2E Test Runner für Mannschaftsspezifische Game Cards
 * 
 * Dieses Script führt die End-to-End Tests aus und erstellt einen Bericht
 */

const puppeteer = require('puppeteer')
const path = require('path')

// Test-Konfiguration
const config = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  headless: process.env.CI === 'true',
  slowMo: process.env.CI === 'true' ? 0 : 100,
  timeout: 30000
}

// Test-Ergebnisse
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
}

// Utility-Funktionen
const log = (message) => {
  console.log(`[E2E] ${message}`)
}

const logError = (message, error) => {
  console.error(`[E2E ERROR] ${message}`, error)
  testResults.errors.push({ message, error: error.message })
}

const logSuccess = (message) => {
  console.log(`[E2E SUCCESS] ${message}`)
  testResults.passed++
}

const logFailure = (message) => {
  console.error(`[E2E FAILURE] ${message}`)
  testResults.failed++
}

// Test-Implementierungen
class E2ETestSuite {
  constructor() {
    this.browser = null
    this.page = null
  }

  async setup() {
    try {
      this.browser = await puppeteer.launch({
        headless: config.headless,
        slowMo: config.slowMo,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      this.page = await this.browser.newPage()
      await this.page.setViewport({ width: 1200, height: 800 })
      
      // Navigate to homepage
      log('Navigating to homepage...')
      await this.page.goto(config.baseUrl, { waitUntil: 'networkidle2', timeout: config.timeout })
      
      // Wait for components to load
      await this.page.waitForSelector('[data-testid="team-status"]', { timeout: 10000 })
      await this.page.waitForSelector('[data-testid="game-cards"]', { timeout: 10000 })
      
      log('Setup completed successfully')
    } catch (error) {
      logError('Setup failed', error)
      throw error
    }
  }

  async cleanup() {
    if (this.page) {
      await this.page.close()
    }
    if (this.browser) {
      await this.browser.close()
    }
  }

  async testTeamSelection(teamNumber) {
    try {
      log(`Testing team ${teamNumber} selection...`)
      
      // Klick auf Team-Button
      await this.page.click(`button[aria-label="${teamNumber}. Mannschaft auswählen"]`)
      await this.page.waitForTimeout(1000)
      
      // Verifiziere aktiven Button
      const activeButton = await this.page.$('button[aria-selected="true"]')
      if (!activeButton) {
        throw new Error(`No active button found for team ${teamNumber}`)
      }
      
      const buttonText = await this.page.evaluate(el => el?.textContent, activeButton)
      if (!buttonText?.includes(teamNumber)) {
        throw new Error(`Button text "${buttonText}" does not contain team number ${teamNumber}`)
      }
      
      // Verifiziere Game Cards Container
      const gameCardsContainer = await this.page.$('[data-testid="game-cards"]')
      if (!gameCardsContainer) {
        throw new Error('Game cards container not found')
      }
      
      // Prüfe auf Fallback-Nachrichten oder echte Daten
      const fallbackMessages = await this.page.$$('.text-gray-500')
      if (fallbackMessages.length > 0) {
        const fallbackTexts = await Promise.all(
          fallbackMessages.map(el => this.page.evaluate(element => element.textContent, el))
        )
        
        const hasTeamMessage = fallbackTexts.some(text => 
          text?.includes(`${teamNumber}. Mannschaft`)
        )
        
        if (fallbackTexts.some(text => text?.includes('Mannschaft')) && !hasTeamMessage) {
          throw new Error(`Fallback message does not contain correct team number ${teamNumber}`)
        }
      }
      
      logSuccess(`Team ${teamNumber} selection test passed`)
      testResults.details.push({
        test: `Team ${teamNumber} Selection`,
        status: 'PASSED',
        details: 'Button activation and content loading verified'
      })
      
    } catch (error) {
      logFailure(`Team ${teamNumber} selection test failed: ${error.message}`)
      testResults.details.push({
        test: `Team ${teamNumber} Selection`,
        status: 'FAILED',
        error: error.message
      })
    }
  }

  async testGameCardModal(teamNumber) {
    try {
      log(`Testing game card modal for team ${teamNumber}...`)
      
      // Wechsel zu Team
      await this.page.click(`button[aria-label="${teamNumber}. Mannschaft auswählen"]`)
      await this.page.waitForTimeout(1000)
      
      // Suche nach klickbaren Game Cards
      const gameCards = await this.page.$$('.cursor-pointer')
      const clickableGameCards = []
      
      for (const card of gameCards) {
        const cardText = await this.page.evaluate(el => el.textContent, card)
        if (cardText?.includes('LAST') || cardText?.includes('NEXT')) {
          clickableGameCards.push(card)
        }
      }
      
      if (clickableGameCards.length > 0) {
        // Klick auf erste verfügbare Game Card
        await clickableGameCards[0].click()
        
        // Warte auf Modal
        await this.page.waitForSelector('.fixed.inset-0', { timeout: 5000 })
        
        // Verifiziere Modal-Inhalt
        const modal = await this.page.$('.fixed.inset-0')
        if (!modal) {
          throw new Error('Modal not found after clicking game card')
        }
        
        // Verifiziere Close-Button
        const closeButton = await this.page.$('button[aria-label="Modal schließen"]')
        if (!closeButton) {
          throw new Error('Close button not found in modal')
        }
        
        // Schließe Modal
        await closeButton.click()
        
        // Verifiziere Modal ist geschlossen
        await this.page.waitForSelector('.fixed.inset-0', { hidden: true, timeout: 5000 })
        
        logSuccess(`Game card modal test for team ${teamNumber} passed`)
        testResults.details.push({
          test: `Team ${teamNumber} Modal`,
          status: 'PASSED',
          details: 'Modal opening and closing verified'
        })
      } else {
        log(`No clickable game cards found for team ${teamNumber} - skipping modal test`)
        testResults.details.push({
          test: `Team ${teamNumber} Modal`,
          status: 'SKIPPED',
          details: 'No clickable game cards available'
        })
      }
      
    } catch (error) {
      logFailure(`Game card modal test for team ${teamNumber} failed: ${error.message}`)
      testResults.details.push({
        test: `Team ${teamNumber} Modal`,
        status: 'FAILED',
        error: error.message
      })
    }
  }

  async testDesignConsistency() {
    try {
      log('Testing design consistency across teams...')
      
      const teams = ['1', '2', '3']
      const designMetrics = []
      
      for (const team of teams) {
        await this.page.click(`button[aria-label="${team}. Mannschaft auswählen"]`)
        await this.page.waitForTimeout(1000)
        
        const metrics = await this.page.evaluate((teamId) => {
          const activeButton = document.querySelector('button[aria-selected="true"]')
          const gameCardsContainer = document.querySelector('[data-testid="game-cards"]')
          const layoutStructure = document.querySelector('.grid.grid-cols-2')?.className || ''
          
          return {
            team: teamId,
            hasActiveButton: !!activeButton,
            hasGameCards: !!gameCardsContainer,
            layoutStructure
          }
        }, team)
        
        designMetrics.push(metrics)
      }
      
      // Verifiziere Konsistenz
      const firstTeamMetrics = designMetrics[0]
      let consistencyErrors = []
      
      designMetrics.forEach((metrics, index) => {
        if (index > 0) {
          if (metrics.layoutStructure !== firstTeamMetrics.layoutStructure) {
            consistencyErrors.push(`Team ${metrics.team} has different layout structure`)
          }
          if (metrics.hasGameCards !== firstTeamMetrics.hasGameCards) {
            consistencyErrors.push(`Team ${metrics.team} has different game cards presence`)
          }
        }
      })
      
      if (consistencyErrors.length > 0) {
        throw new Error(`Design consistency issues: ${consistencyErrors.join(', ')}`)
      }
      
      logSuccess('Design consistency test passed')
      testResults.details.push({
        test: 'Design Consistency',
        status: 'PASSED',
        details: 'Layout structure consistent across all teams'
      })
      
    } catch (error) {
      logFailure(`Design consistency test failed: ${error.message}`)
      testResults.details.push({
        test: 'Design Consistency',
        status: 'FAILED',
        error: error.message
      })
    }
  }

  async testResponsiveDesign() {
    try {
      log('Testing responsive design...')
      
      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1200, height: 800, name: 'Desktop' }
      ]
      
      for (const viewport of viewports) {
        await this.page.setViewport(viewport)
        
        // Test mit Team 1
        await this.page.click('button[aria-label="1. Mannschaft auswählen"]')
        await this.page.waitForTimeout(500)
        
        // Verifiziere dass Komponenten sichtbar sind
        const teamStatusVisible = await this.page.$('[data-testid="team-status"]')
        const gameCardsVisible = await this.page.$('[data-testid="game-cards"]')
        const gridLayout = await this.page.$('.grid.grid-cols-2')
        
        if (!teamStatusVisible || !gameCardsVisible || !gridLayout) {
          throw new Error(`Components not visible on ${viewport.name} (${viewport.width}x${viewport.height})`)
        }
      }
      
      logSuccess('Responsive design test passed')
      testResults.details.push({
        test: 'Responsive Design',
        status: 'PASSED',
        details: 'Components visible and functional across all viewport sizes'
      })
      
    } catch (error) {
      logFailure(`Responsive design test failed: ${error.message}`)
      testResults.details.push({
        test: 'Responsive Design',
        status: 'FAILED',
        error: error.message
      })
    }
  }

  async runAllTests() {
    try {
      await this.setup()
      
      // Test alle drei Teams
      for (const team of ['1', '2', '3']) {
        await this.testTeamSelection(team)
        await this.testGameCardModal(team)
      }
      
      // Test Design-Konsistenz
      await this.testDesignConsistency()
      
      // Test Responsive Design
      await this.testResponsiveDesign()
      
    } catch (error) {
      logError('Test suite execution failed', error)
    } finally {
      await this.cleanup()
    }
  }
}

// Haupt-Ausführung
async function main() {
  log('Starting E2E tests for Mannschaftsspezifische Game Cards...')
  
  const testSuite = new E2ETestSuite()
  await testSuite.runAllTests()
  
  // Ergebnisse ausgeben
  console.log('\n' + '='.repeat(60))
  console.log('E2E TEST RESULTS')
  console.log('='.repeat(60))
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`)
  console.log(`Passed: ${testResults.passed}`)
  console.log(`Failed: ${testResults.failed}`)
  
  if (testResults.details.length > 0) {
    console.log('\nDetailed Results:')
    testResults.details.forEach(detail => {
      const status = detail.status === 'PASSED' ? '✅' : 
                    detail.status === 'FAILED' ? '❌' : '⏭️'
      console.log(`${status} ${detail.test}: ${detail.details || detail.error || 'No details'}`)
    })
  }
  
  if (testResults.errors.length > 0) {
    console.log('\nErrors:')
    testResults.errors.forEach(error => {
      console.log(`❌ ${error.message}: ${error.error}`)
    })
  }
  
  console.log('='.repeat(60))
  
  // Exit mit entsprechendem Code
  process.exit(testResults.failed > 0 ? 1 : 0)
}

// Führe Tests aus
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { E2ETestSuite }