/**
 * Browser Compatibility Validation
 * Validates CSS and HTML for cross-browser compatibility
 */

const fs = require('fs').promises;
const path = require('path');

class BrowserCompatibilityValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        warnings: 0
      },
      details: [],
      recommendations: []
    };
  }

  async validateImplementation() {
    console.log('🔍 Validating Browser Compatibility Implementation...\n');
    
    try {
      await this.validateCSS();
      await this.validateHTML();
      await this.validateJavaScript();
      await this.validateResponsiveDesign();
      await this.validateAccessibility();
      
      await this.generateReport();
      
      console.log('\n📊 Browser Compatibility Validation Results:');
      console.log(`Total Checks: ${this.results.summary.totalChecks}`);
      console.log(`Passed: ${this.results.summary.passedChecks}`);
      console.log(`Failed: ${this.results.summary.failedChecks}`);
      console.log(`Warnings: ${this.results.summary.warnings}`);
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  async validateCSS() {
    console.log('🎨 Validating CSS Compatibility...');
    
    // Check Tailwind config for browser compatibility
    try {
      const tailwindConfig = await this.readFile('frontend/tailwind.config.js');
      
      // Check for custom Viktoria colors
      const hasViktoriaColors = tailwindConfig.includes('viktoria-yellow') && 
                               tailwindConfig.includes('viktoria-blue');
      
      this.recordResult(
        hasViktoriaColors,
        'css-viktoria-colors',
        hasViktoriaColors ? 'Viktoria colors defined in Tailwind config' : 'Viktoria colors missing from config'
      );
      
      // Check for responsive breakpoints
      const hasResponsiveBreakpoints = tailwindConfig.includes('sm:') || 
                                     tailwindConfig.includes('md:') || 
                                     tailwindConfig.includes('lg:');
      
      this.recordResult(
        hasResponsiveBreakpoints,
        'css-responsive-breakpoints',
        hasResponsiveBreakpoints ? 'Responsive breakpoints configured' : 'Responsive breakpoints may be missing'
      );
      
    } catch (error) {
      this.recordResult(false, 'css-config', `Failed to read Tailwind config: ${error.message}`);
    }
    
    // Validate glassmorphism CSS properties
    await this.validateGlasmorphismCSS();
    
    // Validate theme switching CSS
    await this.validateThemeCSS();
  }

  async validateGlasmorphismCSS() {
    console.log('  🔍 Checking glassmorphism effects...');
    
    const cssPatterns = [
      'backdrop-blur-xl',
      'bg-gray-100/11',
      'dark:bg-white/[0.012]',
      'shadow-[0_4px_16px_rgba',
      'dark:shadow-[0_4px_16px_rgba'
    ];
    
    try {
      // Check component files for glassmorphism patterns
      const componentFiles = await this.findFiles('frontend/src', '.tsx');
      
      for (const file of componentFiles.slice(0, 10)) { // Check first 10 files
        const content = await this.readFile(file);
        
        const hasGlasmorphism = cssPatterns.some(pattern => content.includes(pattern));
        
        if (hasGlasmorphism) {
          this.recordResult(
            true,
            'glassmorphism-implementation',
            `Glassmorphism effects found in ${path.basename(file)}`
          );
          
          // Check for browser compatibility considerations
          const hasWebkitPrefix = content.includes('-webkit-backdrop-filter');
          if (!hasWebkitPrefix && content.includes('backdrop-blur')) {
            this.recordResult(
              false,
              'glassmorphism-webkit-prefix',
              `${path.basename(file)} may need -webkit-backdrop-filter for Safari`,
              'warning'
            );
          }
        }
      }
      
    } catch (error) {
      this.recordResult(false, 'glassmorphism-validation', `Glassmorphism validation failed: ${error.message}`);
    }
  }

  async validateThemeCSS() {
    console.log('  🌓 Checking theme switching implementation...');
    
    const themePatterns = [
      'dark:text-gray-100',
      'text-gray-800',
      'dark:bg-',
      'bg-gray-'
    ];
    
    try {
      const componentFiles = await this.findFiles('frontend/src', '.tsx');
      
      let themeImplementationFound = false;
      
      for (const file of componentFiles.slice(0, 10)) {
        const content = await this.readFile(file);
        
        const hasThemeClasses = themePatterns.some(pattern => content.includes(pattern));
        
        if (hasThemeClasses) {
          themeImplementationFound = true;
          this.recordResult(
            true,
            'theme-implementation',
            `Theme classes found in ${path.basename(file)}`
          );
        }
      }
      
      this.recordResult(
        themeImplementationFound,
        'theme-overall',
        themeImplementationFound ? 'Theme switching implementation detected' : 'No theme switching implementation found'
      );
      
    } catch (error) {
      this.recordResult(false, 'theme-validation', `Theme validation failed: ${error.message}`);
    }
  }

  async validateHTML() {
    console.log('📄 Validating HTML Structure...');
    
    try {
      const componentFiles = await this.findFiles('frontend/src', '.tsx');
      
      for (const file of componentFiles.slice(0, 5)) {
        const content = await this.readFile(file);
        
        // Check for semantic HTML
        const hasSemanticElements = ['<header', '<main', '<section', '<article', '<nav'].some(tag => 
          content.includes(tag)
        );
        
        if (content.includes('export default') || content.includes('export function')) {
          this.recordResult(
            hasSemanticElements,
            'html-semantic',
            `${path.basename(file)}: ${hasSemanticElements ? 'Uses semantic HTML' : 'Could benefit from semantic HTML'}`,
            hasSemanticElements ? 'pass' : 'warning'
          );
        }
        
        // Check for accessibility attributes
        const hasAccessibilityAttrs = ['aria-', 'role=', 'alt='].some(attr => 
          content.includes(attr)
        );
        
        if (content.includes('<img') || content.includes('<button')) {
          this.recordResult(
            hasAccessibilityAttrs,
            'html-accessibility',
            `${path.basename(file)}: ${hasAccessibilityAttrs ? 'Has accessibility attributes' : 'Missing accessibility attributes'}`,
            hasAccessibilityAttrs ? 'pass' : 'warning'
          );
        }
      }
      
    } catch (error) {
      this.recordResult(false, 'html-validation', `HTML validation failed: ${error.message}`);
    }
  }

  async validateJavaScript() {
    console.log('⚡ Validating JavaScript Compatibility...');
    
    try {
      // Check for modern JavaScript features that might need polyfills
      const jsFiles = await this.findFiles('frontend/src', '.tsx');
      
      const modernFeatures = [
        { pattern: 'async/await', regex: /async\s+\w+|await\s+/ },
        { pattern: 'arrow functions', regex: /=>\s*{|=>\s*\w/ },
        { pattern: 'destructuring', regex: /const\s*{.*}|const\s*\[.*\]/ },
        { pattern: 'template literals', regex: /`.*\${.*}.*`/ }
      ];
      
      for (const file of jsFiles.slice(0, 5)) {
        const content = await this.readFile(file);
        
        for (const feature of modernFeatures) {
          if (feature.regex.test(content)) {
            this.recordResult(
              true,
              'js-modern-features',
              `${path.basename(file)}: Uses ${feature.pattern} (ensure browser support)`,
              'warning'
            );
          }
        }
      }
      
    } catch (error) {
      this.recordResult(false, 'js-validation', `JavaScript validation failed: ${error.message}`);
    }
  }

  async validateResponsiveDesign() {
    console.log('📱 Validating Responsive Design Implementation...');
    
    try {
      const componentFiles = await this.findFiles('frontend/src', '.tsx');
      
      const responsivePatterns = [
        'text-sm md:text-base',
        'rounded-xl md:rounded-2xl',
        'sm:',
        'md:',
        'lg:',
        'xl:'
      ];
      
      let responsiveImplementationFound = false;
      
      for (const file of componentFiles.slice(0, 10)) {
        const content = await this.readFile(file);
        
        const hasResponsiveClasses = responsivePatterns.some(pattern => content.includes(pattern));
        
        if (hasResponsiveClasses) {
          responsiveImplementationFound = true;
          this.recordResult(
            true,
            'responsive-implementation',
            `${path.basename(file)}: Contains responsive classes`
          );
          
          // Check for specific design standard implementations
          if (content.includes('text-sm md:text-base')) {
            this.recordResult(
              true,
              'responsive-font-size',
              `${path.basename(file)}: Implements responsive font sizing`
            );
          }
          
          if (content.includes('rounded-xl md:rounded-2xl')) {
            this.recordResult(
              true,
              'responsive-border-radius',
              `${path.basename(file)}: Implements responsive border radius`
            );
          }
        }
      }
      
      this.recordResult(
        responsiveImplementationFound,
        'responsive-overall',
        responsiveImplementationFound ? 'Responsive design implementation found' : 'No responsive design implementation detected'
      );
      
    } catch (error) {
      this.recordResult(false, 'responsive-validation', `Responsive design validation failed: ${error.message}`);
    }
  }

  async validateAccessibility() {
    console.log('♿ Validating Accessibility Implementation...');
    
    try {
      const componentFiles = await this.findFiles('frontend/src', '.tsx');
      
      const accessibilityPatterns = [
        'aria-label',
        'aria-describedby',
        'role=',
        'alt=',
        'tabIndex',
        'onKeyDown',
        'onKeyPress'
      ];
      
      let accessibilityImplementationFound = false;
      
      for (const file of componentFiles.slice(0, 10)) {
        const content = await this.readFile(file);
        
        const hasAccessibilityFeatures = accessibilityPatterns.some(pattern => content.includes(pattern));
        
        if (hasAccessibilityFeatures) {
          accessibilityImplementationFound = true;
          this.recordResult(
            true,
            'accessibility-implementation',
            `${path.basename(file)}: Contains accessibility features`
          );
        }
        
        // Check for keyboard navigation support
        if (content.includes('onKeyDown') || content.includes('onKeyPress')) {
          this.recordResult(
            true,
            'accessibility-keyboard',
            `${path.basename(file)}: Supports keyboard navigation`
          );
        }
      }
      
      this.recordResult(
        accessibilityImplementationFound,
        'accessibility-overall',
        accessibilityImplementationFound ? 'Accessibility features implemented' : 'Limited accessibility implementation detected',
        accessibilityImplementationFound ? 'pass' : 'warning'
      );
      
    } catch (error) {
      this.recordResult(false, 'accessibility-validation', `Accessibility validation failed: ${error.message}`);
    }
  }

  async findFiles(directory, extension) {
    const files = [];
    
    try {
      const items = await fs.readdir(directory, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(directory, item.name);
        
        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          const subFiles = await this.findFiles(fullPath, extension);
          files.push(...subFiles);
        } else if (item.isFile() && item.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist, continue
    }
    
    return files;
  }

  async readFile(filePath) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read ${filePath}: ${error.message}`);
    }
  }

  recordResult(passed, testType, message, level = 'pass') {
    this.results.summary.totalChecks++;
    
    if (level === 'warning') {
      this.results.summary.warnings++;
    } else if (passed) {
      this.results.summary.passedChecks++;
    } else {
      this.results.summary.failedChecks++;
    }
    
    this.results.details.push({
      timestamp: new Date().toISOString(),
      passed,
      testType,
      message,
      level
    });
    
    const icon = level === 'warning' ? '⚠️' : (passed ? '✅' : '❌');
    console.log(`  ${icon} ${message}`);
  }

  async generateReport() {
    // Generate recommendations
    this.generateRecommendations();
    
    const report = {
      testSuite: 'Browser Compatibility Validation',
      timestamp: this.results.timestamp,
      summary: this.results.summary,
      details: this.results.details,
      recommendations: this.results.recommendations
    };
    
    await fs.writeFile('browser-compatibility-validation-report.json', JSON.stringify(report, null, 2));
    
    const readableReport = this.generateReadableReport(report);
    await fs.writeFile('browser-compatibility-validation-report.md', readableReport);
    
    console.log('\n📄 Reports generated:');
    console.log('- browser-compatibility-validation-report.json');
    console.log('- browser-compatibility-validation-report.md');
  }

  generateRecommendations() {
    const failedTests = this.results.details.filter(d => !d.passed && d.level !== 'warning');
    const warnings = this.results.details.filter(d => d.level === 'warning');
    
    if (failedTests.length === 0 && warnings.length === 0) {
      this.results.recommendations.push('✅ All browser compatibility checks passed successfully');
    }
    
    if (failedTests.length > 0) {
      this.results.recommendations.push(`🔧 Address ${failedTests.length} failed compatibility checks`);
    }
    
    if (warnings.length > 0) {
      this.results.recommendations.push(`⚠️ Review ${warnings.length} compatibility warnings`);
    }
    
    // Specific recommendations based on test results
    const glassmorphismIssues = this.results.details.filter(d => d.testType.includes('glassmorphism') && !d.passed);
    if (glassmorphismIssues.length > 0) {
      this.results.recommendations.push('🎨 Add -webkit-backdrop-filter prefixes for Safari compatibility');
    }
    
    const themeIssues = this.results.details.filter(d => d.testType.includes('theme') && !d.passed);
    if (themeIssues.length > 0) {
      this.results.recommendations.push('🌓 Implement comprehensive theme switching with dark: prefixes');
    }
    
    const responsiveIssues = this.results.details.filter(d => d.testType.includes('responsive') && !d.passed);
    if (responsiveIssues.length > 0) {
      this.results.recommendations.push('📱 Add responsive breakpoint classes (sm:, md:, lg:, xl:)');
    }
    
    const accessibilityIssues = this.results.details.filter(d => d.testType.includes('accessibility') && d.level === 'warning');
    if (accessibilityIssues.length > 0) {
      this.results.recommendations.push('♿ Enhance accessibility with ARIA labels and keyboard navigation');
    }
  }

  generateReadableReport(report) {
    return `# Browser Compatibility Validation Report

Generated: ${report.timestamp}

## Summary

- **Total Checks**: ${report.summary.totalChecks}
- **Passed**: ${report.summary.passedChecks}
- **Failed**: ${report.summary.failedChecks}
- **Warnings**: ${report.summary.warnings}
- **Success Rate**: ${((report.summary.passedChecks / report.summary.totalChecks) * 100).toFixed(1)}%

## Validation Results

### ✅ Passed Checks
${report.details.filter(d => d.passed && d.level !== 'warning').map(d => `- ${d.message}`).join('\n') || 'None'}

### ❌ Failed Checks
${report.details.filter(d => !d.passed && d.level !== 'warning').map(d => `- ${d.message}`).join('\n') || 'None'}

### ⚠️ Warnings
${report.details.filter(d => d.level === 'warning').map(d => `- ${d.message}`).join('\n') || 'None'}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Browser Compatibility Checklist

Based on the validation results, here's what to test manually:

### Chrome (Primary Browser)
- ✅ Modern CSS features supported
- ✅ Glassmorphism effects should work
- ✅ Theme switching functionality
- ✅ Responsive design breakpoints

### Firefox
- ⚠️ Limited backdrop-filter support
- ✅ Good CSS Grid and Flexbox support
- ✅ Theme switching should work
- ✅ Responsive design supported

### Safari
- ⚠️ Requires -webkit-backdrop-filter prefix
- ✅ Good mobile touch support
- ✅ Theme switching should work
- ✅ Responsive design supported

### Edge (Chromium-based)
- ✅ Similar to Chrome compatibility
- ✅ Modern CSS features supported
- ✅ Good overall compatibility expected

## Next Steps

1. **Manual Testing**: Use the generated testing guide for comprehensive browser testing
2. **Fix Issues**: Address any failed checks identified in this validation
3. **Cross-Browser Testing**: Test on actual browsers to confirm compatibility
4. **Performance Testing**: Validate performance across different browsers
5. **Accessibility Testing**: Ensure all interactive elements are accessible

## Files Analyzed

This validation checked the following areas:
- Tailwind CSS configuration
- React/TypeScript component files
- Glassmorphism CSS implementations
- Theme switching implementations
- Responsive design patterns
- Accessibility features

## Validation Scope

This automated validation covers:
- ✅ CSS compatibility patterns
- ✅ HTML semantic structure
- ✅ JavaScript modern features
- ✅ Responsive design implementation
- ✅ Accessibility features
- ❌ Actual browser rendering (requires manual testing)
- ❌ Performance metrics (requires separate testing)
- ❌ Touch interaction behavior (requires device testing)
`;
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new BrowserCompatibilityValidator();
  validator.validateImplementation().catch(console.error);
}

module.exports = BrowserCompatibilityValidator;