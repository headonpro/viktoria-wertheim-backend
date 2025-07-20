#!/usr/bin/env ts-node

/**
 * Real Mock Data Detection Script
 * Focuses on actual mock data usage, not legitimate UI fallbacks
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface MockDataIssue {
  file: string;
  line: number;
  content: string;
  type: 'mock_data' | 'api_fallback' | 'hardcoded_data';
  severity: 'critical' | 'warning';
  description: string;
}

class RealMockDataDetector {
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
      const trimmedLine = line.trim();
      
      // Skip legitimate UI fallbacks
      if (this.isLegitimateUIFallback(trimmedLine)) {
        return;
      }

      // Look for actual mock data patterns
      this.checkForMockData(filePath, lineNumber, trimmedLine);
      this.checkForAPIFallbacks(filePath, lineNumber, trimmedLine);
      this.checkForHardcodedData(filePath, lineNumber, trimmedLine);
    });
  }

  private isLegitimateUIFallback(line: string): boolean {
    const legitimatePatterns = [
      /fallback\?\s*:/,  // React prop fallbacks
      /fallback\s*=\s*null/,  // Default fallback props
      /fallback.*React\.ReactNode/,  // TypeScript fallback types
      /ThemeContext.*fallback/,  // Theme fallbacks
      /ProtectedRoute.*fallback/,  // Auth fallbacks
      /static\s+(async\s+)?[a-zA-Z]/,  // Static class methods
      /private\s+static\s+readonly/,  // Static constants
    ];

    return legitimatePatterns.some(pattern => pattern.test(line));
  }

  private checkForMockData(filePath: string, lineNumber: number, line: string): void {
    const mockPatterns = [
      { regex: /const\s+mock[A-Z]/i, desc: 'Mock data constant' },
      { regex: /mockData\s*=/i, desc: 'Mock data assignment' },
      { regex: /\/\*.*mock.*data.*\*\//i, desc: 'Mock data comment' },
      { regex: /dummyData|testData|sampleData/i, desc: 'Dummy/test data' }
    ];

    mockPatterns.forEach(pattern => {
      if (pattern.regex.test(line)) {
        this.issues.push({
          file: path.relative(process.cwd(), filePath),
          line: lineNumber,
          content: line.trim(),
          type: 'mock_data',
          severity: 'critical',
          description: pattern.desc
        });
      }
    });
  }

  private checkForAPIFallbacks(filePath: string, lineNumber: number, line: string): void {
    const apiFallbackPatterns = [
      { regex: /catch.*apiError.*fallback/i, desc: 'API error fallback to mock data' },
      { regex: /api.*not.*available.*fallback/i, desc: 'API unavailable fallback' },
      { regex: /setTeamData\(.*static.*data\)/i, desc: 'Fallback to static team data' },
      { regex: /console\.warn.*fallback.*api/i, desc: 'API fallback warning' }
    ];

    apiFallbackPatterns.forEach(pattern => {
      if (pattern.regex.test(line)) {
        this.issues.push({
          file: path.relative(process.cwd(), filePath),
          line: lineNumber,
          content: line.trim(),
          type: 'api_fallback',
          severity: 'critical',
          description: pattern.desc
        });
      }
    });
  }

  private checkForHardcodedData(filePath: string, lineNumber: number, line: string): void {
    // Look for hardcoded arrays of data that look like mock content
    const hardcodedPatterns = [
      { regex: /const\s+\w+\s*=\s*\[.*{.*name.*:.*".*".*}.*\]/i, desc: 'Hardcoded data array' },
      { regex: /sponsors\s*=\s*\[.*{/i, desc: 'Hardcoded sponsors array' },
      { regex: /teams\s*=\s*\[.*{/i, desc: 'Hardcoded teams array' },
      { regex: /news\s*=\s*\[.*{/i, desc: 'Hardcoded news array' }
    ];

    hardcodedPatterns.forEach(pattern => {
      if (pattern.regex.test(line)) {
        this.issues.push({
          file: path.relative(process.cwd(), filePath),
          line: lineNumber,
          content: line.trim(),
          type: 'hardcoded_data',
          severity: 'warning',
          description: pattern.desc
        });
      }
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
      } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
        this.scanFile(itemPath);
      }
    });
  }

  async runScan(): Promise<void> {
    this.log('🔍 Scanning for REAL Mock Data Issues', 'info');
    this.log(`Scanning: ${this.frontendPath}`, 'info');
    console.log('');

    this.scanDirectory(this.frontendPath);
    this.generateReport();
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(60));
    this.log('📊 REAL MOCK DATA DETECTION REPORT', 'info');
    console.log('='.repeat(60));

    const critical = this.issues.filter(i => i.severity === 'critical');
    const warnings = this.issues.filter(i => i.severity === 'warning');

    this.log(`🔴 Critical Issues: ${critical.length}`, 'error');
    this.log(`🟡 Warning Issues: ${warnings.length}`, 'warning');

    if (this.issues.length === 0) {
      this.log('🎉 No real mock data issues found! Frontend is clean for migration.', 'success');
      return;
    }

    // Critical issues
    if (critical.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES (Must fix before migration):');
      critical.forEach(issue => {
        console.log(`  ${chalk.red('●')} ${issue.file}:${issue.line}`);
        console.log(`    ${chalk.gray(issue.content)}`);
        console.log(`    ${chalk.yellow(issue.description)}`);
        console.log('');
      });
    }

    // Warning issues
    if (warnings.length > 0) {
      console.log('\n🟡 WARNING ISSUES (Should review):');
      warnings.forEach(issue => {
        console.log(`  ${chalk.yellow('●')} ${issue.file}:${issue.line}`);
        console.log(`    ${chalk.gray(issue.content)}`);
        console.log(`    ${chalk.yellow(issue.description)}`);
        console.log('');
      });
    }

    console.log('\n🎯 Migration Readiness:');
    
    if (critical.length > 0) {
      this.log('❌ NOT READY: Critical mock data issues must be resolved first.', 'error');
    } else if (warnings.length > 0) {
      this.log('⚠️ MOSTLY READY: Review warning issues, but migration can proceed.', 'warning');
    } else {
      this.log('✅ READY: No mock data blocking migration!', 'success');
    }
  }
}

// Run the scan
async function main() {
  const detector = new RealMockDataDetector();
  
  try {
    await detector.runScan();
  } catch (error) {
    console.error(chalk.red('Failed to scan for real mock data:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { RealMockDataDetector };