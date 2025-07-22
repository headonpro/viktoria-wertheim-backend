@echo off
echo 🔧 Hosts-Datei Formatierung korrigieren
echo =======================================

echo PROBLEM GEFUNDEN:
echo Die IPv6 localhost-Zeile hat falsches Format:
echo "::1             localhost" (ohne Leerzeichen)
echo.
echo SOLLTE SEIN:
echo "::1             localhost" (mit Leerzeichen)

echo.
echo MANUELLER FIX:
echo 1. Öffne Notepad als Administrator
echo 2. Öffne: C:\Windows\System32\drivers\etc\hosts
echo 3. Finde die Zeile: ::1             localhost
echo 4. Ändere zu: ::1             localhost (mit Leerzeichen zwischen ::1 und localhost)
echo 5. Speichern

echo.
echo ODER PowerShell-Befehl (als Administrator):
echo (Get-Content C:\Windows\System32\drivers\etc\hosts) -replace '::1localhost', '::1             localhost' ^| Set-Content C:\Windows\System32\drivers\etc\hosts

echo.
echo Nach dem Fix:
echo - DNS-Cache leeren: ipconfig /flushdns
echo - Browser neu starten
echo - Strapi testen: http://localhost:1337/admin

pause