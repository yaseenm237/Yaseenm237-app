#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================="
echo "🛠️  Starting Smart Carpentry APK Builder"
echo "========================================="

# 1. Build the web application
echo "📦 Step 1: Building Web Assets (Vite)..."
npm run build

# 2. Check if android directory exists, if not add it
if [ ! -d "android" ]; then
  echo "📱 Step 2: Adding Android Platform..."
  npx cap add android
else
  echo "📱 Step 2: Android Platform already exists."
fi

# 3. Handle JDK Configuration to resolve "Unsupported class file major version 69"
echo "☕ Step 3: Configuring JDK..."

# Check if JAVA_HOME is set
if [ -z "$JAVA_HOME" ]; then
  # Try to find SDKMAN Java 17 or fallback
  if [ -d "/usr/local/sdkman/candidates/java/17.0.10-tem" ]; then
    export JAVA_HOME="/usr/local/sdkman/candidates/java/17.0.10-tem"
  elif [ -d "/home/vscode/.sdkman/candidates/java/17.0.10-tem" ]; then
    export JAVA_HOME="/home/vscode/.sdkman/candidates/java/17.0.10-tem"
  else
    # Fallback to system java if found
    export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
  fi
fi

echo "👉 Using JAVA_HOME: $JAVA_HOME"

# Double check gradle.properties exists
mkdir -p android
if [ -f "android/gradle.properties" ]; then
  # Remove existing org.gradle.java.home if any to avoid duplicates
  sed -i '/org.gradle.java.home/d' android/gradle.properties
  
  # Append the correct Java home
  echo "org.gradle.java.home=$JAVA_HOME" >> android/gradle.properties
  echo "✅ Updated android/gradle.properties with correct Java Home."
else
  echo "org.gradle.java.home=$JAVA_HOME" > android/gradle.properties
  echo "✅ Created android/gradle.properties with correct Java Home."
fi

# 4. Sync assets with Capacitor
echo "🔄 Step 4: Syncing Web Assets to Android project..."
npx cap sync

# 5. Build Android Project using Gradle
echo "🏗️  Step 5: Compiling APK using Gradle..."
cd android

# Kill any running Gradle daemons that might be using a different/wrong Java version
echo "🛑 Stopping any existing stale Gradle daemons..."
./gradlew --stop || true

# Clean and Build
echo "⚡ Running assembleDebug..."
./gradlew clean assembleDebug

echo "========================================="
echo "🎉 SUCCESS! APK Generated Successfully!"
echo "📍 APK Location: android/app/build/outputs/apk/debug/app-debug.apk"
echo "========================================="
cd ..
