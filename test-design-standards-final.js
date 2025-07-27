const fs = require('fs');
const path = require('path');

// Test-Konfiguration für Designstandards
const DESIGN_STANDARDS = {
  cardTitle: {
    expected: 'text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide',
    description: 'Standardisierte Card-Titel'
  },
  glassmorphismCard: {
    expected: 'relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl',
    description: 'Glasmorphism Card Container'
  },
  layoutContainer: {
    expected: 'container max-w-4xl lg:max-w-5xl lg:mx-auto space-y-6 md:space-y-8',
    description: 'Einheitliche Layout-Container'
  },
  responsivePadding: {
    expected: 'px-4 md:px-6 lg:px-0',
    description: 'Responsive Padding'
  }
};

// Zu testende Seiten
const PAGES_TO_TEST = [
  'frontend/src/app/impressum/page.tsx',
  'frontend/src/app/datenschutz/page.tsx', 
  'frontend/src/app/agb/page.tsx',
  'frontend/src/app/vorstand/page.tsx',
  'frontend/src/app/sponsoren/page.tsx'
];

console.log('🔍 FINALE DESIGNSTANDARDS-VALIDIERUNG');
console.log('=====================================\n');

let totalTests = 0;
let passedTests = 0;
let results = [];

// Test-Funktion für einzelne Seite
function testPage(filePath) {
  const pageName = path.basename(path.dirname(filePath));
  console.log(`📄 Teste Seite: ${pageName}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Datei nicht gefunden: ${filePath}`);
    return { page: pageName, tests: [], passed: 0, total: 0 };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const pageResults = { page: pageName, tests: [], passed: 0, total: 0 };
  
  // Test 1: Card-Titel Standard
  totalTests++;
  pageResults.total++;
  const hasTitleStandard = content.includes(DESIGN_STANDARDS.cardTitle.expected);
  if (hasTitleStandard) {
    console.log(`  ✅ Card-Titel Standard gefunden`);
    pageResults.passed++;
    passedTests++;
    pageResults.tests.push({ name: 'Card-Titel', status: 'PASS' });
  } else {
    console.log(`  ❌ Card-Titel Standard fehlt`);
    pageResults.tests.push({ name: 'Card-Titel', status: 'FAIL' });
  }
  
  // Test 2: Glasmorphism Cards
  totalTests++;
  pageResults.total++;
  const hasGlassmorphism = content.includes(DESIGN_STANDARDS.glassmorphismCard.expected);
  if (hasGlassmorphism) {
    console.log(`  ✅ Glasmorphism Cards gefunden`);
    pageResults.passed++;
    passedTests++;
    pageResults.tests.push({ name: 'Glasmorphism Cards', status: 'PASS' });
  } else {
    console.log(`  ❌ Glasmorphism Cards fehlen`);
    pageResults.tests.push({ name: 'Glasmorphism Cards', status: 'FAIL' });
  }
  
  // Test 3: Layout Container
  totalTests++;
  pageResults.total++;
  const hasLayoutContainer = content.includes(DESIGN_STANDARDS.layoutContainer.expected);
  if (hasLayoutContainer) {
    console.log(`  ✅ Layout Container Standard gefunden`);
    pageResults.passed++;
    passedTests++;
    pageResults.tests.push({ name: 'Layout Container', status: 'PASS' });
  } else {
    console.log(`  ❌ Layout Container Standard fehlt`);
    pageResults.tests.push({ name: 'Layout Container', status: 'FAIL' });
  }
  
  // Test 4: Responsive Padding
  totalTests++;
  pageResults.total++;
  const hasResponsivePadding = content.includes(DESIGN_STANDARDS.responsivePadding.expected);
  if (hasResponsivePadding) {
    console.log(`  ✅ Responsive Padding gefunden`);
    pageResults.passed++;
    passedTests++;
    pageResults.tests.push({ name: 'Responsive Padding', status: 'PASS' });
  } else {
    console.log(`  ❌ Responsive Padding fehlt`);
    pageResults.tests.push({ name: 'Responsive Padding', status: 'FAIL' });
  }
  
  // Test 5: Dynamic Imports
  totalTests++;
  pageResults.total++;
  const hasDynamicImports = content.includes('const AnimatedSection = dynamic(');
  if (hasDynamicImports) {
    console.log(`  ✅ Dynamic Imports gefunden`);
    pageResults.passed++;
    passedTests++;
    pageResults.tests.push({ name: 'Dynamic Imports', status: 'PASS' });
  } else {
    console.log(`  ❌ Dynamic Imports fehlen`);
    pageResults.tests.push({ name: 'Dynamic Imports', status: 'FAIL' });
  }
  
  // Test 6: Korrekte Farbverwendung (keine viktoria-blue/yellow für normale Titel)
  totalTests++;
  pageResults.total++;
  const hasIncorrectColors = content.includes('text-viktoria-blue dark:text-white') || 
                            content.includes('text-viktoria-yellow');
  if (!hasIncorrectColors) {
    console.log(`  ✅ Korrekte Farbverwendung`);
    pageResults.passed++;
    passedTests++;
    pageResults.tests.push({ name: 'Farbverwendung', status: 'PASS' });
  } else {
    console.log(`  ❌ Inkorrekte Farbverwendung gefunden`);
    pageResults.tests.push({ name: 'Farbverwendung', status: 'FAIL' });
  }
  
  console.log(`  📊 Seite ${pageName}: ${pageResults.passed}/${pageResults.total} Tests bestanden\n`);
  return pageResults;
}

