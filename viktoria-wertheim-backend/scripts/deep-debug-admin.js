console.log('🔍 Deep Debug: Strapi Admin Problem');
console.log('=====================================\n');

console.log('SCHRITT 1: Browser Console öffnen');
console.log('- Drücke F12 in Chrome');
console.log('- Gehe zum "Console" Tab');
console.log('- Gehe zu http://localhost:1337/admin');
console.log('- Schaue nach roten Fehlermeldungen\n');

console.log('SCHRITT 2: Network Tab prüfen');
console.log('- F12 → Network Tab');
console.log('- "Preserve log" aktivieren');
console.log('- Seite neu laden (F5)');
console.log('- Schaue nach fehlgeschlagenen Requests (rot)\n');

console.log('SCHRITT 3: Teste verschiedene URLs');
console.log('Teste diese URLs einzeln in Chrome:');
console.log('1. http://localhost:1337');
console.log('2. http://localhost:1337/admin');
console.log('3. http://127.0.0.1:1337');
console.log('4. http://127.0.0.1:1337/admin');
console.log('5. http://localhost:1337/admin (localhost)\n');

console.log('SCHRITT 4: Inkognito-Modus testen');
console.log('- Strg+Shift+N (Chrome Inkognito)');
console.log('- Gehe zu http://localhost:1337/admin');
console.log('- Funktioniert es im Inkognito-Modus?\n');

console.log('SCHRITT 5: JavaScript-Test');
console.log('- F12 → Console');
console.log('- Tippe ein: fetch("http://localhost:1337/api/mannschaften")');
console.log('- Drücke Enter');
console.log('- Was passiert?\n');

console.log('WICHTIGE FRAGEN:');
console.log('1. Welche Fehlermeldungen siehst du in der Console?');
console.log('2. Welche URL funktioniert (localhost vs 127.0.0.1 vs lokale IP)?');
console.log('3. Funktioniert es im Inkognito-Modus?');
console.log('4. Was zeigt der Network Tab?');

console.log('\nFühre diese Tests durch und teile die Ergebnisse mit mir!');