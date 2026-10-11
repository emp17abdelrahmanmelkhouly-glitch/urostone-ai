@echo off
title UroStone AI - Deploy to Netlify (100%% Free 24/7 Hosting)
color 0B
cls
echo ===============================================================================
echo            Deploy UroStone AI to Netlify (100%% Free 24/7 Forever)
echo ===============================================================================
echo.
echo Packaging fresh web distribution (500 KB)...

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_zip.ps1" >nul

echo.
echo Done! Created:
echo   - Folder: "website-to-upload" (500 KB clean web files)
echo   - Package: "UroStone_AI_Standalone.zip" (124 KB)
echo.
echo Opening Netlify Manual Deploy page and your folder...
start https://app.netlify.com/drop
start explorer.exe /select,"%~dp0website-to-upload"

echo.
echo ===============================================================================
echo  INSTRUCTIONS:
echo  1. In the browser, make sure you are logged into Netlify (free, no credit card).
echo  2. Drag either the "website-to-upload" folder OR "UroStone_AI_Standalone.zip"
echo     into the upload box on screen!
echo  3. It will upload in 2 seconds and be online 24/7 worldwide!
echo ===============================================================================
echo.
timeout /t 5 >nul