// Alle Seiten testen
PAGES_TO_TEST.forEach(filePath => {
  const result = testPage(filePath);
  results.push(result);
});

// Finale Auswertung
console.log('📊 FINALE ERGEBNISSE');
console.log('===================');
console.log(`Gesamt: ${passedTests}/${totalTests} Tests bestanden (${Math.round(passedTests/totalTests*100)}%)\n`);

// Detaillierte Ergebnisse pro Seite
results.forEach(result => {
  const percentage = Math.round(result.passed/result.total*100);
  const status = percentage === 100 ? '✅' : percentage >= 80 ? '⚠️' : '❌';
  console.log(`${status} ${result.page}: ${result.passed}/${result.total} (${percentage}%)`);
});

console.log('\n🎯 DESIGNSTANDARDS-COMPLIANCE');
console.log('=============================');

if (passedTests === totalTests) {
  console.log('🎉 PERFEKT! Alle Designstandards wurden korrekt implementiert!');
  console.log('✅ 100% Konsistenz erreicht');
  console.log('✅ Alle Seiten folgen den Corporate Design Standards');
  console.log('✅ Mobile-first responsive Design implementiert');
  console.log('✅ Dark Mode vollständig unterstützt');
} else if (passedTests >= totalTests * 0.9) {
  console.log('🟡 SEHR GUT! Fast alle Standards implementiert');
  console.log(`⚠️ ${totalTests - passedTests} Tests benötigen noch Aufmerksamkeit`);
} else {
  console.log('🔴 VERBESSERUNG NÖTIG');
  console.log(`❌ ${totalTests - passedTests} Tests fehlgeschlagen`);
}

// Spezifische Empfehlungen
console.log('\n💡 EMPFEHLUNGEN');
console.log('===============');

const failedPages = results.filter(r => r.passed < r.total);
if (failedPages.length === 0) {
  console.log('✅ Keine Verbesserungen erforderlich - alle Standards erfüllt!');
} else {
  failedPages.forEach(page => {
    console.log(`📄 ${page.page}:`);
    page.tests.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`  - ${test.name} implementieren`);
    });
  });
}

console.log('\n🚀 NÄCHSTE SCHRITTE');
console.log('==================');
console.log('1. Browser-Kompatibilität testen');
console.log('2. Performance-Validierung durchführen');
console.log('3. Accessibility-Tests ausführen');
console.log('4. Cross-Device Testing');

process.exit(passedTests === totalTests ? 0 : 1);