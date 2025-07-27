#!/usr/bin/env node

/**
 * Detailed Cross-Page Consistency Test
 * 
 * This script performs detailed verification of the specific requirements
 * mentioned in task 5: Cross-Page Consistency Verification
 */

const fs = require('fs');
const path = require('path');

// Pages to test
const PAGES = {
  news: 'frontend/src/app/news/page.tsx',
  teams: 'frontend/src/app/teams/page.tsx', 
  shop: 'frontend/src/app/shop/page.tsx',
  kontakt: 'frontend/src/app/kontakt/page.tsx'
};

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
    return null;
  }
}

function testCardTitleConsistency() {
  console.log('🔍 Testing Card Title Styling Consistency');
  console.log('-'.repeat(50));
  
  const expectedPattern = /text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide/;
  const results = {};
  
  for (const [pageName, filePath] of Object.entries(PAGES)) {
    const content = readFile(filePath);
    if (content) {
      const matches = content.match(new RegExp(expectedPattern.source, 'g'));
      results[pageName] = {
        found: matches ? matches.length : 0,
        hasStandard: matches && matches.length > 0
      };
      
      console.log(`📄 ${pageName.toUpperCase()}: ${results[pageName].found} instances ${results[pageName].hasStandard ? '✅' : '❌'}`);
    }
  }
  
  const allPagesHaveStandard = Object.values(results).every(r => r.hasStandard);
  console.log(`\n${allPagesHaveStandard ? '✅' : '❌'} Card title consistency: ${allPagesHaveStandard ? 'PASSED' : 'FAILED'}\n`);
  
  return allPagesHaveStandard;
}

function testGlassmorphismConsistency() {
  console.log('🔍 Testing Glassmorphism Container Consistency');
  console.log('-'.repeat(50));
  
  // Core glassmorphism pattern
  const glassmorphismPattern = /bg-gray-100\/11 dark:bg-white\/\[0\.012\] backdrop-blur-xl/;
  const results = {};
  
  for (const [pageName, filePath] of Object.entries(PAGES)) {
    const content = readFile(filePath);
    if (content) {
      const matches = content.match(new RegExp(glassmorphismPattern.source, 'g'));
      results[pageName] = {
        found: matches ? matches.length : 0,
        hasStandard: matches && matches.length > 0
      };
      
      console.log(`📄 ${pageName.toUpperCase()}: ${results[pageName].found} instances ${results[pageName].hasStandard ? '✅' : '❌'}`);
    }
  }
  
  const allPagesHaveStandard = Object.values(results).every(r => r.hasStandard);
  console.log(`\n${allPagesHaveStandard ? '✅' : '❌'} Glassmorphism consistency: ${allPagesHaveStandard ? 'PASSED' : 'FAILED'}\n`);
  
  return allPagesHaveStandard;
}

function testViktoriaColorConsistency() {
  console.log('🔍 Testing Viktoria Color Palette Consistency');
  console.log('-'.repeat(50));
  
  const colorPatterns = {
    yellow: /viktoria-yellow/g,
    blue: /viktoria-blue(?!-)/g,
    blueLight: /viktoria-blue-light/g
  };
  
  const results = {};
  
  for (const [pageName, filePath] of Object.entries(PAGES)) {
    const content = readFile(filePath);
    if (content) {
      results[pageName] = {};
      
      for (const [colorName, pattern] of Object.entries(colorPatterns)) {
        const matches = content.match(pattern);
        results[pageName][colorName] = {
          found: matches ? matches.length : 0,
          hasColor: matches && matches.length > 0
        };
      }
      
      console.log(`📄 ${pageName.toUpperCase()}:`);
      console.log(`  🟡 viktoria-yellow: ${results[pageName].yellow.found} instances ${results[pageName].yellow.hasColor ? '✅' : '⚠️'}`);
      console.log(`  🔵 viktoria-blue: ${results[pageName].blue.found} instances ${results[pageName].blue.hasColor ? '✅' : '⚠️'}`);
      console.log(`  🔷 viktoria-blue-light: ${results[pageName].blueLight.found} instances ${results[pageName].blueLight.hasColor ? '✅' : '⚠️'}`);
    }
  }
  
  // Check if all pages use at least viktoria-yellow (primary brand color)
  const allPagesHaveYellow = Object.values(results).every(r => r.yellow && r.yellow.hasColor);
  console.log(`\n${allPagesHaveYellow ? '✅' : '❌'} Viktoria color consistency: ${allPagesHaveYellow ? 'PASSED' : 'FAILED'}\n`);
  
  return allPagesHaveYellow;
}

