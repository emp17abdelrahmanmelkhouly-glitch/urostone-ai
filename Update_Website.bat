@echo off
title UroStone AI - Update GitHub Live Website
color 0A
cls
echo ===============================================================================
echo            UroStone AI: Update Live GitHub Pages Website
echo ===============================================================================
echo.
echo 1. Refreshing updated code into "website-to-upload"...

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0prepare_dist.ps1" >nul

echo.
echo 2. Opening your updated web folder...
start explorer.exe /select,"%~dp0website-to-upload"

echo.
echo ===============================================================================
echo  HOW TO APPLY UPDATES TO GITHUB (Takes 20 seconds):
echo.
echo  1. Go to your GitHub repository page: https://github.com
echo  2. Click "Add file" -> "Upload files".
echo  3. Drag the updated files from the folder that just opened into GitHub.
echo  4. Click "Commit changes".
echo.
echo  GitHub Pages will automatically update your live site within ~30 seconds!
echo ===============================================================================
echo.
pause
