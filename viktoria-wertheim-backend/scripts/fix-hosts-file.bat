@echo off
echo 🔧 Hosts-Datei Fix für localhost
echo =================================

echo Aktuelle hosts-Datei:
type C:\Windows\System32\drivers\etc\hosts | findstr localhost

echo.
echo PROBLEM: localhost ist auskommentiert (#)
echo LÖSUNG: Entferne # vor localhost-Einträgen

echo.
echo MANUELLER FIX (als Administrator):
echo 1. Öffne Notepad als Administrator
echo 2. Öffne: C:\Windows\System32\drivers\etc\hosts
echo 3. Ändere diese Zeilen:
echo    #       127.0.0.1       localhost
echo    #       ::1             localhost
echo.
echo    ZU:
echo    127.0.0.1       localhost
echo    ::1             localhost
echo.
echo 4. Speichern und Notepad schließen

echo.
echo ODER verwende diesen PowerShell-Befehl (als Administrator):
echo (Get-Content C:\Windows\System32\drivers\etc\hosts) -replace '#       127.0.0.1       localhost', '127.0.0.1       localhost' -replace '#       ::1             localhost', '::1             localhost' ^| Set-Content C:\Windows\System32\drivers\etc\hosts

pause