function testLightDarkModeConsistency() {
  console.log('🔍 Testing Light/Dark Mode Consistency');
  console.log('-'.repeat(50));
  
  const themePatterns = {
    lightText: /text-gray-800/g,
    darkText: /dark:text-gray-100/g,
    lightBg: /bg-gray-100/g,
    darkBg: /dark:bg-white/g
  };
  
  const results = {};
  
  for (const [pageName, filePath] of Object.entries(PAGES)) {
    const content = readFile(filePath);
    if (content) {
      results[pageName] = {};
      
      for (const [themeName, pattern] of Object.entries(themePatterns)) {
        const matches = content.match(pattern);
        results[pageName][themeName] = {
          found: matches ? matches.length : 0,
          hasTheme: matches && matches.length > 0
        };
      }
      
      console.log(`📄 ${pageName.toUpperCase()}:`);
      console.log(`  ☀️  Light mode text: ${results[pageName].lightText.found} instances ${results[pageName].lightText.hasTheme ? '✅' : '⚠️'}`);
      console.log(`  🌙 Dark mode text: ${results[pageName].darkText.found} instances ${results[pageName].darkText.hasTheme ? '✅' : '⚠️'}`);
      console.log(`  ☀️  Light mode bg: ${results[pageName].lightBg.found} instances ${results[pageName].lightBg.hasTheme ? '✅' : '⚠️'}`);
      console.log(`  🌙 Dark mode bg: ${results[pageName].darkBg.found} instances ${results[pageName].darkBg.hasTheme ? '✅' : '⚠️'}`);
    }
  }
  
  // Check if all pages have both light and dark mode support
  const allPagesHaveThemes = Object.values(results).every(r => 
    r.lightText && r.lightText.hasTheme && r.darkText && r.darkText.hasTheme
  );
  
  console.log(`\n${allPagesHaveThemes ? '✅' : '❌'} Light/Dark mode consistency: ${allPagesHaveThemes ? 'PASSED' : 'FAILED'}\n`);
  
  return allPagesHaveThemes;
}

function testResponsiveConsistency() {
  console.log('🔍 Testing Responsive Breakpoint Consistency');
  console.log('-'.repeat(50));
  
  const responsivePatterns = {
    textSize: /text-sm md:text-base/g,
    borderRadius: /rounded-xl md:rounded-2xl/g,
    padding: /p-\d+ md:p-\d+/g,
    margin: /m[tblrxy]?-\d+ md:m[tblrxy]?-\d+/g
  };
  
  const results = {};
  
  for (const [pageName, filePath] of Object.entries(PAGES)) {
    const content = readFile(filePath);
    if (content) {
      results[pageName] = {};
      
      for (const [patternName, pattern] of Object.entries(responsivePatterns)) {
        const matches = content.match(pattern);
        results[pageName][patternName] = {
          found: matches ? matches.length : 0,
          hasPattern: matches && matches.length > 0
        };
      }
      
      console.log(`📄 ${pageName.toUpperCase()}:`);
      console.log(`  📱 Responsive text: ${results[pageName].textSize.found} instances ${results[pageName].textSize.hasPattern ? '✅' : '⚠️'}`);
      console.log(`  🔲 Responsive radius: ${results[pageName].borderRadius.found} instances ${results[pageName].borderRadius.hasPattern ? '✅' : '⚠️'}`);
      console.log(`  📏 Responsive padding: ${results[pageName].padding.found} instances ${results[pageName].padding.hasPattern ? '✅' : '⚠️'}`);
      console.log(`  📐 Responsive margin: ${results[pageName].margin.found} instances ${results[pageName].margin.hasPattern ? '✅' : '⚠️'}`);
    }
  }
  
  // Check if all pages have responsive text sizing (most important)
  const allPagesHaveResponsive = Object.values(results).every(r => 
    r.textSize && r.textSize.hasPattern
  );
  
  console.log(`\n${allPagesHaveResponsive ? '✅' : '❌'} Responsive consistency: ${allPagesHaveResponsive ? 'PASSED' : 'FAILED'}\n`);
  
  return allPagesHaveResponsive;
}

