@echo off
echo 🔍 Windows 11 Localhost-Diagnose
echo =================================

echo.
echo 1. WINDOWS DEFENDER FIREWALL prüfen...
echo ----------------------------------------
netsh advfirewall show allprofiles state
echo.

echo 2. LOCALHOST LOOPBACK prüfen...
echo --------------------------------
netsh interface ipv4 show config
echo.

echo 3. PORT 1337 prüfen...
echo ----------------------
netstat -an | findstr :1337
echo.

echo 4. HOSTS-DATEI prüfen...
echo ------------------------
type C:\Windows\System32\drivers\etc\hosts | findstr localhost
echo.

echo 5. WINDOWS DEFENDER ECHTZEITSCHUTZ...
echo -------------------------------------
powershell "Get-MpPreference | Select-Object -Property DisableRealtimeMonitoring"
echo.

echo 6. LOOPBACK ADAPTER STATUS...
echo -----------------------------
ipconfig | findstr "127.0.0.1"
echo.

echo 7. NETZWERK-ISOLATION prüfen...
echo -------------------------------
powershell "Get-AppxPackage | Where-Object {$_.Name -like '*NetworkIsolation*'}"
echo.

echo Drücke eine Taste um fortzufahren...
pause >nul