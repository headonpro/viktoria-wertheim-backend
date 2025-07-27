/**
 * Performance and Accessibility Test Runner
 * Simplified version for immediate execution
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;

// Test configuration
const TEST_PAGES = [
  { name: 'News', path: '/news' },
  { name: 'Teams', path: '/teams' },
  { name: 'Shop', path: '/shop' },
  { name: 'Kontakt', path: '/kontakt' }
];

const WCAG_AA_CONTRAST_RATIO = 4.5;

class SimpleValidator {
  constructor() {
    this.results = {
      colorContrast: {},
      keyboardNavigation: {},
      screenReader: {},
      animations: {},
      performance: {}
    };
  }

  // Color contrast calculation
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  parseRgbColor(colorString) {
    const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return null;
  }

  getLuminance(rgb) {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  getContrastRatio(color1, color2) {
    const l1 = this.getLuminance(color1);
    const l2 = this.getLuminance(color2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  async testColorContrast(page, pageName, theme) {
    console.log(`  🎨 Testing color contrast for ${pageName} (${theme})...`);

    const contrastResults = await page.evaluate(() => {
      const results = [];
      
      // Test card titles (main focus of design standards)
      const cardTitles = document.querySelectorAll('h3[class*="text-gray-800"], h3[class*="text-gray-100"]');
      
      cardTitles.forEach((title, index) => {
        const styles = window.getComputedStyle(title);
        const rect = title.getBoundingClientRect();
        
        if (rect.width > 0 && rect.height > 0) {
          // Get effective background color
          let bgColor = styles.backgroundColor;
          let parent = title.parentElement;
          
          // Walk up the DOM to find a non-transparent background
          while (parent && (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent')) {
            bgColor = window.getComputedStyle(parent).backgroundColor;
            parent = parent.parentElement;
          }
          
          // Fallback to body background
          if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
            bgColor = window.getComputedStyle(document.body).backgroundColor;
          }

          results.push({
            element: `Card Title ${index + 1}`,
            text: title.textContent.trim().substring(0, 30),
            textColor: styles.color,
            backgroundColor: bgColor,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            className: title.className
          });
        }
      });

      // Test viktoria-yellow elements
      const yellowElements = document.querySelectorAll('[class*="viktoria-yellow"], [class*="bg-viktoria-yellow"]');
      yellowElements.forEach((element, index) => {
        const styles = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        if (rect.width > 0 && rect.height > 0) {
          results.push({
            element: `Viktoria Yellow ${index + 1}`,
            text: element.textContent.trim().substring(0, 30),
            textColor: styles.color,
            backgroundColor: styles.backgroundColor,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            className: element.className
          });
        }
      });

      return results;
    });

    // Calculate contrast ratios
    const contrastAnalysis = contrastResults.map(result => {
      const textRgb = this.parseRgbColor(result.textColor);
      const bgRgb = this.parseRgbColor(result.backgroundColor);
      
      if (textRgb && bgRgb) {
        const ratio = this.getContrastRatio(textRgb, bgRgb);
        return {
          ...result,
          contrastRatio: Math.round(ratio * 100) / 100,
          wcagAA: ratio >= WCAG_AA_CONTRAST_RATIO,
          wcagAALarge: ratio >= 3.0,
          grade: ratio >= 7.0 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3.0 ? 'AA Large' : 'Fail'
        };
      }
      return { ...result, contrastRatio: 0, wcagAA: false, wcagAALarge: false, grade: 'Error' };
    });

    this.results.colorContrast[`${pageName}-${theme}`] = contrastAnalysis;
    return contrastAnalysis;
  }

  async testKeyboardNavigation(page, pageName, theme) {
    console.log(`  ⌨️  Testing keyboard navigation for ${pageName} (${theme})...`);

    const navigationResults = await page.evaluate(() => {
      const results = {
        focusableElements: 0,
        tabOrder: [],
        ariaLabels: 0,
        skipLinks: 0,
        headingStructure: []
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

      // Check tab order and ARIA labels
      focusableElements.forEach((element, index) => {
        const hasAriaLabel = element.hasAttribute('aria-label') || 
                           element.hasAttribute('aria-labelledby') ||
                           element.hasAttribute('aria-describedby');
        
        results.tabOrder.push({
          index,
          tagName: element.tagName,
          tabIndex: element.tabIndex,
          hasAriaLabel,
          text: element.textContent.trim().substring(0, 30)
        });

        if (hasAriaLabel) results.ariaLabels++;
      });

      // Check heading structure
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        results.headingStructure.push({
          level: parseInt(heading.tagName.charAt(1)),
          text: heading.textContent.trim().substring(0, 50),
          hasId: !!heading.id
        });
      });

      // Check for skip links
      const skipLinks = document.querySelectorAll('a[href^="#"]');
      results.skipLinks = skipLinks.length;

      return results;
    });

    this.results.keyboardNavigation[`${pageName}-${theme}`] = navigationResults;
    return navigationResults;
  }

  async testScreenReaderCompatibility(page, pageName, theme) {
    console.log(`  📢 Testing screen reader compatibility for ${pageName} (${theme})...`);

    const screenReaderResults = await page.evaluate(() => {
      const results = {
        altTexts: { total: 0, withAlt: 0 },
        ariaLabels: 0,
        landmarks: 0,
        semanticElements: 0,
        headingStructure: [],
        formLabels: { total: 0, labeled: 0 }
      };

      // Check images with alt text
      const images = document.querySelectorAll('img');
      results.altTexts.total = images.length;
      images.forEach(img => {
        if (img.alt && img.alt.trim() !== '') results.altTexts.withAlt++;
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

      // Check form labels
      const formInputs = document.querySelectorAll('input, select, textarea');
      results.formLabels.total = formInputs.length;
      formInputs.forEach(input => {
        const hasLabel = input.labels && input.labels.length > 0 ||
                        input.hasAttribute('aria-label') ||
                        input.hasAttribute('aria-labelledby');
        if (hasLabel) results.formLabels.labeled++;
      });

      // Heading structure
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        results.headingStructure.push({
          level: parseInt(heading.tagName.charAt(1)),
          text: heading.textContent.trim().substring(0, 50)
        });
      });

      return results;
    });

    this.results.screenReader[`${pageName}-${theme}`] = screenReaderResults;
    return screenReaderResults;
  }

  async testAnimationPerformance(page, pageName, theme) {
    console.log(`  🎬 Testing animation performance for ${pageName} (${theme})...`);

    const animationResults = await page.evaluate(() => {
      return new Promise((resolve) => {
        const results = {
          animationCount: 0,
          transitionCount: 0,
          frameRate: 0,
          smoothAnimations: true,
          animatedElements: []
        };

        // Count CSS animations and transitions
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
          const styles = window.getComputedStyle(element);
          if (styles.animationName !== 'none') {
            results.animationCount++;
            results.animatedElements.push({
              tagName: element.tagName,
              animation: styles.animationName,
              duration: styles.animationDuration
            });
          }
          if (styles.transitionProperty !== 'none') {
            results.transitionCount++;
          }
        });

        // Measure frame rate
        let frameCount = 0;
        let lastTime = performance.now();
        
        function countFrames() {
          frameCount++;
          const currentTime = performance.now();
          
          if (currentTime - lastTime >= 1000) {
            results.frameRate = frameCount;
            results.smoothAnimations = frameCount >= 55; // Close to 60fps
            resolve(results);
            return;
          }
          
          requestAnimationFrame(countFrames);
        }

        requestAnimationFrame(countFrames);
        
        // Fallback timeout
        setTimeout(() => {
          results.frameRate = frameCount;
          results.smoothAnimations = frameCount >= 55;
          resolve(results);
        }, 1500);
      });
    });

    this.results.animations[`${pageName}-${theme}`] = animationResults;
    return animationResults;
  }

  async testBasicPerformance(page, pageName) {
    console.log(`  ⚡ Testing basic performance for ${pageName}...`);

    const performanceResults = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
        loadComplete: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });

    this.results.performance[pageName] = performanceResults;
    return performanceResults;
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
          
          // Test basic performance (once per page)
          await this.testBasicPerformance(page, testPage.name);
          
          // Test both light and dark themes
          for (const theme of ['light', 'dark']) {
            console.log(`  🎨 Testing ${theme} theme...`);
            
            // Switch theme
            await page.evaluate((theme) => {
              document.documentElement.classList.remove('light', 'dark');
              document.documentElement.classList.add(theme);
            }, theme);
            
            await new Promise(resolve => setTimeout(resolve, 500)); // Allow theme transition
            
            // Run all tests for this theme
            await this.testColorContrast(page, testPage.name, theme);
            await this.testKeyboardNavigation(page, testPage.name, theme);
            await this.testScreenReaderCompatibility(page, testPage.name, theme);
            await this.testAnimationPerformance(page, testPage.name, theme);
          }
          
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

    const summary = this.generateSummary();
    const report = this.formatReport(summary);
    
    await fs.writeFile('performance-accessibility-validation-report.md', report);
    
    console.log('\n✅ Validation complete! Report saved to performance-accessibility-validation-report.md');
    this.printSummary(summary);
    
    return summary;
  }

  generateSummary() {
    const summary = {
      colorContrast: { passed: 0, failed: 0, total: 0 },
      keyboardNavigation: { averageFocusable: 0, averageAriaLabels: 0 },
      screenReader: { altTextCompliance: 0, formLabelCompliance: 0 },
      animations: { averageFrameRate: 0, smoothPages: 0 },
      performance: { averageLoadTime: 0, averageFCP: 0 }
    };

    // Color contrast summary
    Object.values(this.results.colorContrast).forEach(pageResults => {
      pageResults.forEach(result => {
        summary.colorContrast.total++;
        if (result.wcagAA) summary.colorContrast.passed++;
        else summary.colorContrast.failed++;
      });
    });

    // Keyboard navigation summary
    const navResults = Object.values(this.results.keyboardNavigation);
    if (navResults.length > 0) {
      summary.keyboardNavigation.averageFocusable = navResults.reduce((sum, r) => sum + r.focusableElements, 0) / navResults.length;
      summary.keyboardNavigation.averageAriaLabels = navResults.reduce((sum, r) => sum + r.ariaLabels, 0) / navResults.length;
    }

    // Screen reader summary
    const srResults = Object.values(this.results.screenReader);
    if (srResults.length > 0) {
      const altTextRates = srResults.map(r => r.altTexts.total > 0 ? r.altTexts.withAlt / r.altTexts.total : 1);
      const formLabelRates = srResults.map(r => r.formLabels.total > 0 ? r.formLabels.labeled / r.formLabels.total : 1);
      
      summary.screenReader.altTextCompliance = altTextRates.reduce((a, b) => a + b, 0) / altTextRates.length;
      summary.screenReader.formLabelCompliance = formLabelRates.reduce((a, b) => a + b, 0) / formLabelRates.length;
    }

    // Animation summary
    const animResults = Object.values(this.results.animations);
    if (animResults.length > 0) {
      summary.animations.averageFrameRate = animResults.reduce((sum, r) => sum + r.frameRate, 0) / animResults.length;
      summary.animations.smoothPages = animResults.filter(r => r.smoothAnimations).length;
    }

    // Performance summary
    const perfResults = Object.values(this.results.performance);
    if (perfResults.length > 0) {
      summary.performance.averageLoadTime = perfResults.reduce((sum, r) => sum + r.loadComplete, 0) / perfResults.length;
      summary.performance.averageFCP = perfResults.reduce((sum, r) => sum + r.firstContentfulPaint, 0) / perfResults.length;
    }

    return summary;
  }

  formatReport(summary) {
    const timestamp = new Date().toISOString();
    const contrastPassRate = summary.colorContrast.total > 0 ? 
      Math.round((summary.colorContrast.passed / summary.colorContrast.total) * 100) : 100;

    return `# Performance and Accessibility Validation Report

Generated: ${timestamp}

## Executive Summary

### ✅ Color Contrast (WCAG AA)
- **Compliance Rate**: ${contrastPassRate}% (${summary.colorContrast.passed}/${summary.colorContrast.total} elements)
- **Status**: ${contrastPassRate >= 90 ? '✅ Excellent' : contrastPassRate >= 75 ? '⚠️ Good' : '❌ Needs Improvement'}

### ⌨️ Keyboard Navigation
- **Average Focusable Elements**: ${Math.round(summary.keyboardNavigation.averageFocusable)}
- **Average ARIA Labels**: ${Math.round(summary.keyboardNavigation.averageAriaLabels)}

### 📢 Screen Reader Compatibility
- **Alt Text Compliance**: ${Math.round(summary.screenReader.altTextCompliance * 100)}%
- **Form Label Compliance**: ${Math.round(summary.screenReader.formLabelCompliance * 100)}%

### 🎬 Animation Performance
- **Average Frame Rate**: ${Math.round(summary.animations.averageFrameRate)} FPS
- **Smooth Pages**: ${summary.animations.smoothPages}/${Object.keys(this.results.animations).length}

### ⚡ Basic Performance
- **Average Load Time**: ${Math.round(summary.performance.averageLoadTime)}ms
- **Average First Contentful Paint**: ${Math.round(summary.performance.averageFCP)}ms

## Detailed Results

### Color Contrast Analysis
${this.formatColorContrastResults()}

### Keyboard Navigation Results
${this.formatKeyboardNavigationResults()}

### Screen Reader Compatibility
${this.formatScreenReaderResults()}

### Animation Performance
${this.formatAnimationResults()}

## Recommendations

${this.generateRecommendations(summary)}

## Compliance Status

- **WCAG AA Color Contrast**: ${contrastPassRate >= 90 ? '✅ PASS' : '❌ FAIL'}
- **Keyboard Navigation**: ${summary.keyboardNavigation.averageAriaLabels >= 5 ? '✅ PASS' : '⚠️ REVIEW'}
- **Screen Reader Support**: ${summary.screenReader.altTextCompliance >= 0.9 ? '✅ PASS' : '❌ FAIL'}
- **Animation Performance**: ${summary.animations.averageFrameRate >= 55 ? '✅ PASS' : '❌ FAIL'}
`;
  }

  formatColorContrastResults() {
    let output = '';
    Object.entries(this.results.colorContrast).forEach(([page, results]) => {
      output += `\n**${page}**\n`;
      results.forEach(result => {
        const status = result.wcagAA ? '✅' : '❌';
        output += `- ${status} ${result.element}: ${result.contrastRatio}:1 (${result.grade})\n`;
      });
    });
    return output || 'No color contrast data available.';
  }

  formatKeyboardNavigationResults() {
    let output = '';
    Object.entries(this.results.keyboardNavigation).forEach(([page, result]) => {
      output += `\n**${page}**\n`;
      output += `- Focusable Elements: ${result.focusableElements}\n`;
      output += `- ARIA Labels: ${result.ariaLabels}\n`;
      output += `- Heading Levels: ${result.headingStructure.length}\n`;
    });
    return output || 'No keyboard navigation data available.';
  }

  formatScreenReaderResults() {
    let output = '';
    Object.entries(this.results.screenReader).forEach(([page, result]) => {
      output += `\n**${page}**\n`;
      output += `- Images with Alt Text: ${result.altTexts.withAlt}/${result.altTexts.total}\n`;
      output += `- Form Labels: ${result.formLabels.labeled}/${result.formLabels.total}\n`;
      output += `- Landmarks: ${result.landmarks}\n`;
      output += `- Semantic Elements: ${result.semanticElements}\n`;
    });
    return output || 'No screen reader data available.';
  }

  formatAnimationResults() {
    let output = '';
    Object.entries(this.results.animations).forEach(([page, result]) => {
      output += `\n**${page}**\n`;
      output += `- Frame Rate: ${result.frameRate} FPS\n`;
      output += `- Animations: ${result.animationCount}\n`;
      output += `- Transitions: ${result.transitionCount}\n`;
      output += `- Smooth: ${result.smoothAnimations ? '✅' : '❌'}\n`;
    });
    return output || 'No animation data available.';
  }

  generateRecommendations(summary) {
    const recommendations = [];

    if (summary.colorContrast.failed > 0) {
      recommendations.push('🎨 **Color Contrast**: Adjust colors to meet WCAG AA standards (4.5:1 ratio)');
    }

    if (summary.screenReader.altTextCompliance < 0.9) {
      recommendations.push('📢 **Alt Text**: Add descriptive alt text to all images');
    }

    if (summary.screenReader.formLabelCompliance < 0.9) {
      recommendations.push('🏷️ **Form Labels**: Ensure all form inputs have proper labels');
    }

    if (summary.animations.averageFrameRate < 55) {
      recommendations.push('🎬 **Animation Performance**: Optimize animations to maintain 60fps');
    }

    if (summary.performance.averageFCP > 2000) {
      recommendations.push('⚡ **Performance**: Optimize First Contentful Paint to under 2 seconds');
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '✅ All validation criteria met!';
  }

  printSummary(summary) {
    const contrastPassRate = summary.colorContrast.total > 0 ? 
      Math.round((summary.colorContrast.passed / summary.colorContrast.total) * 100) : 100;

    console.log('\n📊 VALIDATION SUMMARY');
    console.log('===================');
    console.log(`Color Contrast: ${contrastPassRate}% WCAG AA compliance`);
    console.log(`Keyboard Navigation: ${Math.round(summary.keyboardNavigation.averageFocusable)} avg focusable elements`);
    console.log(`Screen Reader: ${Math.round(summary.screenReader.altTextCompliance * 100)}% alt text compliance`);
    console.log(`Animation Performance: ${Math.round(summary.animations.averageFrameRate)} FPS average`);
    console.log(`Load Performance: ${Math.round(summary.performance.averageFCP)}ms First Contentful Paint`);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new SimpleValidator();
  validator.runAllTests().catch(console.error);
}

module.exports = SimpleValidator;