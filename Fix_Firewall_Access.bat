@echo off
setlocal
title UroStone AI - Local Network Firewall Configuration
echo ====================================================================
echo   UROSTONE AI - MOBILE NETWORK ACCESS FIREWALL CONFIGURATION
echo   Ain Shams University & EAU Clinical Calculus Workstation
echo ====================================================================
echo.
echo Checking administrator permissions...
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Elevating to Administrator to update Windows Firewall...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b 0
)

echo [+] Removing any legacy rules for Port 8080...
netsh advfirewall firewall delete rule name="UroStone AI Mobile Server (Port 8080)" >nul 2>&1

echo [+] Creating Inbound Rule: Allow TCP Port 8080 on Private and Public networks...
netsh advfirewall firewall add rule name="UroStone AI Mobile Server (Port 8080)" dir=in action=allow protocol=TCP localport=8080 profile=any >nul 2>&1

echo.
echo ====================================================================
echo   FIREWALL CONFIGURATION COMPLETE!
echo ====================================================================
echo.
echo   [+] Port 8080 is now open for incoming smartphone Wi-Fi connections.
echo   [+] You can now scan the QR code from your iPhone or Android phone.
echo.
pause
exit /b 0