function testSpecificImplementations() {
  console.log('🔍 Testing Page-Specific Implementation Details');
  console.log('-'.repeat(50));
  
  const pageSpecificTests = {
    news: {
      categoryButtons: /bg-viktoria-yellow text-gray-800 shadow-sm shadow-viktoria-yellow\/20/,
      articleCards: /group-hover:text-viktoria-blue dark:group-hover:text-viktoria-yellow/
    },
    teams: {
      teamCards: /bg-viktoria-yellow text-gray-800 text-xs px-2 py-1 rounded-full/,
      hoverEffects: /hover:transform hover:translateY-\[-2px\]/
    },
    shop: {
      comingSoonBanner: /Unser Shop kommt bald/,
      productCategories: /Coming Soon/
    },
    kontakt: {
      contactForm: /viktoria-blue dark:bg-viktoria-yellow/,
      contactPersons: /1\. Vorsitzender|Jugendleiter|Kassenwart/
    }
  };
  
  const results = {};
  
  for (const [pageName, tests] of Object.entries(pageSpecificTests)) {
    const content = readFile(PAGES[pageName]);
    if (content) {
      results[pageName] = {};
      
      console.log(`📄 ${pageName.toUpperCase()}:`);
      
      for (const [testName, pattern] of Object.entries(tests)) {
        const matches = content.match(pattern);
        const found = matches ? matches.length : 0;
        results[pageName][testName] = found > 0;
        
        console.log(`  ${found > 0 ? '✅' : '❌'} ${testName}: ${found > 0 ? 'IMPLEMENTED' : 'NOT FOUND'}`);
      }
    }
  }
  
  console.log('');
  return results;
}

function runAllTests() {
  console.log('🚀 DETAILED CROSS-PAGE CONSISTENCY VERIFICATION');
  console.log('='.repeat(60));
  console.log('');
  
  const testResults = {
    cardTitles: testCardTitleConsistency(),
    glassmorphism: testGlassmorphismConsistency(),
    viktoriaColors: testViktoriaColorConsistency(),
    lightDarkMode: testLightDarkModeConsistency(),
    responsive: testResponsiveConsistency()
  };
  
  const specificResults = testSpecificImplementations();
  
  // Final summary
  console.log('📊 FINAL VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  const allTestsPassed = Object.values(testResults).every(result => result === true);
  
  console.log(`\n🎯 Core Design Standards:`);
  console.log(`  ${testResults.cardTitles ? '✅' : '❌'} Card title styling consistency`);
  console.log(`  ${testResults.glassmorphism ? '✅' : '❌'} Glassmorphism container consistency`);
  console.log(`  ${testResults.viktoriaColors ? '✅' : '❌'} Viktoria color palette consistency`);
  console.log(`  ${testResults.lightDarkMode ? '✅' : '❌'} Light/Dark mode consistency`);
  console.log(`  ${testResults.responsive ? '✅' : '❌'} Responsive breakpoint consistency`);
  
  console.log(`\n🔧 Page-Specific Features:`);
  for (const [pageName, tests] of Object.entries(specificResults)) {
    const pageTestsPassed = Object.values(tests).every(result => result === true);
    console.log(`  ${pageTestsPassed ? '✅' : '⚠️'} ${pageName.toUpperCase()} page features`);
  }
  
  console.log(`\n${allTestsPassed ? '🎉' : '⚠️'} OVERALL RESULT: ${allTestsPassed ? 'ALL TESTS PASSED' : 'SOME ISSUES FOUND'}`);
  
  if (allTestsPassed) {
    console.log('\n✨ Perfect! All four pages follow identical design standards.');
    console.log('   The cross-page consistency verification is complete.');
  } else {
    console.log('\n🔧 Some inconsistencies were found. Please review the details above.');
  }
  
  console.log('\n✅ Detailed verification completed!');
  
  return {
    allTestsPassed,
    testResults,
    specificResults
  };
}

// Run all tests
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };