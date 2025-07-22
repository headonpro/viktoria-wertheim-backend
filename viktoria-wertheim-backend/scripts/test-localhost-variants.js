const axios = require('axios');

async function testLocalhostVariants() {
    console.log('🔍 Teste verschiedene Localhost-Varianten...\n');
    
    const variants = [
        'http://localhost:1337/admin',
        'http://127.0.0.1:1337/admin',
        'http://0.0.0.0:1337/admin',
        'http://[::1]:1337/admin'
    ];
    
    for (const url of variants) {
        try {
            console.log(`Testing: ${url}`);
            const response = await axios.get(url, { 
                timeout: 5000,
                validateStatus: () => true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            console.log(`✅ Status: ${response.status}`);
            
            // Prüfe auf Debug-Hinweise in Response
            const html = response.data;
            if (typeof html === 'string') {
                if (html.includes('remote-debugging') || html.includes('debug')) {
                    console.log('⚠️ Debug-Hinweise in HTML gefunden');
                }
                if (html.includes('Strapi')) {
                    console.log('✅ Strapi Admin Panel erkannt');
                }
            }
            
        } catch (error) {
            console.log(`❌ Fehler: ${error.message}`);
        }
        console.log('---');
    }
    
    // Teste auch die API
    console.log('\n🔧 Teste Strapi API...');
    try {
        const apiResponse = await axios.get('http://localhost:1337/api/mannschaften', {
            timeout: 3000
        });
        console.log('✅ API funktioniert:', apiResponse.status);
    } catch (error) {
        console.log('❌ API Fehler:', error.message);
    }
}

testLocalhostVariants().catch(console.error);