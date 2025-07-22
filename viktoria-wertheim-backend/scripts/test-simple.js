console.log('🚀 Test-Skript läuft...');
console.log('require.main:', require.main);
console.log('module:', module);
console.log('require.main === module:', require.main === module);

if (require.main === module) {
  console.log('✅ Als Hauptmodul ausgeführt');
} else {
  console.log('❌ Nicht als Hauptmodul ausgeführt');
}

console.log('✅ Test abgeschlossen');