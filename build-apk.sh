#!/bin/bash

# ============================================
# Carpenter Optimizer - APK Build Script
# ============================================
# यह script automatically APK बनाता है

set -e

echo "🔨 Carpenter Optimizer APK Build Started..."
echo "=================================================="

# Step 1: Dependencies check
echo "✅ Step 1: Checking dependencies..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js v16+"
    exit 1
fi
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found."
    exit 1
fi
echo "✓ Node.js and npm found"

# Step 2: Install npm packages
echo ""
echo "✅ Step 2: Installing dependencies..."
npm install

# Step 3: Build React app
echo ""
echo "✅ Step 3: Building React app..."
npm run build
echo "✓ Build complete. dist/ folder ready."

# Step 4: Install Capacitor
echo ""
echo "✅ Step 4: Installing Capacitor..."
npm install @capacitor/core @capacitor/cli @capacitor/android

# Step 5: Initialize Capacitor (if not already done)
echo ""
echo "✅ Step 5: Setting up Capacitor..."
if [ ! -f "capacitor.config.json" ]; then
    npx cap init
fi

# Step 6: Add Android platform
echo ""
echo "✅ Step 6: Adding Android platform..."
if [ ! -d "android" ]; then
    npx cap add android
fi

# Step 7: Copy web assets
echo ""
echo "✅ Step 7: Copying web assets to Android..."
npx cap copy

# Step 8: Sync with Android
echo ""
echo "✅ Step 8: Syncing with Android..."
npx cap sync

echo ""
echo "=================================================="
echo "✅ All preparation complete!"
echo "=================================================="
echo ""
echo "📱 Next steps:"
echo ""
echo "Option A: Build from Command Line"
echo "  cd android"
echo "  ./gradlew assembleRelease"
echo ""
echo "Option B: Open in Android Studio"
echo "  npx cap open android"
echo "  Then: Build → Build Bundle(s) / APK(s) → Build APK(s)"
echo ""
echo "Output APK locations:"
echo "  Debug:   android/app/build/outputs/apk/debug/app-debug.apk"
echo "  Release: android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "🚀 Happy building!"
