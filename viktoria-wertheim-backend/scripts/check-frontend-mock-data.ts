#!/usr/bin/env ts-node

/**
 * Frontend Mock Data Detection Script
 * Scans frontend components for remaining mock data usage
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface MockDataIssue {
  file: string;
  line: number;
  content: string;
  type: 'mock_data' | 'fallback' | 'static_data' | 'todo';
  severity: 'high' | 'medium' | 'low';
}

class MockDataDetector {
  private issues: MockDataIssue[] = [];
  private frontendPath = path.join(__dirname, '../../viktoria-wertheim-frontend/src');

  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow
    };
    console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
  }

  private scanFile(filePath: string): void {
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim().toLowerCase();
      
      // Patterns to detect mock data usage
      const patterns = [
        { regex: /mock|Mock|MOCK/, type: 'mock_data' as const, severity: 'high' as const },
        { regex: /fallback|Fallback|FALLBACK/, type: 'fallback' as const, severity: 'high' as const },
        { regex: /static.*data|dummy.*data|test.*data/, type: 'static_data' as const, severity: 'medium' as const },
        { regex: /todo.*mock|todo.*fallback|fixme.*mock/i, type: 'todo' as const, severity: 'medium' as const },
        { regex: /console\.warn.*fallback|console\.warn.*mock/i, type: 'fallback' as const, severity: 'low' as const }
      ];

      patterns.forEach(pattern => {
        if (pattern.regex.test(line)) {
          // Skip comments that are just explaining the removal
          if (trimmedLine.includes('// removed') || trimmedLine.includes('* removed')) {
            return;
          }

          this.issues.push({
            file: path.relative(process.cwd(), filePath),
            line: lineNumber,
            content: line.trim(),
            type: pattern.type,
            severity: pattern.severity
          });
        }
      });
    });
  }

  private scanDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      this.log(`Directory not found: ${dirPath}`, 'warning');
      return;
    }

    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.scanDirectory(itemPath);
      } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.jsx'))) {
        this.scanFile(itemPath);
      }
    });
  }

  async runScan(): Promise<void> {
    this.log('🔍 Scanning Frontend for Mock Data Usage', 'info');
    this.log(`Scanning: ${this.frontendPath}`, 'info');
    console.log('');

    this.scanDirectory(this.frontendPath);
    this.generateReport();
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(60));
    this.log('📊 MOCK DATA DETECTION REPORT', 'info');
    console.log('='.repeat(60));

    const highSeverity = this.issues.filter(i => i.severity === 'high');
    const mediumSeverity = this.issues.filter(i => i.severity === 'medium');
    const lowSeverity = this.issues.filter(i => i.severity === 'low');

    this.log(`🔴 High Priority Issues: ${highSeverity.length}`, 'error');
    this.log(`🟡 Medium Priority Issues: ${mediumSeverity.length}`, 'warning');
    this.log(`🟢 Low Priority Issues: ${lowSeverity.length}`, 'info');

    if (this.issues.length === 0) {
      this.log('🎉 No mock data issues found! Frontend is clean.', 'success');
      return;
    }

    console.log('\n📋 Issues by Severity:');

    // High severity issues
    if (highSeverity.length > 0) {
      console.log('\n🔴 HIGH PRIORITY (Must fix before migration):');
      highSeverity.forEach(issue => {
        console.log(`  ${chalk.red('●')} ${issue.file}:${issue.line}`);
        console.log(`    ${chalk.gray(issue.content)}`);
        console.log(`    Type: ${issue.type}`);
      });
    }

    // Medium severity issues
    if (mediumSeverity.length > 0) {
      console.log('\n🟡 MEDIUM PRIORITY (Should fix):');
      mediumSeverity.forEach(issue => {
        console.log(`  ${chalk.yellow('●')} ${issue.file}:${issue.line}`);
        console.log(`    ${chalk.gray(issue.content)}`);
        console.log(`    Type: ${issue.type}`);
      });
    }

    // Low severity issues
    if (lowSeverity.length > 0) {
      console.log('\n🟢 LOW PRIORITY (Optional):');
      lowSeverity.forEach(issue => {
        console.log(`  ${chalk.green('●')} ${issue.file}:${issue.line}`);
        console.log(`    ${chalk.gray(issue.content)}`);
        console.log(`    Type: ${issue.type}`);
      });
    }

    console.log('\n🎯 Recommendations:');
    
    if (highSeverity.length > 0) {
      this.log('❌ CRITICAL: High priority mock data issues found. Migration should be postponed.', 'error');
      console.log('   Action: Remove all mock data fallbacks and replace with proper loading/empty states');
    } else if (mediumSeverity.length > 0) {
      this.log('⚠️ WARNING: Some mock data remnants found but may be acceptable.', 'warning');
    } else {
      this.log('✅ SUCCESS: No critical mock data issues! Ready for migration.', 'success');
    }

    // Group by file for easier fixing
    const fileGroups = this.issues.reduce((acc, issue) => {
      if (!acc[issue.file]) acc[issue.file] = [];
      acc[issue.file].push(issue);
      return acc;
    }, {} as Record<string, MockDataIssue[]>);

    console.log('\n📁 Issues by File:');
    Object.entries(fileGroups).forEach(([file, issues]) => {
      console.log(`  ${file}: ${issues.length} issue(s)`);
    });
  }
}

// Run the scan
async function main() {
  const detector = new MockDataDetector();
  
  try {
    await detector.runScan();
  } catch (error) {
    console.error(chalk.red('Failed to scan for mock data:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { MockDataDetector };