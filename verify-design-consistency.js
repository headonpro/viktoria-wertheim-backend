#!/usr/bin/env node

/**
 * Design Standards Consistency Verification Script
 * 
 * This script verifies that all four pages (News, Teams, Shop, Kontakt) 
 * follow the same design standards as implemented on the homepage.
 */

const fs = require('fs');
const path = require('path');

// Design standards patterns to check
const DESIGN_STANDARDS = {
  cardTitle: {
    pattern: /text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide/g,
    description: 'Card title styling standard'
  },
  glassmorphismContainer: {
    pattern: /bg-gray-100\/11 dark:bg-white\/\[0\.012\] backdrop-blur-xl/g,
    description: 'Glassmorphism container styling'
  },
  viktoriaYellow: {
    pattern: /viktoria-yellow/g,
    description: 'Viktoria yellow color usage'
  },
  viktoriaBlue: {
    pattern: /viktoria-blue(?!-)/g,
    description: 'Viktoria blue color usage'
  },
  viktoriaBlueLightPattern: {
    pattern: /viktoria-blue-light/g,
    description: 'Viktoria blue light color usage'
  },
  responsiveRounding: {
    pattern: /rounded-xl md:rounded-2xl/g,
    description: 'Responsive border radius (mobile: xl, desktop: 2xl)'
  },
  shadowPattern: {
    pattern: /shadow-\[0_4px_16px_rgba\(0,0,0,0\.08\),0_2px_8px_rgba\(0,0,0,0\.06\)\] dark:shadow-\[0_4px_16px_rgba\(255,255,255,0\.08\),0_2px_8px_rgba\(255,255,255,0\.04\)\]/g,
    description: 'Standard shadow pattern for light/dark mode'
  }
};

// Pages to verify
const PAGES_TO_CHECK = [
  'frontend/src/app/news/page.tsx',
  'frontend/src/app/teams/page.tsx', 
  'frontend/src/app/shop/page.tsx',
  'frontend/src/app/kontakt/page.tsx'
];

// Reference components (from homepage)
const REFERENCE_COMPONENTS = [
  'frontend/src/components/TeamStatus.tsx',
  'frontend/src/components/LeagueTable.tsx',
  'frontend/src/components/TopScorers.tsx',
  'frontend/src/components/GameCards.tsx',
  'frontend/src/components/NewsCarousel.tsx',
  'frontend/src/components/SponsorShowcase.tsx'
];

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message);
    return null;
  }
}

