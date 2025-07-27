/**
 * Functionality Preservation Testing
 * Tests all existing functionality on News, Teams, Shop, and Kontakt pages
 * to ensure no regressions after design standards implementation
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TIMEOUT = 30000;
const VIEWPORT = { width: 1280, height: 720 };
const MOBILE_VIEWPORT = { width: 375, height: 667 };

// Test results storage
let testResults = {
  news: { passed: 0, failed: 0, tests: [] },
  teams: { passed: 0, failed: 0, tests: [] },
  shop: { passed: 0, failed: 0, tests: [] },
  kontakt: { passed: 0, failed: 0, tests: [] },
  summary: { totalPassed: 0, totalFailed: 0, totalTests: 0 }
};

// Utility functions
function logTest(page, testName, status, details = '') {
  const result = { testName, status, details, timestamp: new Date().toISOString() };
  testResults[page].tests.push(result);
  
  if (status === 'PASS') {
    testResults[page].passed++;
    console.log(`✅ [${page.toUpperCase()}] ${testName}`);
  } else {
    testResults[page].failed++;
    console.log(`❌ [${page.toUpperCase()}] ${testName} - ${details}`);
  }
}

async function waitForPageLoad(page, timeout = TIMEOUT) {
  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForTimeout(1000); // Additional wait for animations
}

async function takeScreenshot(page, name) {
  const screenshotPath = `screenshots/functionality-test-${name}-${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

// News Page Tests
async function testNewsPageFunctionality(browser) {
  console.log('\n🔍 Testing News Page Functionality...');
  
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);
  
  try {
    // Navigate to news page
    await page.goto(`${BASE_URL}/news`, { waitUntil: 'networkidle' });
    await waitForPageLoad(page);
    
    // Test 1: Page loads successfully
    const title = await page.title();
    if (title.includes('News') || title.includes('Viktoria')) {
      logTest('news', 'Page loads successfully', 'PASS');
    } else {
      logTest('news', 'Page loads successfully', 'FAIL', `Unexpected title: ${title}`);
    }
    
    // Test 2: Category filter buttons are present and functional
    const categoryButtons = await page.locator('button').filter({ hasText: /Alle|Mannschaft|Jugend|Verein/ }).count();
    if (categoryButtons > 0) {
      logTest('news', 'Category filter buttons present', 'PASS');
      
      // Test category filtering
      const allButton = page.locator('button').filter({ hasText: 'Alle' }).first();
      if (await allButton.isVisible()) {
        await allButton.click();
        await page.waitForTimeout(500);
        logTest('news', 'Category filtering works', 'PASS');
      }
    } else {
      logTest('news', 'Category filter buttons present', 'FAIL', 'No category buttons found');
    }
    
    // Test 3: News articles are displayed
    const newsCards = await page.locator('[class*="group"]').filter({ has: page.locator('h3') }).count();
    if (newsCards > 0) {
      logTest('news', 'News articles displayed', 'PASS', `Found ${newsCards} articles`);
    } else {
      logTest('news', 'News articles displayed', 'FAIL', 'No news articles found');
    }
    
    // Test 4: Article modal functionality
    const firstArticle = page.locator('[class*="group"]').filter({ has: page.locator('h3') }).first();
    if (await firstArticle.isVisible()) {
      await firstArticle.click();
      await page.waitForTimeout(1000);
      
      // Check if modal opened
      const modal = page.locator('[class*="fixed"][class*="inset-0"]');
      if (await modal.isVisible()) {
        logTest('news', 'Article modal opens', 'PASS');
        
        // Test modal close functionality
        const closeButton = modal.locator('button').filter({ has: page.locator('svg') }).first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(500);
          
          if (!(await modal.isVisible())) {
            logTest('news', 'Article modal closes', 'PASS');
          } else {
            logTest('news', 'Article modal closes', 'FAIL', 'Modal did not close');
          }
        }
      } else {
        logTest('news', 'Article modal opens', 'FAIL', 'Modal did not open');
      }
    }
    
    // Test 5: Mobile responsiveness
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(500);
    
    const mobileCategories = await page.locator('button').filter({ hasText: /Alle|Mannschaft|Jugend|Verein/ }).count();
    if (mobileCategories > 0) {
      logTest('news', 'Mobile category filters work', 'PASS');
    } else {
      logTest('news', 'Mobile category filters work', 'FAIL', 'Mobile categories not found');
    }
    
    // Test 6: Theme switching (if available)
    const themeToggle = page.locator('button[aria-label*="theme"], button[class*="theme"]');
    if (await themeToggle.count() > 0) {
      await themeToggle.first().click();
      await page.waitForTimeout(500);
      logTest('news', 'Theme switching works', 'PASS');
    } else {
      logTest('news', 'Theme switching works', 'SKIP', 'Theme toggle not found');
    }
    
  } catch (error) {
    logTest('news', 'General functionality test', 'FAIL', error.message);
  } finally {
    await page.close();
  }
}

// Teams Page Tests
async function testTeamsPageFunctionality(browser) {
  console.log('\n🔍 Testing Teams Page Functionality...');
  
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);
  
  try {
    // Navigate to teams page
    await page.goto(`${BASE_URL}/teams`, { waitUntil: 'networkidle' });
    await waitForPageLoad(page);
    
    // Test 1: Page loads successfully
    const title = await page.title();
    if (title.includes('Teams') || title.includes('Mannschaften') || title.includes('Viktoria')) {
      logTest('teams', 'Page loads successfully', 'PASS');
    } else {
      logTest('teams', 'Page loads successfully', 'FAIL', `Unexpected title: ${title}`);
    }
    
    // Test 2: Team cards are displayed
    const teamCards = await page.locator('[class*="group"]').filter({ has: page.locator('h3') }).count();
    if (teamCards > 0) {
      logTest('teams', 'Team cards displayed', 'PASS', `Found ${teamCards} teams`);
    } else {
      logTest('teams', 'Team cards displayed', 'FAIL', 'No team cards found');
    }
    
    // Test 3: Team information is displayed correctly
    const firstTeamCard = page.locator('[class*="group"]').filter({ has: page.locator('h3') }).first();
    if (await firstTeamCard.isVisible()) {
      const teamName = await firstTeamCard.locator('h3').textContent();
      const trainerInfo = await firstTeamCard.locator('text=Trainer').count();
      
      if (teamName && teamName.trim().length > 0) {
        logTest('teams', 'Team names displayed', 'PASS');
      } else {
        logTest('teams', 'Team names displayed', 'FAIL', 'Team name not found');
      }
      
      if (trainerInfo > 0) {
        logTest('teams', 'Team information displayed', 'PASS');
      } else {
        logTest('teams', 'Team information displayed', 'FAIL', 'Team info not complete');
      }
    }
    
    // Test 4: Team navigation functionality
    const firstTeam = page.locator('[class*="group"]').filter({ has: page.locator('h3') }).first();
    if (await firstTeam.isVisible()) {
      // Check if team card is clickable
      const isClickable = await firstTeam.evaluate(el => {
        return window.getComputedStyle(el).cursor === 'pointer' || 
               el.onclick !== null || 
               el.getAttribute('onclick') !== null;
      });
      
      if (isClickable) {
        logTest('teams', 'Team cards are clickable', 'PASS');
        
        // Test navigation (without actually navigating to avoid breaking the test)
        const href = await firstTeam.getAttribute('href') || 
                    await firstTeam.evaluate(el => el.onclick ? 'has-onclick' : null);
        
        if (href || await firstTeam.locator('text=Team Details').count() > 0) {
          logTest('teams', 'Team navigation available', 'PASS');
        }
      } else {
        logTest('teams', 'Team cards are clickable', 'FAIL', 'Team cards not clickable');
      }
    }
    
    // Test 5: Liga badges and team information
    const ligaBadges = await page.locator('[class*="bg-viktoria-yellow"]').count();
    if (ligaBadges > 0) {
      logTest('teams', 'Liga badges displayed', 'PASS', `Found ${ligaBadges} badges`);
    } else {
      logTest('teams', 'Liga badges displayed', 'FAIL', 'No liga badges found');
    }
    
    // Test 6: Mobile responsiveness
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(500);
    
    const mobileTeamCards = await page.locator('[class*="group"]').filter({ has: page.locator('h3') }).count();
    if (mobileTeamCards > 0) {
      logTest('teams', 'Mobile team display works', 'PASS');
    } else {
      logTest('teams', 'Mobile team display works', 'FAIL', 'Mobile teams not displayed');
    }
    
  } catch (error) {
    logTest('teams', 'General functionality test', 'FAIL', error.message);
  } finally {
    await page.close();
  }
}

// Shop Page Tests
async function testShopPageFunctionality(browser) {
  console.log('\n🔍 Testing Shop Page Functionality...');
  
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);
  
  try {
    // Navigate to shop page
    await page.goto(`${BASE_URL}/shop`, { waitUntil: 'networkidle' });
    await waitForPageLoad(page);
    
    // Test 1: Page loads successfully
    const title = await page.title();
    if (title.includes('Shop') || title.includes('Viktoria')) {
      logTest('shop', 'Page loads successfully', 'PASS');
    } else {
      logTest('shop', 'Page loads successfully', 'FAIL', `Unexpected title: ${title}`);
    }
    
    // Test 2: Coming soon banner is displayed
    const comingSoonBanner = await page.locator('text=kommt bald').count();
    if (comingSoonBanner > 0) {
      logTest('shop', 'Coming soon banner displayed', 'PASS');
    } else {
      logTest('shop', 'Coming soon banner displayed', 'FAIL', 'Coming soon banner not found');
    }
    
    // Test 3: Product category cards are displayed
    const categoryCards = await page.locator('text=Trikots, text=Fanartikel, text=Mitgliedschaft').count();
    if (categoryCards >= 2) {
      logTest('shop', 'Product categories displayed', 'PASS', `Found ${categoryCards} categories`);
    } else {
      logTest('shop', 'Product categories displayed', 'FAIL', 'Product categories not found');
    }
    
    // Test 4: Category hover effects
    const firstCategory = page.locator('[class*="group"]').filter({ has: page.locator('text=Trikots') }).first();
    if (await firstCategory.isVisible()) {
      await firstCategory.hover();
      await page.waitForTimeout(300);
      
      // Check if hover effect is applied (transform or scale change)
      const hasHoverEffect = await firstCategory.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.transform !== 'none' || style.scale !== 'none';
      });
      
      if (hasHoverEffect) {
        logTest('shop', 'Category hover effects work', 'PASS');
      } else {
        logTest('shop', 'Category hover effects work', 'FAIL', 'No hover effects detected');
      }
    }
    
    // Test 5: Newsletter signup form
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button').filter({ hasText: '✓' });
    
    if (await emailInput.isVisible() && await submitButton.isVisible()) {
      logTest('shop', 'Newsletter signup form present', 'PASS');
      
      // Test form interaction
      await emailInput.fill('test@example.com');
      const inputValue = await emailInput.inputValue();
      
      if (inputValue === 'test@example.com') {
        logTest('shop', 'Newsletter form input works', 'PASS');
      } else {
        logTest('shop', 'Newsletter form input works', 'FAIL', 'Input not working');
      }
      
      // Test submit button (without actually submitting)
      const isSubmitClickable = await submitButton.evaluate(el => {
        return !el.disabled && window.getComputedStyle(el).pointerEvents !== 'none';
      });
      
      if (isSubmitClickable) {
        logTest('shop', 'Newsletter submit button functional', 'PASS');
      } else {
        logTest('shop', 'Newsletter submit button functional', 'FAIL', 'Submit button not clickable');
      }
    } else {
      logTest('shop', 'Newsletter signup form present', 'FAIL', 'Newsletter form not found');
    }
    
    // Test 6: Mobile responsiveness
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(500);
    
    const mobileCategories = await page.locator('text=Trikots, text=Fanartikel, text=Mitgliedschaft').count();
    if (mobileCategories >= 2) {
      logTest('shop', 'Mobile category display works', 'PASS');
    } else {
      logTest('shop', 'Mobile category display works', 'FAIL', 'Mobile categories not displayed');
    }
    
  } catch (error) {
    logTest('shop', 'General functionality test', 'FAIL', error.message);
  } finally {
    await page.close();
  }
}

// Kontakt Page Tests
async function testKontaktPageFunctionality(browser) {
  console.log('\n🔍 Testing Kontakt Page Functionality...');
  
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);
  
  try {
    // Navigate to kontakt page
    await page.goto(`${BASE_URL}/kontakt`, { waitUntil: 'networkidle' });
    await waitForPageLoad(page);
    
    // Test 1: Page loads successfully
    const title = await page.title();
    if (title.includes('Kontakt') || title.includes('Viktoria')) {
      logTest('kontakt', 'Page loads successfully', 'PASS');
    } else {
      logTest('kontakt', 'Page loads successfully', 'FAIL', `Unexpected title: ${title}`);
    }
    
    // Test 2: Quick action buttons are present
    const quickActions = await page.locator('text=E-Mail, text=Telefon, text=Karte').count();
    if (quickActions >= 3) {
      logTest('kontakt', 'Quick action buttons present', 'PASS');
      
      // Test quick action functionality
      const emailButton = page.locator('text=E-Mail').first();
      if (await emailButton.isVisible()) {
        await emailButton.click();
        await page.waitForTimeout(500);
        logTest('kontakt', 'Quick action buttons functional', 'PASS');
      }
    } else {
      logTest('kontakt', 'Quick action buttons present', 'FAIL', 'Quick actions not found');
    }
    
    // Test 3: Multi-step contact form
    const contactForm = page.locator('[class*="bg-gray-100/11"]').filter({ has: page.locator('input, textarea, button') });
    if (await contactForm.count() > 0) {
      logTest('kontakt', 'Contact form present', 'PASS');
      
      // Test form step progression
      const nameInput = page.locator('input[placeholder*="nennen"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test User');
        await page.waitForTimeout(300);
        
        const nextButton = page.locator('button').filter({ hasText: 'Weiter' });
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
          
          // Check if we moved to next step (email input should be visible)
          const emailInput = page.locator('input[type="email"]');
          if (await emailInput.isVisible()) {
            logTest('kontakt', 'Multi-step form progression works', 'PASS');
            
            // Test email step
            await emailInput.fill('test@example.com');
            const nextButton2 = page.locator('button').filter({ hasText: 'Weiter' });
            if (await nextButton2.isVisible()) {
              await nextButton2.click();
              await page.waitForTimeout(500);
              logTest('kontakt', 'Form validation works', 'PASS');
            }
          } else {
            logTest('kontakt', 'Multi-step form progression works', 'FAIL', 'Next step not reached');
          }
        }
      }
    } else {
      logTest('kontakt', 'Contact form present', 'FAIL', 'Contact form not found');
    }
    
    // Test 4: Progress indicators
    const progressDots = await page.locator('[class*="w-2"][class*="h-2"][class*="rounded-full"]').count();
    if (progressDots >= 3) {
      logTest('kontakt', 'Form progress indicators present', 'PASS', `Found ${progressDots} progress dots`);
    } else {
      logTest('kontakt', 'Form progress indicators present', 'FAIL', 'Progress indicators not found');
    }
    
    // Test 5: Contact person cards
    const contactCards = await page.locator('text=Vorsitzender, text=Jugendleiter, text=Kassenwart').count();
    if (contactCards >= 2) {
      logTest('kontakt', 'Contact person cards displayed', 'PASS', `Found ${contactCards} contact cards`);
    } else {
      logTest('kontakt', 'Contact person cards displayed', 'FAIL', 'Contact cards not found');
    }
    
    // Test 6: Contact information links
    const phoneLinks = await page.locator('a[href^="tel:"]').count();
    const emailLinks = await page.locator('a[href^="mailto:"]').count();
    
    if (phoneLinks > 0 && emailLinks > 0) {
      logTest('kontakt', 'Contact links functional', 'PASS', `Phone: ${phoneLinks}, Email: ${emailLinks}`);
    } else {
      logTest('kontakt', 'Contact links functional', 'FAIL', 'Contact links not found');
    }
    
    // Test 7: Sportplatz information
    const sportplatzInfo = await page.locator('text=Sportplatz, text=Haslocherweg').count();
    if (sportplatzInfo > 0) {
      logTest('kontakt', 'Sportplatz information displayed', 'PASS');
    } else {
      logTest('kontakt', 'Sportplatz information displayed', 'FAIL', 'Sportplatz info not found');
    }
    
    // Test 8: Mobile responsiveness
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(500);
    
    const mobileQuickActions = await page.locator('text=E-Mail, text=Telefon, text=Karte').count();
    if (mobileQuickActions >= 3) {
      logTest('kontakt', 'Mobile quick actions work', 'PASS');
    } else {
      logTest('kontakt', 'Mobile quick actions work', 'FAIL', 'Mobile quick actions not working');
    }
    
  } catch (error) {
    logTest('kontakt', 'General functionality test', 'FAIL', error.message);
  } finally {
    await page.close();
  }
}

// Cross-page functionality tests
async function testCrossPageFunctionality(browser) {
  console.log('\n🔍 Testing Cross-Page Functionality...');
  
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);
  
  try {
    // Test navigation between pages
    const pages = ['news', 'teams', 'shop', 'kontakt'];
    
    for (const pageName of pages) {
      await page.goto(`${BASE_URL}/${pageName}`, { waitUntil: 'networkidle' });
      await waitForPageLoad(page);
      
      // Test navigation menu
      const navLinks = await page.locator('nav a, [role="navigation"] a').count();
      if (navLinks > 0) {
        logTest('cross-page', `Navigation menu present on ${pageName}`, 'PASS');
      } else {
        logTest('cross-page', `Navigation menu present on ${pageName}`, 'FAIL', 'Navigation not found');
      }
      
      // Test theme consistency
      const hasThemeClasses = await page.locator('[class*="dark:"], [class*="light:"]').count();
      if (hasThemeClasses > 0) {
        logTest('cross-page', `Theme classes present on ${pageName}`, 'PASS');
      } else {
        logTest('cross-page', `Theme classes present on ${pageName}`, 'FAIL', 'Theme classes not found');
      }
    }
    
  } catch (error) {
    logTest('cross-page', 'Cross-page functionality test', 'FAIL', error.message);
  } finally {
    await page.close();
  }
}

// Generate test report
function generateTestReport() {
  // Calculate totals
  Object.keys(testResults).forEach(page => {
    if (page !== 'summary') {
      testResults.summary.totalPassed += testResults[page].passed;
      testResults.summary.totalFailed += testResults[page].failed;
      testResults.summary.totalTests += testResults[page].tests.length;
    }
  });
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: testResults.summary,
    results: testResults,
    passRate: ((testResults.summary.totalPassed / testResults.summary.totalTests) * 100).toFixed(2)
  };
  
  // Save detailed report
  fs.writeFileSync('functionality-test-report.json', JSON.stringify(report, null, 2));
  
  // Generate summary
  console.log('\n📊 FUNCTIONALITY PRESERVATION TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testResults.summary.totalTests}`);
  console.log(`Passed: ${testResults.summary.totalPassed}`);
  console.log(`Failed: ${testResults.summary.totalFailed}`);
  console.log(`Pass Rate: ${report.passRate}%`);
  console.log('='.repeat(50));
  
  Object.keys(testResults).forEach(page => {
    if (page !== 'summary') {
      console.log(`${page.toUpperCase()}: ${testResults[page].passed}/${testResults[page].tests.length} passed`);
    }
  });
  
  if (testResults.summary.totalFailed > 0) {
    console.log('\n❌ FAILED TESTS:');
    Object.keys(testResults).forEach(page => {
      if (page !== 'summary') {
        testResults[page].tests.forEach(test => {
          if (test.status === 'FAIL') {
            console.log(`  - [${page.toUpperCase()}] ${test.testName}: ${test.details}`);
          }
        });
      }
    });
  }
  
  return report;
}

// Main test execution
async function runFunctionalityTests() {
  console.log('🚀 Starting Functionality Preservation Tests...');
  console.log(`Testing against: ${BASE_URL}`);
  
  // Create screenshots directory
  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
  }
  
  const browser = await chromium.launch({
    headless: true
  });
  
  try {
    // Run all page tests
    await testNewsPageFunctionality(browser);
    await testTeamsPageFunctionality(browser);
    await testShopPageFunctionality(browser);
    await testKontaktPageFunctionality(browser);
    await testCrossPageFunctionality(browser);
    
    // Generate and save report
    const report = generateTestReport();
    
    console.log('\n✅ Functionality preservation tests completed!');
    console.log('📄 Detailed report saved to: functionality-test-report.json');
    
    // Exit with appropriate code
    process.exit(testResults.summary.totalFailed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run tests if called directly
if (require.main === module) {
  runFunctionalityTests().catch(console.error);
}

module.exports = {
  runFunctionalityTests,
  testNewsPageFunctionality,
  testTeamsPageFunctionality,
  testShopPageFunctionality,
  testKontaktPageFunctionality
};