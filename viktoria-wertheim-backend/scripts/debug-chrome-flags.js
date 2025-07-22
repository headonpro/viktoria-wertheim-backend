console.log('🔍 Chrome Debug-Flags Analyse');
console.log('==============================\n');

// Prüfe Chrome-Kommandozeilen-Flags
if (typeof window !== 'undefined' && window.chrome) {
    console.log('✅ Chrome API verfügbar');
    
    // Prüfe ob Remote Debugging aktiv ist
    if (window.chrome.runtime) {
        console.log('🔧 Chrome Runtime verfügbar');
    }
} else {
    console.log('❌ Chrome API nicht verfügbar');
}

// Prüfe User Agent
console.log('🌐 User Agent:', navigator.userAgent);

// Prüfe ob DevTools offen sind
let devtools = {open: false, orientation: null};
const threshold = 160;

setInterval(() => {
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
            devtools.open = true;
            console.log('🛠️ DevTools wurden geöffnet');
        }
    } else {
        if (devtools.open) {
            devtools.open = false;
            console.log('❌ DevTools wurden geschlossen');
        }
    }
}, 500);

// Prüfe Sicherheitskontext
console.log('🔒 Sicherheitskontext:');
console.log('- isSecureContext:', window.isSecureContext);
console.log('- location.protocol:', window.location.protocol);
console.log('- location.hostname:', window.location.hostname);

// Prüfe ob localhost als unsicher markiert ist
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🏠 Localhost erkannt');
    
    // Prüfe Mixed Content
    if (window.location.protocol === 'https:') {
        console.log('⚠️ HTTPS auf localhost - könnte Probleme verursachen');
    } else {
        console.log('✅ HTTP auf localhost - normal');
    }
}

// Prüfe ob Extensions die Debug-Warnung auslösen
console.log('🧩 Browser Extensions Check...');
setTimeout(() => {
    const scripts = document.querySelectorAll('script');
    const extensions = [];
    
    scripts.forEach(script => {
        if (script.src && script.src.includes('chrome-extension://')) {
            extensions.push(script.src);
        }
    });
    
    if (extensions.length > 0) {
        console.log('🔌 Aktive Extensions gefunden:', extensions);
    } else {
        console.log('✅ Keine Extension-Scripts erkannt');
    }
}, 2000);