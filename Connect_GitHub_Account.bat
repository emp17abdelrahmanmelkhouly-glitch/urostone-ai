@echo off
title UroStone AI - Connect GitHub Account & Push
color 0B
cls

echo ===============================================================================
echo            UroStone AI: Connect GitHub Account & Push Live Site
echo ===============================================================================
echo.
echo 1. Opening GitHub authorization in your web browser...
echo    (Look at your browser and click the green "Authorize" / "Sign in" button!)
echo.

"C:\Program Files\Git\ucrt64\bin\git-credential-manager.exe" github login

echo.
echo 2. Pushing latest UroStone AI updates to your GitHub website...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync_github.ps1"
