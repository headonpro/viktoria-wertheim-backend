@echo off
echo 🔄 TCP-Verbindungen für Port 1337 zurücksetzen
echo ==============================================

echo Aktuelle Verbindungen auf Port 1337:
netstat -an | findstr :1337

echo.
echo Setze TCP-Stack zurück...
netsh int ip reset

echo.
echo Lösche DNS-Cache...
ipconfig /flushdns

echo.
echo Setze Winsock zurück...
netsh winsock reset

echo.
echo ⚠️ WICHTIG: Computer MUSS neu gestartet werden!
echo Nach Neustart:
echo 1. Strapi starten: npm run develop
echo 2. Browser öffnen: http://localhost:1337/admin

echo.
echo Jetzt neu starten? (J/N)
set /p restart="Eingabe: "
if /i "%restart%"=="J" shutdown /r /t 10
if /i "%restart%"=="j" shutdown /r /t 10

pause