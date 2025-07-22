@echo off
echo 🔧 Chromium Debug-Modus Fix
echo ===========================

echo.
echo PROBLEM: Chromium läuft im Debug-Modus!
echo Das verursacht JavaScript und Admin-Panel Probleme.

echo.
echo LÖSUNG:
echo 1. Schließe ALLE Chromium-Fenster komplett
echo 2. Warte 5 Sekunden
echo 3. Starte Chromium normal neu (ohne Debug-Flags)

echo.
echo SCHRITT 1: Alle Chromium-Prozesse beenden...
taskkill /f /im chromium.exe 2>nul
taskkill /f /im chrome.exe 2>nul
echo ✅ Chromium-Prozesse beendet

echo.
echo SCHRITT 2: Warte 5 Sekunden...
timeout /t 5 /nobreak >nul

echo.
echo SCHRITT 3: Starte Chromium normal
echo Öffne Chromium jetzt MANUELL (nicht über dieses Script)
echo Dann gehe zu: http://localhost:1337/admin

echo.
echo WICHTIG: Starte Chromium NICHT mit diesen Flags:
echo ❌ --remote-debugging-port
echo ❌ --disable-web-security  
echo ❌ --disable-features

echo.
echo Drücke eine Taste um fortzufahren...
pause >nul