function countMatches(content, pattern) {
  if (!content) return 0;
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function analyzeFile(filePath, content) {
  const results = {};
  
  for (const [key, standard] of Object.entries(DESIGN_STANDARDS)) {
    const count = countMatches(content, standard.pattern);
    results[key] = {
      count,
      description: standard.description,
      found: count > 0
    };
  }
  
  return results;
}

function verifyConsistency() {
  console.log('🔍 Design Standards Consistency Verification\n');
  console.log('=' .repeat(60));
  
  // Analyze reference components first
  console.log('\n📋 Reference Components Analysis:');
  console.log('-'.repeat(40));
  
  const referenceStats = {};
  
  for (const componentPath of REFERENCE_COMPONENTS) {
    const content = readFileContent(componentPath);
    if (content) {
      const analysis = analyzeFile(componentPath, content);
      referenceStats[componentPath] = analysis;
      
      console.log(`\n📄 ${path.basename(componentPath)}:`);
      for (const [key, result] of Object.entries(analysis)) {
        if (result.found) {
          console.log(`  ✅ ${result.description}: ${result.count} instances`);
        }
      }
    }
  }
  
  // Analyze pages
  console.log('\n\n🔍 Page Analysis:');
  console.log('-'.repeat(40));
  
  const pageStats = {};
  const issues = [];
  
  for (const pagePath of PAGES_TO_CHECK) {
    const content = readFileContent(pagePath);
    if (content) {
      const analysis = analyzeFile(pagePath, content);
      pageStats[pagePath] = analysis;
      
      const pageName = path.basename(pagePath, '.tsx');
      console.log(`\n📄 ${pageName.toUpperCase()} PAGE:`);
      
      for (const [key, result] of Object.entries(analysis)) {
        if (result.found) {
          console.log(`  ✅ ${result.description}: ${result.count} instances`);
        } else {
          console.log(`  ⚠️  ${result.description}: NOT FOUND`);
          issues.push({
            page: pageName,
            issue: result.description,
            severity: 'warning'
          });
        }
      }
    }
  }
  
  // Cross-page consistency check
  console.log('\n\n🔄 Cross-Page Consistency Check:');
  console.log('-'.repeat(40));
  
  const consistencyIssues = [];
  
  for (const [standardKey, standard] of Object.entries(DESIGN_STANDARDS)) {
    console.log(`\n🎯 ${standard.description}:`);
    
    const pageCounts = {};
    let hasInconsistency = false;
    
    for (const pagePath of PAGES_TO_CHECK) {
      const pageName = path.basename(pagePath, '.tsx');
      const count = pageStats[pagePath] ? pageStats[pagePath][standardKey].count : 0;
      pageCounts[pageName] = count;
      
      if (count > 0) {
        console.log(`  ✅ ${pageName}: ${count} instances`);
      } else {
        console.log(`  ❌ ${pageName}: NOT IMPLEMENTED`);
        hasInconsistency = true;
      }
    }
    
    if (hasInconsistency) {
      consistencyIssues.push({
        standard: standard.description,
        pages: pageCounts
      });
    }
  }
  
  // Theme consistency check
  console.log('\n\n🌓 Light/Dark Mode Consistency:');
  console.log('-'.repeat(40));
  
  const themePatterns = {
    lightModeText: /text-gray-800/g,
    darkModeText: /dark:text-gray-100/g,
    lightModeBackground: /bg-gray-100/g,
    darkModeBackground: /dark:bg-white/g
  };
  
  for (const pagePath of PAGES_TO_CHECK) {
    const content = readFileContent(pagePath);
    const pageName = path.basename(pagePath, '.tsx');
    
    console.log(`\n📄 ${pageName.toUpperCase()}:`);
    
    for (const [key, pattern] of Object.entries(themePatterns)) {
      const count = countMatches(content, pattern);
      console.log(`  ${count > 0 ? '✅' : '❌'} ${key}: ${count} instances`);
    }
  }
  
  // Responsive design check
  console.log('\n\n📱 Responsive Design Consistency:');
  console.log('-'.repeat(40));
  
  const responsivePatterns = {
    mobileFirst: /text-sm md:text-base/g,
    responsivePadding: /p-\d+ md:p-\d+/g,
    responsiveMargin: /m[tblrxy]?-\d+ md:m[tblrxy]?-\d+/g,
    responsiveGrid: /grid-cols-\d+ md:grid-cols-\d+/g
  };
  
  for (const pagePath of PAGES_TO_CHECK) {
    const content = readFileContent(pagePath);
    const pageName = path.basename(pagePath, '.tsx');
    
    console.log(`\n📄 ${pageName.toUpperCase()}:`);
    
    for (const [key, pattern] of Object.entries(responsivePatterns)) {
      const count = countMatches(content, pattern);
      console.log(`  ${count > 0 ? '✅' : '⚠️'} ${key}: ${count} instances`);
    }
  }
  
  // Summary
  console.log('\n\n📊 VERIFICATION SUMMARY:');
  console.log('=' .repeat(60));
  
  if (issues.length === 0 && consistencyIssues.length === 0) {
    console.log('🎉 ALL CHECKS PASSED! Design consistency verified across all pages.');
  } else {
    console.log(`⚠️  Found ${issues.length + consistencyIssues.length} potential issues:`);
    
    if (issues.length > 0) {
      console.log('\n🔍 Individual Page Issues:');
      issues.forEach(issue => {
        console.log(`  • ${issue.page}: Missing ${issue.issue}`);
      });
    }
    
    if (consistencyIssues.length > 0) {
      console.log('\n🔄 Cross-Page Consistency Issues:');
      consistencyIssues.forEach(issue => {
        console.log(`  • ${issue.standard}:`);
        for (const [page, count] of Object.entries(issue.pages)) {
          console.log(`    - ${page}: ${count === 0 ? 'NOT IMPLEMENTED' : count + ' instances'}`);
        }
      });
    }
  }
  
  console.log('\n✅ Verification completed!');
  
  return {
    issues,
    consistencyIssues,
    pageStats,
    referenceStats
  };
}

// Run verification
if (require.main === module) {
  verifyConsistency();
}

module.exports = { verifyConsistency, DESIGN_STANDARDS, PAGES_TO_CHECK };