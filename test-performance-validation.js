/**
 * Performance and Accessibility Validation Tests
 * Tests for design standards implementation impact
 */

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  performance: 85,
  accessibility: 90,
  'best-practices': 85,
  seo: 85,
  fcp: 2000, // First Contentful Paint (ms)
  lcp: 2500, // Largest Contentful Paint (ms)
  cls: 0.1,  // Cumulative Layout Shift
  fid: 100   // First Input Delay (ms)
};

// Color contrast ratios for WCAG AA compliance
const WCAG_AA_CONTRAST_RATIO = 4.5;
const WCAG_AA_LARGE_TEXT_RATIO = 3.0;

// Test pages
const TEST_PAGES = [
  { name: 'News', path: '/news' },
  { name: 'Teams', path: '/teams' },
  { name: 'Shop', path: '/shop' },
  { name: 'Kontakt', path: '/kontakt' }
];

class PerformanceValidator {
  constructor() {
    this.results = {
      performance: {},
      accessibility: {},
      colorContrast: {},
      keyboardNavigation: {},
      animations: {}
    };
  }

  async runLighthouseTest(url, pageName) {
    console.log(`🔍 Running Lighthouse test for ${pageName}...`);
    
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const options = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
    };

    try {
      const runnerResult = await lighthouse(url, options);
      await chrome.kill();

      const scores = runnerResult.lhr.categories;
      const audits = runnerResult.lhr.audits;

      const result = {
        performance: Math.round(scores.performance.score * 100),
        accessibility: Math.round(scores.accessibility.score * 100),
        bestPractices: Math.round(scores['best-practices'].score * 100),
        seo: Math.round(scores.seo.score * 100),
        metrics: {
          fcp: audits['first-contentful-paint'].numericValue,
          lcp: audits['largest-contentful-paint'].numericValue,
          cls: audits['cumulative-layout-shift'].numericValue,
          fid: audits['max-potential-fid'] ? audits['max-potential-fid'].numericValue : 0
        }
      };

      this.results.performance[pageName] = result;
      return result;
    } catch (error) {
      console.error(`❌ Lighthouse test failed for ${pageName}:`, error.message);
      return null;
    }
  }

  async testColorContrast(page, pageName) {
    console.log(`🎨 Testing color contrast for ${pageName}...`);

    const contrastResults = await page.evaluate(() => {
      const results = [];
      
      // Test card titles (main focus of design standards)
      const cardTitles = document.querySelectorAll('h3[class*="text-gray-800"], h3[class*="text-gray-100"]');
      
      cardTitles.forEach((title, index) => {
        const styles = window.getComputedStyle(title);
        const textColor = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        // Get parent background if transparent
        let parent = title.parentElement;
        let bgColor = backgroundColor;
        while (parent && (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent')) {
          bgColor = window.getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }

        results.push({
          element: `Card Title ${index + 1}`,
          textColor,
          backgroundColor: bgColor,
          selector: title.className
        });
      });

      // Test viktoria-yellow elements
      const yellowElements = document.querySelectorAll('[class*="viktoria-yellow"], [class*="bg-viktoria-yellow"]');
      yellowElements.forEach((element, index) => {
        const styles = window.getComputedStyle(element);
        results.push({
          element: `Viktoria Yellow Element ${index + 1}`,
          textColor: styles.color,
          backgroundColor: styles.backgroundColor,
          selector: element.className
        });
      });

      return results;
    });

    // Calculate contrast ratios
    const contrastAnalysis = contrastResults.map(result => {
      const ratio = this.calculateContrastRatio(result.textColor, result.backgroundColor);
      return {
        ...result,
        contrastRatio: ratio,
        wcagAA: ratio >= WCAG_AA_CONTRAST_RATIO,
        wcagAALarge: ratio >= WCAG_AA_LARGE_TEXT_RATIO
      };
    });

    this.results.colorContrast[pageName] = contrastAnalysis;
    return contrastAnalysis;
  }

  calculateContrastRatio(color1, color2) {
    // Simplified contrast calculation
    // In a real implementation, you'd use a proper color contrast library
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);
    
    if (!rgb1 || !rgb2) return 0;

    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  parseColor(color) {
    // Simple RGB parser - would need enhancement for all color formats
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return null;
  }

  getLuminance([r, g, b]) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  async testKeyboardNavigation(page, pageName) {
    console.log(`⌨️  Testing keyboard navigation for ${pageName}...`);

    const navigationResults = await page.evaluate(() => {
      const results = {
        focusableElements: 0,
        tabOrder: [],
        skipLinks: 0,
        ariaLabels: 0
      };

      // Find all focusable elements
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ];

      const focusableElements = document.querySelectorAll(focusableSelectors.join(', '));
      results.focusableElements = focusableElements.length;

      // Check tab order
      focusableElements.forEach((element, index) => {
        const tabIndex = element.tabIndex;
        const hasAriaLabel = element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby');
        
        results.tabOrder.push({
          index,
          tagName: element.tagName,
          tabIndex,
          hasAriaLabel,
          className: element.className
        });

        if (hasAriaLabel) results.ariaLabels++;
      });

      // Check for skip links
      const skipLinks = document.querySelectorAll('a[href^="#"]');
      results.skipLinks = skipLinks.length;

      return results;
    });

    this.results.keyboardNavigation[pageName] = navigationResults;
    return navigationResults;
  }

  async testAnimationPerformance(page, pageName) {
    console.log(`🎬 Testing animation performance for ${pageName}...`);

    const animationResults = await page.evaluate(() => {
      return new Promise((resolve) => {
        const results = {
          animationCount: 0,
          transitionCount: 0,
          frameRate: 0,
          smoothAnimations: true
        };

        // Count CSS animations and transitions
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
          const styles = window.getComputedStyle(element);
          if (styles.animationName !== 'none') results.animationCount++;
          if (styles.transitionProperty !== 'none') results.transitionCount++;
        });

        // Measure frame rate during interactions
        let frameCount = 0;
        let lastTime = performance.now();
        
        function countFrames() {
          frameCount++;
          const currentTime = performance.now();
          
          if (currentTime - lastTime >= 1000) {
            results.frameRate = frameCount;
            resolve(results);
            return;
          }
          
          requestAnimationFrame(countFrames);
        }

        // Trigger some interactions to test animation performance
        const interactiveElements = document.querySelectorAll('button, a, [class*="hover:"]');
        if (interactiveElements.length > 0) {
          interactiveElements[0].dispatchEvent(new Event('mouseenter'));
          setTimeout(() => {
            interactiveElements[0].dispatchEvent(new Event('mouseleave'));
          }, 100);
        }

        requestAnimationFrame(countFrames);
        
        // Fallback timeout
        setTimeout(() => {
          results.frameRate = frameCount;
          resolve(results);
        }, 2000);
      });
    });

    this.results.animations[pageName] = animationResults;
    return animationResults;
  }

  async testScreenReaderCompatibility(page, pageName) {
    console.log(`📢 Testing screen reader compatibility for ${pageName}...`);

    const screenReaderResults = await page.evaluate(() => {
      const results = {
        headingStructure: [],
        altTexts: 0,
        ariaLabels: 0,
        landmarks: 0,
        semanticElements: 0
      };

      // Check heading structure
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        results.headingStructure.push({
          level: parseInt(heading.tagName.charAt(1)),
          text: heading.textContent.trim().substring(0, 50),
          hasId: !!heading.id
        });
      });

      // Count alt texts
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (img.alt) results.altTexts++;
      });

      // Count ARIA labels
      const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
      results.ariaLabels = ariaElements.length;

      // Count landmarks
      const landmarks = document.querySelectorAll('main, nav, header, footer, aside, section[aria-label], [role="banner"], [role="navigation"], [role="main"], [role="contentinfo"]');
      results.landmarks = landmarks.length;

      // Count semantic elements
      const semanticElements = document.querySelectorAll('main, nav, header, footer, aside, section, article');
      results.semanticElements = semanticElements.length;

      return results;
    });

    this.results.accessibility[pageName] = {
      ...this.results.accessibility[pageName],
      screenReader: screenReaderResults
    };

    return screenReaderResults;
  }

  async runAllTests() {
    console.log('🚀 Starting Performance and Accessibility Validation...\n');

    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      for (const testPage of TEST_PAGES) {
        console.log(`\n📄 Testing ${testPage.name} page...`);
        
        const page = await browser.newPage();
        const url = `http://localhost:3000${testPage.path}`;
        
        try {
          await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
          
          // Test both light and dark themes
          for (const theme of ['light', 'dark']) {
            console.log(`  🎨 Testing ${theme} theme...`);
            
            // Switch theme
            await page.evaluate((theme) => {
              document.documentElement.classList.remove('light', 'dark');
              document.documentElement.classList.add(theme);
            }, theme);
            
            await page.waitForTimeout(500); // Allow theme transition
            
            const pageName = `${testPage.name}-${theme}`;
            
            // Run tests
            await this.testColorContrast(page, pageName);
            await this.testKeyboardNavigation(page, pageName);
            await this.testAnimationPerformance(page, pageName);
            await this.testScreenReaderCompatibility(page, pageName);
          }
          
          // Run Lighthouse test (once per page, not per theme)
          await this.runLighthouseTest(url, testPage.name);
          
        } catch (error) {
          console.error(`❌ Error testing ${testPage.name}:`, error.message);
        }
        
        await page.close();
      }
    } finally {
      await browser.close();
    }

    await this.generateReport();
  }

  async generateReport() {
    console.log('\n📊 Generating validation report...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(),
      detailed: this.results
    };

    const reportContent = this.formatReport(report);
    await fs.writeFile('performance-accessibility-report.md', reportContent);
    
    console.log('\n✅ Validation complete! Report saved to performance-accessibility-report.md');
    this.printSummary(report.summary);
  }

  generateSummary() {
    const summary = {
      performance: { passed: 0, failed: 0, average: 0 },
      accessibility: { passed: 0, failed: 0, average: 0 },
      colorContrast: { passed: 0, failed: 0, total: 0 },
      keyboardNavigation: { issues: 0, focusableElements: 0 },
      animations: { averageFrameRate: 0, smoothAnimations: 0 }
    };

    // Performance summary
    const perfScores = Object.values(this.results.performance).map(r => r?.performance || 0);
    summary.performance.average = perfScores.reduce((a, b) => a + b, 0) / perfScores.length || 0;
    summary.performance.passed = perfScores.filter(s => s >= PERFORMANCE_THRESHOLDS.performance).length;
    summary.performance.failed = perfScores.length - summary.performance.passed;

    // Accessibility summary
    const accScores = Object.values(this.results.performance).map(r => r?.accessibility || 0);
    summary.accessibility.average = accScores.reduce((a, b) => a + b, 0) / accScores.length || 0;
    summary.accessibility.passed = accScores.filter(s => s >= PERFORMANCE_THRESHOLDS.accessibility).length;
    summary.accessibility.failed = accScores.length - summary.accessibility.passed;

    // Color contrast summary
    Object.values(this.results.colorContrast).forEach(pageResults => {
      pageResults.forEach(result => {
        summary.colorContrast.total++;
        if (result.wcagAA) summary.colorContrast.passed++;
        else summary.colorContrast.failed++;
      });
    });

    // Animation summary
    const animationResults = Object.values(this.results.animations);
    summary.animations.averageFrameRate = animationResults.reduce((sum, r) => sum + (r.frameRate || 0), 0) / animationResults.length || 0;
    summary.animations.smoothAnimations = animationResults.filter(r => r.frameRate >= 55).length;

    return summary;
  }

  formatReport(report) {
    return `# Performance and Accessibility Validation Report

Generated: ${report.timestamp}

## Executive Summary

### Performance
- **Average Score**: ${Math.round(report.summary.performance.average)}/100
- **Pages Passed**: ${report.summary.performance.passed}/${report.summary.performance.passed + report.summary.performance.failed}
- **Threshold**: ${PERFORMANCE_THRESHOLDS.performance}/100

### Accessibility
- **Average Score**: ${Math.round(report.summary.accessibility.average)}/100
- **Pages Passed**: ${report.summary.accessibility.passed}/${report.summary.accessibility.passed + report.summary.accessibility.failed}
- **Threshold**: ${PERFORMANCE_THRESHOLDS.accessibility}/100

### Color Contrast (WCAG AA)
- **Elements Passed**: ${report.summary.colorContrast.passed}/${report.summary.colorContrast.total}
- **Compliance Rate**: ${Math.round((report.summary.colorContrast.passed / report.summary.colorContrast.total) * 100)}%

### Animation Performance
- **Average Frame Rate**: ${Math.round(report.summary.animations.averageFrameRate)} FPS
- **Smooth Animations**: ${report.summary.animations.smoothAnimations} pages

## Detailed Results

${this.formatDetailedResults(report.detailed)}

## Recommendations

${this.generateRecommendations(report.summary)}
`;
  }

  formatDetailedResults(results) {
    let output = '';
    
    // Performance results
    output += '### Performance Scores\n\n';
    Object.entries(results.performance).forEach(([page, data]) => {
      if (data) {
        output += `**${page}**\n`;
        output += `- Performance: ${data.performance}/100\n`;
        output += `- Accessibility: ${data.accessibility}/100\n`;
        output += `- Best Practices: ${data.bestPractices}/100\n`;
        output += `- SEO: ${data.seo}/100\n`;
        output += `- FCP: ${Math.round(data.metrics.fcp)}ms\n`;
        output += `- LCP: ${Math.round(data.metrics.lcp)}ms\n\n`;
      }
    });

    // Color contrast results
    output += '### Color Contrast Analysis\n\n';
    Object.entries(results.colorContrast).forEach(([page, contrasts]) => {
      output += `**${page}**\n`;
      contrasts.forEach(contrast => {
        const status = contrast.wcagAA ? '✅' : '❌';
        output += `- ${status} ${contrast.element}: ${contrast.contrastRatio.toFixed(2)}:1\n`;
      });
      output += '\n';
    });

    return output;
  }

  generateRecommendations(summary) {
    const recommendations = [];

    if (summary.performance.average < PERFORMANCE_THRESHOLDS.performance) {
      recommendations.push('- **Performance**: Consider optimizing images, reducing bundle size, and implementing code splitting');
    }

    if (summary.accessibility.average < PERFORMANCE_THRESHOLDS.accessibility) {
      recommendations.push('- **Accessibility**: Add missing ARIA labels, improve heading structure, and ensure proper focus management');
    }

    if (summary.colorContrast.failed > 0) {
      recommendations.push('- **Color Contrast**: Adjust colors to meet WCAG AA standards (4.5:1 ratio for normal text)');
    }

    if (summary.animations.averageFrameRate < 55) {
      recommendations.push('- **Animation Performance**: Optimize animations to maintain 60fps, consider using transform and opacity properties');
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '✅ All validation criteria met!';
  }

  printSummary(summary) {
    console.log('\n📊 VALIDATION SUMMARY');
    console.log('===================');
    console.log(`Performance: ${Math.round(summary.performance.average)}/100 (${summary.performance.passed}/${summary.performance.passed + summary.performance.failed} passed)`);
    console.log(`Accessibility: ${Math.round(summary.accessibility.average)}/100 (${summary.accessibility.passed}/${summary.accessibility.passed + summary.accessibility.failed} passed)`);
    console.log(`Color Contrast: ${summary.colorContrast.passed}/${summary.colorContrast.total} elements passed WCAG AA`);
    console.log(`Animation Performance: ${Math.round(summary.animations.averageFrameRate)} FPS average`);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new PerformanceValidator();
  validator.runAllTests().catch(console.error);
}

module.exports = PerformanceValidator;