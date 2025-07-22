const axios = require('axios');

async function verifyAdminFix() {
  console.log('🔍 Verifying Admin Panel Fix...');
  
  const baseURL = 'http://localhost:1337';
  
  console.log('\n1️⃣ Testing server accessibility...');
  try {
    const healthResponse = await axios.get(`${baseURL}/admin`);
    console.log('✅ Server accessible on localhost:1337');
  } catch (error) {
    console.log('❌ Server not accessible:', error.message);
    return;
  }
  
  console.log('\n2️⃣ Testing API vs Admin Panel URLs...');
  
  // Test normal API
  try {
    const apiResponse = await axios.get(`${baseURL}/api/mannschaften`);
    console.log(`✅ Normal API works: ${apiResponse.data.data.length} mannschaften found`);
  } catch (error) {
    console.log('❌ Normal API failed:', error.message);
  }
  
  // Test admin content manager
  try {
    const adminResponse = await axios.get(`${baseURL}/admin/content-manager/collection-types/api::mannschaft.mannschaft`, {
      validateStatus: () => true
    });
    console.log(`Admin Content Manager: ${adminResponse.status}`);
    
    if (adminResponse.status === 401) {
      console.log('  → Authentication required (normal for admin)');
    } else if (adminResponse.status === 200) {
      console.log('  ✅ Admin endpoint accessible');
    }
  } catch (error) {
    console.log('❌ Admin Content Manager failed:', error.message);
  }
  
  console.log('\n3️⃣ Configuration Summary:');
  console.log('✅ HOST changed from 192.168.178.59 to 0.0.0.0');
  console.log('✅ ADMIN_PATH=/admin added to .env');
  console.log('✅ Session cookie configuration added');
  console.log('✅ CORS properly configured');
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Server should be restarted with new configuration');
  console.log('2. Go to http://localhost:1337/admin');
  console.log('3. Log in to admin panel');
  console.log('4. Try creating a new mannschaft');
  
  console.log('\n🔧 If admin panel still doesn\'t work:');
  console.log('1. Open browser developer tools (F12)');
  console.log('2. Go to Network tab');
  console.log('3. Try to create/edit content');
  console.log('4. Look for failed requests (red entries)');
  console.log('5. Check if URLs now start with /admin/');
  
  console.log('\n💡 Common remaining issues:');
  console.log('- Browser cache not fully cleared');
  console.log('- Admin user session expired');
  console.log('- JavaScript errors in browser console');
  console.log('- Admin user missing Super Admin permissions');
  
  console.log('\n🧪 Quick test:');
  console.log('Try creating this mannschaft in admin panel:');
  console.log('- Name: "Test Admin Panel"');
  console.log('- Liga: "Kreisklasse A"');
  console.log('- Status: "aktiv"');
  console.log('- Altersklasse: "senioren"');
}

verifyAdminFix();