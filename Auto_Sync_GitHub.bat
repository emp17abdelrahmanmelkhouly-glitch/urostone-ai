@echo off
title UroStone AI - Live Auto-Sync to GitHub
color 0A
cls

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0auto_sync.ps1"

if errorlevel 1 (
    echo.
    pause
)
