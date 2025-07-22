console.log('🔍 Strapi Admin Panel Request Debugging');
console.log('==========================================\n');

// Instruktionen für Browser-Debugging
console.log('SCHRITT 1: Browser Developer Tools öffnen');
console.log('- Drücke F12 in Chromium');
console.log('- Gehe zum "Network" Tab');
console.log('- Aktiviere "Preserve log"\n');

console.log('SCHRITT 2: Strapi Admin öffnen');
console.log('- Gehe zu http://localhost:1337/admin');
console.log('- Logge dich ein\n');

console.log('SCHRITT 3: Mannschaft erstellen/bearbeiten');
console.log('- Versuche eine Mannschaft zu erstellen');
console.log('- Schaue im Network Tab nach dem fehlgeschlagenen Request\n');

console.log('SCHRITT 4: Request Details analysieren');
console.log('- Finde den 400 Bad Request');
console.log('- Klicke darauf');
console.log('- Schaue unter "Response" nach der Fehlermeldung');
console.log('- Schaue unter "Request URL" nach der URL\n');

console.log('WICHTIGE FRAGEN:');
console.log('1. Ist die URL: http://localhost:1337/admin/content-manager/... ?');
console.log('2. Oder fehlt wirklich das /admin: http://localhost:1337/content-manager/... ?');
console.log('3. Was steht in der Response (Fehlermeldung)?');
console.log('4. Welche Daten werden im Request Body gesendet?\n');

console.log('ALTERNATIVE: Direkte API Tests');
console.log('Führe diese Befehle aus um die API zu testen:');
console.log('node scripts/debug-admin-permissions.js');
console.log('node scripts/test-admin-creation.js');