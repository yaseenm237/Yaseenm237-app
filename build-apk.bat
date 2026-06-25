#!/bin/bash

# ============================================
# Carpenter Optimizer - Windows APK Build Script
# ============================================
# Windows के लिए batch file version

@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo Carpenter Optimizer - APK Build Started
echo ============================================
echo.

REM Step 1: Check Node.js
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js v16+
    pause
    exit /b 1
)
echo OK: Node.js found

REM Step 2: Install dependencies
echo.
echo Installing npm packages...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

REM Step 3: Build React app
echo.
echo Building React application...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo OK: Build complete

REM Step 4: Install Capacitor
echo.
echo Installing Capacitor...
call npm install @capacitor/core @capacitor/cli @capacitor/android

REM Step 5: Setup Capacitor
echo.
echo Setting up Capacitor...
if not exist "capacitor.config.json" (
    call npx cap init
)

REM Step 6: Add Android
echo.
echo Adding Android platform...
if not exist "android" (
    call npx cap add android
)

REM Step 7: Copy assets
echo.
echo Copying web assets...
call npx cap copy

REM Step 8: Sync
echo.
echo Syncing with Android...
call npx cap sync

echo.
echo ============================================
echo All preparation complete!
echo ============================================
echo.
echo Next steps:
echo.
echo Option A: From Command Line
echo   cd android
echo   gradlew.bat assembleRelease
echo.
echo Option B: Open in Android Studio
echo   npx cap open android
echo   Then: Build menu - Build APK(s)
echo.
echo APK output:
echo   Debug:   android\app\build\outputs\apk\debug\app-debug.apk
echo   Release: android\app\build\outputs\apk\release\app-release.apk
echo.
echo Happy building!
echo.
pause
