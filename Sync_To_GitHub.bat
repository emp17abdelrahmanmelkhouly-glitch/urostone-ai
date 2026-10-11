@echo off
title UroStone AI - Sync to GitHub
color 0B
cls

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync_github.ps1"
