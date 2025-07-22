@echo off
echo 🔪 Port 1337 freigeben
echo =====================

echo Suche Prozesse auf Port 1337...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :1337') do (
    echo Beende Prozess mit PID: %%a
    taskkill /f /pid %%a 2>nul
)

echo.
echo Prüfe Port-Status nach Bereinigung...
netstat -an | findstr :1337

echo.
echo Port 1337 sollte jetzt frei sein!
echo Starte Strapi mit: npm run develop

pause