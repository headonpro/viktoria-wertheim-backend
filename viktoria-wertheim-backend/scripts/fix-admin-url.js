console.log('🔧 Admin Panel URL Fix Instructions');
console.log('=====================================');

console.log('\n❌ PROBLEM IDENTIFIED:');
console.log('The admin panel is still using the wrong URL:');
console.log('❌ http://localhost:1337/content-manager/collection-types/...');
console.log('✅ Should be: http://localhost:1337/admin/content-manager/collection-types/...');

console.log('\n🔧 AGGRESSIVE CACHE CLEARING STEPS:');
console.log('1. Close ALL browser windows completely');
console.log('2. Open Task Manager and end all browser processes');
console.log('3. Clear browser data:');
console.log('   - Press Ctrl + Shift + Delete');
console.log('   - Select "All time"');
console.log('   - Check ALL boxes (cookies, cache, site data, etc.)');
console.log('   - Click "Clear data"');

console.log('\n🔧 ALTERNATIVE: Use Different Browser');
console.log('1. If you were using Chrome, try Firefox or Edge');
console.log('2. Or use Incognito/Private mode in a different browser');

console.log('\n🔧 NUCLEAR OPTION: Clear Strapi Admin Build');
console.log('1. Stop the Strapi server');
console.log('2. Delete the build folder:');
console.log('   - Delete: viktoria-wertheim-backend/build/');
console.log('   - Delete: viktoria-wertheim-backend/.cache/');
console.log('3. Restart Strapi server (it will rebuild)');

console.log('\n🎯 TEST STEPS:');
console.log('1. Go to http://localhost:1337/admin');
console.log('2. Open F12 → Network tab');
console.log('3. Try to create a mannschaft');
console.log('4. Check if URLs now start with /admin/');

console.log('\n💡 EXPECTED RESULT:');
console.log('URLs should look like:');
console.log('✅ PUT http://localhost:1337/admin/content-manager/collection-types/api::mannschaft.mannschaft/...');

console.log('\n🚨 IF STILL NOT WORKING:');
console.log('The admin panel JavaScript files are cached.');
console.log('Try the nuclear option above to force rebuild.');

console.log('\n📋 QUICK VERIFICATION:');
console.log('After clearing cache, the Network tab should show:');
console.log('- GET requests to /admin/... (not just /content-manager/...)');
console.log('- PUT/POST requests to /admin/content-manager/...');
console.log('- No 400 Bad Request errors');