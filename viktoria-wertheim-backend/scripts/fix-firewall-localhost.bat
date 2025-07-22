@echo off
echo 🔥 Windows Defender Firewall Fix für localhost
echo ===============================================

echo WICHTIG: Führe dieses Script als Administrator aus!
echo.

echo Erstelle Firewall-Regel für Port 1337 (eingehend)...
netsh advfirewall firewall add rule name="Strapi Development Port 1337 IN" dir=in action=allow protocol=TCP localport=1337

echo.
echo Erstelle Firewall-Regel für Port 1337 (ausgehend)...
netsh advfirewall firewall add rule name="Strapi Development Port 1337 OUT" dir=out action=allow protocol=TCP localport=1337

echo.
echo Erstelle Firewall-Regel für localhost...
netsh advfirewall firewall add rule name="Localhost Development" dir=in action=allow remoteip=127.0.0.1

echo.
echo Prüfe erstellte Regeln...
netsh advfirewall firewall show rule name="Strapi Development Port 1337 IN"

echo.
echo ✅ Firewall-Regeln erstellt!
echo Teste jetzt: http://localhost:1337/admin

pause