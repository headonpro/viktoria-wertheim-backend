@echo off
echo 🚀 Sauberer Chromium Start für Strapi
echo ====================================

echo Starte Chromium ohne Debug-Flags...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window http://localhost:1337/admin

echo.
echo Falls Chrome nicht gefunden wird, starte manuell:
echo 1. Chromium öffnen
echo 2. Neue Registerkarte
echo 3. http://localhost:1337/admin eingeben

echo.
echo ✅ Chromium sollte jetzt normal laufen (ohne Debug-Warnung)