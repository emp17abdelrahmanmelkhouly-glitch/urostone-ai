@echo off
setlocal
title UroStone AI - Mobile Access Server (EAU Protocol)
cd /d "%~dp0"

echo ====================================================================
echo   UROSTONE AI - MOBILE NETWORK SERVER (AIN SHAMS UNIVERSITY)
echo ====================================================================
echo.
echo Initializing zero-dependency local network HTTP server...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0mobile_server.ps1"

pause
