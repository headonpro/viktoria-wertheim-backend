const axios = require('axios');

async function testLocalhostFix() {
    console.log('🧪 Teste localhost-Fix nach hosts-Datei Änderung...\n');
    
    // 1. Teste DNS-Auflösung
    console.log('1. DNS-Auflösung testen...');
    const dns = require('dns');
    
    try {
        const addresses = await new Promise((resolve, reject) => {
            dns.lookup('localhost', (err, address, family) => {
                if (err) reject(err);
                else resolve({ address, family });
            });
        });
        console.log(`✅ localhost löst auf zu: ${addresses.address} (IPv${addresses.family})`);
    } catch (error) {
        console.log(`❌ DNS-Auflösung fehlgeschlagen: ${error.message}`);
        return;
    }
    
    // 2. Teste verschiedene localhost-Varianten
    const testUrls = [
        'http://localhost:1337',
        'http://localhost:1337/admin',
        'http://localhost:1337/api/mannschaften',
        'http://127.0.0.1:1337',
        'http://127.0.0.1:1337/admin'
    ];
    
    console.log('\n2. HTTP-Verbindungen testen...');
    
    for (const url of testUrls) {
        try {
            console.log(`\nTesting: ${url}`);
            const response = await axios.get(url, {
                timeout: 5000,
                validateStatus: () => true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            console.log(`✅ Status: ${response.status} ${response.statusText}`);
            
            if (response.status === 200) {
                if (url.includes('/admin')) {
                    console.log('🎉 Admin Panel erreichbar!');
                } else if (url.includes('/api/')) {
                    console.log('🔌 API erreichbar!');
                } else {
                    console.log('🌐 Server erreichbar!');
                }
            }
            
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log('❌ Verbindung verweigert - Server läuft nicht');
            } else if (error.code === 'ETIMEDOUT') {
                console.log('❌ Timeout - Firewall blockiert möglicherweise');
            } else {
                console.log(`❌ Fehler: ${error.message}`);
            }
        }
    }
    
    // 3. Teste Admin Panel spezifisch
    console.log('\n3. Admin Panel Deep-Test...');
    try {
        const adminResponse = await axios.get('http://localhost:1337/admin', {
            timeout: 10000,
            validateStatus: () => true
        });
        
        if (adminResponse.status === 200) {
            const html = adminResponse.data;
            if (typeof html === 'string') {
                if (html.includes('Strapi')) {
                    console.log('✅ Strapi Admin Panel HTML korrekt geladen');
                }
                if (html.includes('content-manager')) {
                    console.log('✅ Content Manager verfügbar');
                }
            }
        }
    } catch (error) {
        console.log(`❌ Admin Panel Test fehlgeschlagen: ${error.message}`);
    }
    
    console.log('\n🎯 FAZIT:');
    console.log('Wenn alle Tests ✅ zeigen, dann war der hosts-Fix erfolgreich!');
    console.log('Öffne jetzt Chrome und gehe zu: http://localhost:1337/admin');
}

testLocalhostFix().catch(console.error);