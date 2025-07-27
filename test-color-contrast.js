/**
 * WCAG Color Contrast Validation
 * Validates design standards color combinations
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;

// WCAG AA Standards
const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3.0;
const WCAG_AAA_NORMAL = 7.0;
const WCAG_AAA_LARGE = 4.5;

// Design standards color definitions
const DESIGN_COLORS = {
  'viktoria-yellow': '#FFD700',
  'viktoria-blue': '#003366',
  'viktoria-blue-light': '#354992',
  'text-gray-800': '#1f2937',
  'text-gray-100': '#f3f4f6',
  'text-gray-700': '#374151',
  'text-gray-300': '#d1d5db'
};

class ColorContrastValidator {
  constructor() {
    this.results = [];
  }

  // Convert hex to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Calculate relative luminance
  getLuminance(rgb) {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  // Calculate contrast ratio
  getContrastRatio(color1, color2) {
    const rgb1 = typeof color1 === 'string' ? this.hexToRgb(color1) : color1;
    const rgb2 = typeof color2 === 'string' ? this.hexToRgb(color2) : color2;
    
    if (!rgb1 || !rgb2) return 0;

    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Validate color combination
  validateCombination(foreground, background, context = '') {
    const ratio = this.getContrastRatio(foreground, background);
    
    return {
      foreground,
      background,
      context,
      ratio: Math.round(ratio * 100) / 100,
      wcagAA: ratio >= WCAG_AA_NORMAL,
      wcagAALarge: ratio >= WCAG_AA_LARGE,
      wcagAAA: ratio >= WCAG_AAA_NORMAL,
      wcagAAALarge: ratio >= WCAG_AAA_LARGE,
      grade: this.getGrade(ratio)
    };
  }

  getGrade(ratio) {
    if (ratio >= WCAG_AAA_NORMAL) return 'AAA';
    if (ratio >= WCAG_AA_NORMAL) return 'AA';
    if (ratio >= WCAG_AA_LARGE) return 'AA Large';
    return 'Fail';
  }

  // Test design standards color combinations
  testDesignStandardsCombinations() {
    console.log('🎨 Testing design standards color combinations...');

    const combinations = [
      // Card titles in light mode
      {
        fg: DESIGN_COLORS['text-gray-800'],
        bg: '#ffffff',
        context: 'Card titles - Light mode (text-gray-800 on white)'
      },
      {
        fg: DESIGN_COLORS['text-gray-800'],
        bg: 'rgba(243, 244, 246, 0.11)', // bg-gray-100/11
        context: 'Card titles - Light mode (text-gray-800 on glassmorphism)'
      },
      
      // Card titles in dark mode
      {
        fg: DESIGN_COLORS['text-gray-100'],
        bg: '#000000',
        context: 'Card titles - Dark mode (text-gray-100 on black)'
      },
      {
        fg: DESIGN_COLORS['text-gray-100'],
        bg: 'rgba(255, 255, 255, 0.012)', // bg-white/[0.012]
        context: 'Card titles - Dark mode (text-gray-100 on glassmorphism)'
      },

      // Viktoria yellow combinations
      {
        fg: DESIGN_COLORS['text-gray-800'],
        bg: DESIGN_COLORS['viktoria-yellow'],
        context: 'Active buttons (text-gray-800 on viktoria-yellow)'
      },
      {
        fg: '#000000',
        bg: DESIGN_COLORS['viktoria-yellow'],
        context: 'Active buttons (black text on viktoria-yellow)'
      },

      // Viktoria blue combinations
      {
        fg: '#ffffff',
        bg: DESIGN_COLORS['viktoria-blue'],
        context: 'Primary brand elements (white on viktoria-blue)'
      },
      {
        fg: DESIGN_COLORS['text-gray-100'],
        bg: DESIGN_COLORS['viktoria-blue'],
        context: 'Primary brand elements (text-gray-100 on viktoria-blue)'
      },

      // Secondary text combinations
      {
        fg: DESIGN_COLORS['text-gray-700'],
        bg: '#ffffff',
        context: 'Secondary text - Light mode'
      },
      {
        fg: DESIGN_COLORS['text-gray-300'],
        bg: '#000000',
        context: 'Secondary text - Dark mode'
      }
    ];

    combinations.forEach(combo => {
      const result = this.validateCombination(combo.fg, combo.bg, combo.context);
      this.results.push(result);
    });
  }

  // Test live page color combinations
  async testLivePageCombinations() {
    console.log('🌐 Testing live page color combinations...');

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const pages = ['/news', '/teams', '/shop', '/kontakt'];

    for (const pagePath of pages) {
      try {
        await page.goto(`http://localhost:3000${pagePath}`, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });

        // Test both themes
        for (const theme of ['light', 'dark']) {
          await page.evaluate((theme) => {
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(theme);
          }, theme);

          await new Promise(resolve => setTimeout(resolve, 500));

          const pageResults = await page.evaluate(() => {
            const results = [];
            
            // Test card titles
            const cardTitles = document.querySelectorAll('h3[class*="text-gray-800"], h3[class*="text-gray-100"]');
            cardTitles.forEach((title, index) => {
              const styles = window.getComputedStyle(title);
              const rect = title.getBoundingClientRect();
              
              if (rect.width > 0 && rect.height > 0) { // Only visible elements
                results.push({
                  element: `Card Title ${index + 1}`,
                  textColor: styles.color,
                  backgroundColor: styles.backgroundColor,
                  fontSize: styles.fontSize,
                  fontWeight: styles.fontWeight,
                  selector: title.className
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
                  textColor: styles.color,
                  backgroundColor: styles.backgroundColor,
                  fontSize: styles.fontSize,
                  fontWeight: styles.fontWeight,
                  selector: element.className
                });
              }
            });

            return results;
          });

          // Process results
          pageResults.forEach(result => {
            const textRgb = this.parseRgbColor(result.textColor);
            const bgRgb = this.parseRgbColor(result.backgroundColor);
            
            if (textRgb && bgRgb) {
              const validation = this.validateCombination(
                textRgb,
                bgRgb,
                `${pagePath} - ${theme} - ${result.element}`
              );
              
              validation.fontSize = result.fontSize;
              validation.fontWeight = result.fontWeight;
              validation.selector = result.selector;
              
              this.results.push(validation);
            }
          });
        }
      } catch (error) {
        console.error(`❌ Error testing ${pagePath}:`, error.message);
      }
    }

    await browser.close();
  }

  parseRgbColor(colorString) {
    const match = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return null;
  }

  async generateReport() {
    console.log('📊 Generating color contrast report...');

    const passed = this.results.filter(r => r.wcagAA).length;
    const total = this.results.length;
    const passRate = Math.round((passed / total) * 100);

    const report = `# Color Contrast Validation Report

Generated: ${new Date().toISOString()}

## Summary
- **Total Tests**: ${total}
- **WCAG AA Passed**: ${passed}/${total} (${passRate}%)
- **WCAG AA Failed**: ${total - passed}/${total}

## Results

| Context | Foreground | Background | Ratio | Grade | Status |
|---------|------------|------------|-------|-------|--------|
${this.results.map(r => {
  const fg = typeof r.foreground === 'string' ? r.foreground : `rgb(${r.foreground.r},${r.foreground.g},${r.foreground.b})`;
  const bg = typeof r.background === 'string' ? r.background : `rgb(${r.background.r},${r.background.g},${r.background.b})`;
  const status = r.wcagAA ? '✅ Pass' : '❌ Fail';
  return `| ${r.context} | ${fg} | ${bg} | ${r.ratio}:1 | ${r.grade} | ${status} |`;
}).join('\n')}

## Recommendations

${this.generateRecommendations()}

## Design Standards Compliance

### Card Titles
${this.analyzeCardTitles()}

### Viktoria Colors
${this.analyzeViktoriaColors()}
`;

    await fs.writeFile('color-contrast-report.md', report);
    console.log('✅ Color contrast report saved to color-contrast-report.md');
    
    return { passed, total, passRate };
  }

  generateRecommendations() {
    const failed = this.results.filter(r => !r.wcagAA);
    
    if (failed.length === 0) {
      return '✅ All color combinations meet WCAG AA standards!';
    }

    let recommendations = '### Failed Combinations\n\n';
    failed.forEach(result => {
      recommendations += `- **${result.context}**: Ratio ${result.ratio}:1 (needs ${WCAG_AA_NORMAL}:1)\n`;
      recommendations += `  - Consider darkening foreground or lightening background\n`;
    });

    return recommendations;
  }

  analyzeCardTitles() {
    const cardTitleResults = this.results.filter(r => r.context.includes('Card title') || r.context.includes('Card Title'));
    const passed = cardTitleResults.filter(r => r.wcagAA).length;
    
    return `Card title combinations: ${passed}/${cardTitleResults.length} passed WCAG AA standards.`;
  }

  analyzeViktoriaColors() {
    const viktoriaResults = this.results.filter(r => 
      r.context.includes('viktoria') || 
      r.context.includes('Viktoria') ||
      (typeof r.background === 'string' && r.background.includes('#FFD700'))
    );
    const passed = viktoriaResults.filter(r => r.wcagAA).length;
    
    return `Viktoria color combinations: ${passed}/${viktoriaResults.length} passed WCAG AA standards.`;
  }

  async runValidation() {
    console.log('🚀 Starting color contrast validation...\n');

    // Test design standards combinations
    this.testDesignStandardsCombinations();

    // Test live page combinations
    await this.testLivePageCombinations();

    // Generate report
    const summary = await this.generateReport();

    console.log('\n📊 VALIDATION SUMMARY');
    console.log('===================');
    console.log(`WCAG AA Compliance: ${summary.passRate}% (${summary.passed}/${summary.total})`);
    
    if (summary.passRate < 100) {
      console.log('❌ Some color combinations need improvement');
      return false;
    } else {
      console.log('✅ All color combinations meet WCAG AA standards');
      return true;
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ColorContrastValidator();
  validator.runValidation().catch(console.error);
}

module.exports = ColorContrastValidator;