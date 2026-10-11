@echo off
setlocal enabledelayedexpansion
title UroStone AI - Launching Clinical Workstation...

:: Change to directory of this script
cd /d "%~dp0"

set "HTML_FILE=%~dp0index.html"
set "DATA_DIR=%~dp0.desktop-data"

:: Ensure local data directory exists for isolated desktop persistence
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

:: 1. Auto-Start Local Network Mobile Server in background if not already active
netstat -ano | findstr /R ":8080.*LISTENING" >nul 2>&1
if %errorLevel% neq 0 (
    echo Starting Mobile Access Server in background...
    start "" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0mobile_server.ps1" -NoBrowser
    timeout /t 1 /nobreak >nul
)

:: Format file path with forward slashes for chromium file URL fallback
set "FILE_URL=file:///%HTML_FILE:\=/%"
set "APP_TARGET=http://localhost:8080"

:: Check if server is answering on 8080, fallback to file URL if needed
netstat -ano | findstr /R ":8080.*LISTENING" >nul 2>&1
if %errorLevel% neq 0 (
    set "APP_TARGET=%FILE_URL%"
)

:: Check Google Chrome (64-bit)
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="%APP_TARGET%" --window-size=1440,920 --window-position=40,40 --user-data-dir="%DATA_DIR%" --no-first-run --disable-default-apps
    exit /b 0
)

:: Check Google Chrome (32-bit)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --app="%APP_TARGET%" --window-size=1440,920 --window-position=40,40 --user-data-dir="%DATA_DIR%" --no-first-run --disable-default-apps
    exit /b 0
)

:: Check Microsoft Edge (x86)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="%APP_TARGET%" --window-size=1440,920 --window-position=40,40 --user-data-dir="%DATA_DIR%" --no-first-run --disable-default-apps
    exit /b 0
)

:: Check Microsoft Edge (64-bit)
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app="%APP_TARGET%" --window-size=1440,920 --window-position=40,40 --user-data-dir="%DATA_DIR%" --no-first-run --disable-default-apps
    exit /b 0
)

:: Fallback to default browser
start "" "%APP_TARGET%"
exit /b 0
