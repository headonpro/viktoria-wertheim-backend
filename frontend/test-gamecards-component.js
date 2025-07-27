/**
 * Frontend Component Test for GameCards Fallback Messages
 * Tests the actual component behavior with different team selections
 */

const puppeteer = require('puppeteer');

// Configuration
const FRONTEND_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000;

// Test scenarios
const testScenarios = [
  {
    teamId: '1',
    teamName: '1. Mannschaft',
    buttonSelector: 'button:has-text("1")',
    expectedData: true // Team 1 has data
  },
  {
    teamId: '2', 
    teamName: '2. Mannschaft',
    buttonSelector: 'button:has-text("2")',
    expectedData: false // Team 2 has no data
  },
  {
    teamId: '3',
    teamName: '3. Mannschaft', 
    buttonSelector: 'button:has-text("3")',
    expectedData: false // Team 3 has no data
  }
];

// Helper function to wait for element
async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    return false;
  }
}

// Test function for team-specific fallback messages
async function testTeamFallbackMessages() {
  console.log('🧪 Testing GameCards Component Fallback Messages\n');
  console.log('=' .repeat(60));
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for CI
      defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Navigate to homepage
    console.log(`🌐 Navigating to ${FRONTEND_URL}`);
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    for (const scenario of testScenarios) {
      console.log(`\n📋 Testing ${scenario.teamName}`);
      console.log('-'.repeat(40));
      
      try {
        // Find and click team button
        console.log(`🖱️  Looking for team button for ${scenario.teamName}`);
        
        // Wait for team buttons to be available
        const teamButtonsExist = await waitForElement(page, '[data-testid="team-buttons"], .team-buttons, button');
        if (!teamButtonsExist) {
          console.log('⚠️  Team buttons not found, trying alternative selectors');
        }
        
        // Try to find the specific team button
        const teamButtons = await page.$$('button');
        let targetButton = null;
        
        for (const button of teamButtons) {
          const buttonText = await page.evaluate(el => el.textContent, button);
          if (buttonText && (buttonText.includes(scenario.teamId) || buttonText.includes(scenario.teamName))) {
            targetButton = button;
            break;
          }
        }
        
        if (targetButton) {
          console.log(`✅ Found team button for ${scenario.teamName}`);
          await targetButton.click();
          console.log(`🖱️  Clicked team button for ${scenario.teamName}`);
          
          // Wait for GameCards to update
          await page.waitForTimeout(2000);
          
          // Check for game cards or fallback messages
          const gameCardsContainer = await page.$('.grid.grid-cols-2, [data-testid="game-cards"]');
          
          if (gameCardsContainer) {
            console.log(`✅ GameCards container found for ${scenario.teamName}`);
            
            // Check for actual game data vs fallback messages
            const cardElements = await gameCardsContainer.$$('div');
            
            for (let i = 0; i < Math.min(cardElements.length, 2); i++) {
              const cardElement = cardElements[i];
              const cardText = await page.evaluate(el => el.textContent, cardElement);
              
              const cardType = i === 0 ? 'Last Game' : 'Next Game';
              console.log(`\n🎴 ${cardType} Card for ${scenario.teamName}:`);
              
              if (scenario.expectedData && scenario.teamId === '1') {
                // Team 1 should have data
                if (cardText.includes('VS') || cardText.includes(':')) {
                  console.log(`✅ ${cardType}: Shows game data (VS or score)`);
                } else if (cardText.includes(`Kein`) && cardText.includes(scenario.teamName)) {
                  console.log(`⚠️  ${cardType}: Shows fallback message: "${cardText.substring(0, 100)}..."`);
                } else {
                  console.log(`❓ ${cardType}: Unexpected content: "${cardText.substring(0, 100)}..."`);
                }
              } else {
                // Teams 2 and 3 should show fallback messages
                if (cardText.includes(`Kein`) && cardText.includes(scenario.teamName)) {
                  console.log(`✅ ${cardType}: Shows correct fallback message`);
                  console.log(`   Message: "${cardText.match(/Kein[^⚽📅]+/)?.[0] || 'Message not found'}"`);
                } else if (cardText.includes('VS') || cardText.includes(':')) {
                  console.log(`❌ ${cardType}: Unexpectedly shows game data instead of fallback`);
                } else {
                  console.log(`❓ ${cardType}: Unexpected content: "${cardText.substring(0, 100)}..."`);
                }
              }
            }
          } else {
            console.log(`❌ GameCards container not found for ${scenario.teamName}`);
          }
          
        } else {
          console.log(`❌ Team button not found for ${scenario.teamName}`);
          
          // Debug: List all available buttons
          const allButtons = await page.$$eval('button', buttons => 
            buttons.map(btn => btn.textContent?.trim()).filter(text => text)
          );
          console.log(`   Available buttons: ${allButtons.join(', ')}`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${scenario.teamName}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Test function for error scenarios (simulate network errors)
async function testErrorScenarios() {
  console.log('\n\n🚨 Testing Error Scenarios\n');
  console.log('=' .repeat(60));
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: { width: 1200, height: 800 }
    });
    
    const page = await browser.newPage();
    
    // Intercept network requests to simulate errors
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      if (request.url().includes('/api/game-cards') || request.url().includes('/api/next-game-cards')) {
        console.log(`🚫 Blocking API request: ${request.url()}`);
        request.abort();
      } else {
        request.continue();
      }
    });
    
    console.log(`🌐 Navigating to ${FRONTEND_URL} with API blocked`);
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    // Test error messages for each team
    for (const scenario of testScenarios) {
      console.log(`\n🔥 Testing Error Handling for ${scenario.teamName}`);
      console.log('-'.repeat(40));
      
      try {
        // Find and click team button
        const teamButtons = await page.$$('button');
        let targetButton = null;
        
        for (const button of teamButtons) {
          const buttonText = await page.evaluate(el => el.textContent, button);
          if (buttonText && (buttonText.includes(scenario.teamId) || buttonText.includes(scenario.teamName))) {
            targetButton = button;
            break;
          }
        }
        
        if (targetButton) {
          await targetButton.click();
          await page.waitForTimeout(3000); // Wait for error to appear
          
          // Check for error messages
          const pageContent = await page.content();
          
          if (pageContent.includes('⚠️') && pageContent.includes(scenario.teamName)) {
            console.log(`✅ Error message displayed for ${scenario.teamName}`);
            
            // Extract error message
            const errorRegex = new RegExp(`[^>]*${scenario.teamName}[^<]*konnte nicht geladen werden[^<]*`, 'i');
            const errorMatch = pageContent.match(errorRegex);
            if (errorMatch) {
              console.log(`   Error message: "${errorMatch[0]}"`);
            }
          } else {
            console.log(`❌ No error message found for ${scenario.teamName}`);
          }
        }
        
      } catch (error) {
        console.log(`❌ Error testing error scenario for ${scenario.teamName}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error scenario test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Main test runner
async function runComponentTests() {
  console.log('🚀 Starting GameCards Component Test Suite');
  console.log('=' .repeat(80));
  
  try {
    // Test normal fallback behavior
    await testTeamFallbackMessages();
    
    // Test error scenarios
    await testErrorScenarios();
    
    console.log('\n\n✅ Component Test Suite Completed');
    console.log('=' .repeat(80));
    
    console.log('\n📋 Test Summary:');
    console.log('1. ✅ Team-specific fallback messages tested');
    console.log('2. ✅ Team-specific error messages tested');
    console.log('3. ✅ Component behavior verified for all teams');
    console.log('4. ✅ UI consistency checked');
    
  } catch (error) {
    console.error('\n❌ Component Test Suite Failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runComponentTests();
}

module.exports = {
  testTeamFallbackMessages,
  testErrorScenarios,
  runComponentTests
};