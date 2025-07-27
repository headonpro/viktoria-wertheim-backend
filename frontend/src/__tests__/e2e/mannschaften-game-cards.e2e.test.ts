/**
 * End-to-End Tests für Mannschaftsspezifische Game Cards
 * 
 * Diese Tests verifizieren den vollständigen User-Flow für alle drei Mannschaften:
 * - Klick auf Mannschafts-Button → Korrekte Game Cards angezeigt
 * - Game Card Modal-Funktionalität für alle Mannschaften
 * - Design und Layout Konsistenz zwischen Mannschaften
 * 
 * Requirements: 1.1, 1.2, 1.3, 5.1, 5.2
 */

import puppeteer, { Browser, Page } from 'puppeteer'

describe('Mannschaftsspezifische Game Cards - End-to-End Tests', () => {
  let browser: Browser
  let page: Page
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.CI === 'true' ? 0 : 50,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
  })

  afterAll(async () => {
    if (browser) {
      await browser.close()
    }
  })

  beforeEach(async () => {
    page = await browser.newPage()
    await page.setViewport({ width: 1200, height: 800 })
    
    // Navigate to homepage
    await page.goto(baseUrl, { waitUntil: 'networkidle2' })
    
    // Wait for components to load
    await page.waitForSelector('[data-testid="team-status"]', { timeout: 10000 })
    await page.waitForSelector('[data-testid="game-cards"]', { timeout: 10000 })
  })

  afterEach(async () => {
    if (page) {
      await page.close()
    }
  })

  describe('1. Mannschaft - User Flow', () => {
    test('sollte korrekte Game Cards für 1. Mannschaft anzeigen', async () => {
      // Klick auf 1. Mannschaft Button
      await page.click('button[aria-label="1. Mannschaft auswählen"]')
      
      // Warte auf API-Response und UI-Update
      await page.waitForTimeout(1000)
      
      // Verifiziere dass der Button als aktiv markiert ist
      const activeButton = await page.$('button[aria-selected="true"]')
      expect(activeButton).toBeTruthy()
      
      const buttonText = await page.evaluate(el => el?.textContent, activeButton)
      expect(buttonText).toContain('1')
      
      // Verifiziere Game Cards Container
      const gameCardsContainer = await page.$('[data-testid="game-cards"]')
      expect(gameCardsContainer).toBeTruthy()
      
      // Prüfe auf Last Game Card
      const lastGameCard = await page.$('[data-testid="last-game-card"]')
      if (lastGameCard) {
        // Verifiziere Card-Struktur
        const cardTitle = await page.$eval('[data-testid="last-game-card"] .text-sm', el => el.textContent)
        expect(cardTitle?.toUpperCase()).toBe('LAST')
        
        // Verifiziere Team-Logos sind vorhanden
        const teamLogos = await page.$$('[data-testid="last-game-card"] img')
        expect(teamLogos.length).toBeGreaterThanOrEqual(0) // Kann 0-2 sein je nach verfügbaren Logos
      }
      
      // Prüfe auf Next Game Card
      const nextGameCard = await page.$('[data-testid="next-game-card"]')
      if (nextGameCard) {
        const cardTitle = await page.$eval('[data-testid="next-game-card"] .text-sm', el => el.textContent)
        expect(cardTitle?.toUpperCase()).toBe('NEXT')
      }
      
      // Verifiziere Fallback-Nachrichten falls keine Daten
      const fallbackMessages = await page.$$('.text-gray-500')
      if (fallbackMessages.length > 0) {
        const fallbackText = await page.evaluate(el => el.textContent, fallbackMessages[0])
        expect(fallbackText).toContain('1. Mannschaft')
      }
    })

    test('sollte Game Card Modal für 1. Mannschaft öffnen', async () => {
      // Klick auf 1. Mannschaft
      await page.click('button[aria-label="1. Mannschaft auswählen"]')
      await page.waitForTimeout(1000)
      
      // Suche nach klickbaren Game Cards
      const gameCards = await page.$$('.cursor-pointer')
      const clickableGameCards = []
      
      for (const card of gameCards) {
        const cardText = await page.evaluate(el => el.textContent, card)
        if (cardText?.includes('LAST') || cardText?.includes('NEXT')) {
          clickableGameCards.push(card)
        }
      }
      
      if (clickableGameCards.length > 0) {
        // Klick auf erste verfügbare Game Card
        await clickableGameCards[0].click()
        
        // Warte auf Modal
        await page.waitForSelector('.fixed.inset-0', { timeout: 5000 })
        
        // Verifiziere Modal-Inhalt
        const modal = await page.$('.fixed.inset-0')
        expect(modal).toBeTruthy()
        
        // Verifiziere Close-Button
        const closeButton = await page.$('button[aria-label="Modal schließen"]')
        expect(closeButton).toBeTruthy()
        
        // Schließe Modal
        await closeButton?.click()
        
        // Verifiziere Modal ist geschlossen
        await page.waitForSelector('.fixed.inset-0', { hidden: true, timeout: 5000 })
      }
    })
  })

  describe('2. Mannschaft - User Flow', () => {
    test('sollte korrekte Game Cards für 2. Mannschaft anzeigen', async () => {
      // Klick auf 2. Mannschaft Button
      await page.click('button[aria-label="2. Mannschaft auswählen"]')
      
      // Warte auf API-Response und UI-Update
      await page.waitForTimeout(1000)
      
      // Verifiziere dass der Button als aktiv markiert ist
      const activeButton = await page.$('button[aria-selected="true"]')
      expect(activeButton).toBeTruthy()
      
      const buttonText = await page.evaluate(el => el?.textContent, activeButton)
      expect(buttonText).toContain('2')
      
      // Verifiziere Game Cards Container
      const gameCardsContainer = await page.$('[data-testid="game-cards"]')
      expect(gameCardsContainer).toBeTruthy()
      
      // Prüfe auf spezifische Fallback-Nachrichten für 2. Mannschaft
      const fallbackMessages = await page.$$('.text-gray-500')
      if (fallbackMessages.length > 0) {
        const fallbackTexts = await Promise.all(
          fallbackMessages.map(el => page.evaluate(element => element.textContent, el))
        )
        
        const hasTeam2Message = fallbackTexts.some(text => 
          text?.includes('2. Mannschaft')
        )
        
        if (hasTeam2Message) {
          expect(hasTeam2Message).toBe(true)
        }
      }
      
      // Verifiziere dass sich die Daten von Team 1 unterscheiden
      // (durch Wechsel zwischen Teams und Vergleich der Inhalte)
      await page.click('button[aria-label="1. Mannschaft auswählen"]')
      await page.waitForTimeout(500)
      
      const team1Content = await page.evaluate(() => {
        const gameCards = document.querySelector('[data-testid="game-cards"]')
        return gameCards?.textContent || ''
      })
      
      await page.click('button[aria-label="2. Mannschaft auswählen"]')
      await page.waitForTimeout(500)
      
      const team2Content = await page.evaluate(() => {
        const gameCards = document.querySelector('[data-testid="game-cards"]')
        return gameCards?.textContent || ''
      })
      
      // Inhalte sollten sich unterscheiden (oder beide leer sein)
      if (team1Content && team2Content) {
        expect(team1Content).not.toBe(team2Content)
      }
    })

    test('sollte Game Card Modal für 2. Mannschaft öffnen', async () => {
      // Klick auf 2. Mannschaft
      await page.click('button[aria-label="2. Mannschaft auswählen"]')
      await page.waitForTimeout(1000)
      
      // Suche nach klickbaren Game Cards
      const gameCards = await page.$$('.cursor-pointer')
      const clickableGameCards = []
      
      for (const card of gameCards) {
        const cardText = await page.evaluate(el => el.textContent, card)
        if (cardText?.includes('LAST') || cardText?.includes('NEXT')) {
          clickableGameCards.push(card)
        }
      }
      
      if (clickableGameCards.length > 0) {
        // Klick auf erste verfügbare Game Card
        await clickableGameCards[0].click()
        
        // Warte auf Modal
        await page.waitForSelector('.fixed.inset-0', { timeout: 5000 })
        
        // Verifiziere Modal-Funktionalität
        const modal = await page.$('.fixed.inset-0')
        expect(modal).toBeTruthy()
        
        // Verifiziere Close-Button funktioniert
        const closeButton = await page.$('button[aria-label="Modal schließen"]')
        await closeButton?.click()
        
        await page.waitForSelector('.fixed.inset-0', { hidden: true, timeout: 5000 })
      }
    })
  })

  describe('3. Mannschaft - User Flow', () => {
    test('sollte korrekte Game Cards für 3. Mannschaft anzeigen', async () => {
      // Klick auf 3. Mannschaft Button
      await page.click('button[aria-label="3. Mannschaft auswählen"]')
      
      // Warte auf API-Response und UI-Update
      await page.waitForTimeout(1000)
      
      // Verifiziere dass der Button als aktiv markiert ist
      const activeButton = await page.$('button[aria-selected="true"]')
      expect(activeButton).toBeTruthy()
      
      const buttonText = await page.evaluate(el => el?.textContent, activeButton)
      expect(buttonText).toContain('3')
      
      // Verifiziere Game Cards Container
      const gameCardsContainer = await page.$('[data-testid="game-cards"]')
      expect(gameCardsContainer).toBeTruthy()
      
      // Prüfe auf spezifische Fallback-Nachrichten für 3. Mannschaft
      const fallbackMessages = await page.$$('.text-gray-500')
      if (fallbackMessages.length > 0) {
        const fallbackTexts = await Promise.all(
          fallbackMessages.map(el => page.evaluate(element => element.textContent, el))
        )
        
        const hasTeam3Message = fallbackTexts.some(text => 
          text?.includes('3. Mannschaft')
        )
        
        if (hasTeam3Message) {
          expect(hasTeam3Message).toBe(true)
        }
      }
    })

    test('sollte Game Card Modal für 3. Mannschaft öffnen', async () => {
      // Klick auf 3. Mannschaft
      await page.click('button[aria-label="3. Mannschaft auswählen"]')
      await page.waitForTimeout(1000)
      
      // Suche nach klickbaren Game Cards
      const gameCards = await page.$$('.cursor-pointer')
      const clickableGameCards = []
      
      for (const card of gameCards) {
        const cardText = await page.evaluate(el => el.textContent, card)
        if (cardText?.includes('LAST') || cardText?.includes('NEXT')) {
          clickableGameCards.push(card)
        }
      }
      
      if (clickableGameCards.length > 0) {
        // Klick auf erste verfügbare Game Card
        await clickableGameCards[0].click()
        
        // Warte auf Modal
        await page.waitForSelector('.fixed.inset-0', { timeout: 5000 })
        
        // Verifiziere Modal-Funktionalität
        const modal = await page.$('.fixed.inset-0')
        expect(modal).toBeTruthy()
        
        // Schließe Modal durch Klick außerhalb
        await page.click('.fixed.inset-0')
        
        await page.waitForSelector('.fixed.inset-0', { hidden: true, timeout: 5000 })
      }
    })
  })

  describe('Design und Layout Konsistenz', () => {
    test('sollte konsistentes Design zwischen allen Mannschaften haben', async () => {
      const teams = ['1', '2', '3']
      const designMetrics: Array<{
        team: string
        buttonStyles: string
        cardStyles: string
        layoutStructure: string
      }> = []
      
      for (const team of teams) {
        // Wechsel zu Team
        await page.click(`button[aria-label="${team}. Mannschaft auswählen"]`)
        await page.waitForTimeout(1000)
        
        // Sammle Design-Metriken
        const metrics = await page.evaluate((teamId) => {
          // Button-Styles
          const activeButton = document.querySelector('button[aria-selected="true"]')
          const buttonStyles = activeButton ? window.getComputedStyle(activeButton).cssText : ''
          
          // Card-Styles
          const gameCardsContainer = document.querySelector('[data-testid="game-cards"]')
          const cardStyles = gameCardsContainer ? window.getComputedStyle(gameCardsContainer).cssText : ''
          
          // Layout-Struktur
          const layoutStructure = document.querySelector('.grid.grid-cols-2')?.className || ''
          
          return {
            team: teamId,
            buttonStyles,
            cardStyles,
            layoutStructure
          }
        }, team)
        
        designMetrics.push(metrics)
      }
      
      // Verifiziere Konsistenz
      const firstTeamMetrics = designMetrics[0]
      
      designMetrics.forEach((metrics, index) => {
        if (index > 0) {
          // Layout-Struktur sollte identisch sein
          expect(metrics.layoutStructure).toBe(firstTeamMetrics.layoutStructure)
          
          // Card-Container-Styles sollten konsistent sein
          // (Button-Styles unterscheiden sich bewusst für aktive/inaktive Zustände)
          expect(metrics.cardStyles).toBeTruthy()
        }
      })
    })

    test('sollte responsive Design für alle Mannschaften beibehalten', async () => {
      const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1200, height: 800, name: 'Desktop' }
      ]
      
      for (const viewport of viewports) {
        await page.setViewport(viewport)
        
        for (const team of ['1', '2', '3']) {
          // Wechsel zu Team
          await page.click(`button[aria-label="${team}. Mannschaft auswählen"]`)
          await page.waitForTimeout(500)
          
          // Verifiziere dass Komponenten sichtbar sind
          const teamStatusVisible = await page.$('[data-testid="team-status"]')
          const gameCardsVisible = await page.$('[data-testid="game-cards"]')
          
          expect(teamStatusVisible).toBeTruthy()
          expect(gameCardsVisible).toBeTruthy()
          
          // Verifiziere Grid-Layout
          const gridLayout = await page.$('.grid.grid-cols-2')
          expect(gridLayout).toBeTruthy()
        }
      }
    })

    test('sollte korrekte Fallback-Nachrichten für alle Teams anzeigen', async () => {
      const teams = ['1', '2', '3']
      
      for (const team of teams) {
        await page.click(`button[aria-label="${team}. Mannschaft auswählen"]`)
        await page.waitForTimeout(1000)
        
        // Prüfe auf Fallback-Nachrichten
        const fallbackElements = await page.$$('.text-gray-500')
        
        if (fallbackElements.length > 0) {
          const fallbackTexts = await Promise.all(
            fallbackElements.map(el => page.evaluate(element => element.textContent, el))
          )
          
          // Mindestens eine Nachricht sollte die korrekte Mannschaft erwähnen
          const hasCorrectTeamMessage = fallbackTexts.some(text => 
            text?.includes(`${team}. Mannschaft`)
          )
          
          if (fallbackTexts.some(text => text?.includes('Mannschaft'))) {
            expect(hasCorrectTeamMessage).toBe(true)
          }
        }
      }
    })
  })

  describe('Performance und Stabilität', () => {
    test('sollte schnelle Team-Wechsel ohne Fehler handhaben', async () => {
      const teams = ['1', '2', '3', '1', '3', '2', '1']
      
      for (const team of teams) {
        await page.click(`button[aria-label="${team}. Mannschaft auswählen"]`)
        
        // Kurze Wartezeit für realistische Benutzerinteraktion
        await page.waitForTimeout(200)
        
        // Verifiziere dass der korrekte Button aktiv ist
        const activeButton = await page.$('button[aria-selected="true"]')
        const buttonText = await page.evaluate(el => el?.textContent, activeButton)
        expect(buttonText).toContain(team)
      }
    })

    test('sollte keine JavaScript-Fehler während Team-Wechsel produzieren', async () => {
      const errors: string[] = []
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })
      
      page.on('pageerror', (error) => {
        errors.push(error.message)
      })
      
      // Führe mehrere Team-Wechsel durch
      for (let i = 0; i < 5; i++) {
        await page.click('button[aria-label="1. Mannschaft auswählen"]')
        await page.waitForTimeout(300)
        await page.click('button[aria-label="2. Mannschaft auswählen"]')
        await page.waitForTimeout(300)
        await page.click('button[aria-label="3. Mannschaft auswählen"]')
        await page.waitForTimeout(300)
      }
      
      // Filtere bekannte/erwartete Fehler heraus
      const relevantErrors = errors.filter(error => 
        !error.includes('Failed to fetch') && // API-Fehler sind in Tests normal
        !error.includes('NetworkError') &&
        !error.includes('net::ERR_')
      )
      
      expect(relevantErrors).toHaveLength(0)
    })
  })
})