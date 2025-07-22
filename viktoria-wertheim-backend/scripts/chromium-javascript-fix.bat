@echo off
echo 🔧 Chromium JavaScript Fix
echo ========================

echo.
echo 1. Chromium mit JavaScript-Debug starten:
echo chromium --enable-javascript-harmony --disable-web-security --user-data-dir="temp-profile"

echo.
echo 2. Oder normale Chromium-Einstellungen zurücksetzen:
echo - Gehe zu: chrome://settings/reset
echo - "Restore settings to original defaults"

echo.
echo 3. JavaScript-Test-URL:
echo file:///%~dp0test-javascript-chromium.html

echo.
echo 4. Strapi Admin nach Fix:
echo http://localhost:1337/admin

echo.
echo Drücke eine Taste um fortzufahren...
pause > nul