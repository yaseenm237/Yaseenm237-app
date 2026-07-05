#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# If we are inside the android folder, change directory to parent (project root)
if [ "$(basename "$PWD")" = "android" ]; then
  echo "🔄 Detected script run inside 'android' folder. Moving to project root..."
  cd ..
fi

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

# Let's search for any valid Java installations
echo "🔍 Searching for available JDKs..."
CANDIDATES=()

# 1. Add SDKMAN Java candidate directories if they exist
if [ -d "/usr/local/sdkman/candidates/java" ]; then
  for d in /usr/local/sdkman/candidates/java/*; do
    if [ -d "$d" ]; then CANDIDATES+=("$d"); fi
  done
fi
if [ -d "/home/vscode/.sdkman/candidates/java" ]; then
  for d in /home/vscode/.sdkman/candidates/java/*; do
    if [ -d "$d" ]; then CANDIDATES+=("$d"); fi
  done
fi
if [ -d "$HOME/.sdkman/candidates/java" ]; then
  for d in "$HOME/.sdkman/candidates/java"/*; do
    if [ -d "$d" ]; then CANDIDATES+=("$d"); fi
  done
fi

# 2. Add some specific common paths
CANDIDATES+=(
  "/usr/local/sdkman/candidates/java/17.0.10-tem"
  "/usr/local/sdkman/candidates/java/current"
  "/home/vscode/.sdkman/candidates/java/17.0.10-tem"
  "/home/vscode/.sdkman/candidates/java/current"
  "$HOME/.sdkman/candidates/java/17.0.10-tem"
  "$HOME/.sdkman/candidates/java/current"
)

# 3. Add existing JAVA_HOME if set
if [ -n "$JAVA_HOME" ]; then
  CANDIDATES=("$JAVA_HOME" "${CANDIDATES[@]}")
fi

# 4. Add system java path
SYS_JAVA=$(dirname $(dirname $(readlink -f $(which java 2>/dev/null) 2>/dev/null) 2>/dev/null) 2>/dev/null)
if [ -n "$SYS_JAVA" ]; then
  CANDIDATES+=("$SYS_JAVA")
fi

FOUND_JAVA=""
for candidate in "${CANDIDATES[@]}"; do
  if [ -d "$candidate" ] && [ -f "$candidate/bin/java" ]; then
    # Specifically avoid the broken/incomplete /usr/lib/jvm/java-17-openjdk-amd64 if we have other options
    if [ "$candidate" = "/usr/lib/jvm/java-17-openjdk-amd64" ] && [ ! -f "$candidate/bin/javac" ]; then
      echo "⚠️  Skipping incomplete JDK: $candidate"
      continue
    fi
    FOUND_JAVA="$candidate"
    break
  fi
done

if [ -n "$FOUND_JAVA" ]; then
  export JAVA_HOME="$FOUND_JAVA"
  echo "✅ Selected valid JAVA_HOME: $JAVA_HOME"
else
  echo "⚠️  Could not find a valid JDK containing bin/java, falling back to system default"
  export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java 2>/dev/null) 2>/dev/null) 2>/dev/null) 2>/dev/null)
fi

export PATH="$JAVA_HOME/bin:$PATH"

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

# 4. Restoring gradle-wrapper.jar if missing or corrupted
echo "📦 Step 4: Ensuring Gradle Wrapper is healthy..."

# Try to run the verify-and-fix script with proper TypeScript execution
if ! npx tsx verify-and-fix.ts 2>/dev/null; then
  echo "⚠️  TypeScript execution failed or not available. Attempting alternative verification..."
  
  # Simple fallback: Check if gradle-wrapper.jar exists
  JAR_PATH="android/gradle/wrapper/gradle-wrapper.jar"
  if [ ! -f "$JAR_PATH" ] || [ ! -s "$JAR_PATH" ]; then
    echo "⚠️  gradle-wrapper.jar missing or empty. Attempting to restore..."
    mkdir -p "$(dirname "$JAR_PATH")"
    
    # Try to download from known good sources
    DOWNLOAD_SUCCESS=false
    DOWNLOAD_URLS=(
      "https://raw.githubusercontent.com/ionic-team/capacitor/main/android/gradle/wrapper/gradle-wrapper.jar"
      "https://raw.githubusercontent.com/android/sunflower/main/gradle/wrapper/gradle-wrapper.jar"
      "https://raw.githubusercontent.com/facebook/react-native/main/template/android/gradle/wrapper/gradle-wrapper.jar"
    )
    
    for URL in "${DOWNLOAD_URLS[@]}"; do
      echo "📡 Attempting download from: $URL"
      if curl -sSL -f "$URL" -o "$JAR_PATH" 2>/dev/null; then
        if [ -s "$JAR_PATH" ]; then
          echo "✅ Successfully downloaded gradle-wrapper.jar"
          DOWNLOAD_SUCCESS=true
          break
        fi
      fi
    done
    
    if [ "$DOWNLOAD_SUCCESS" = false ]; then
      echo "❌ Failed to restore gradle-wrapper.jar through any method."
      exit 1
    fi
  else
    echo "✅ gradle-wrapper.jar exists and is valid"
  fi
else
  echo "✅ Gradle Wrapper verification completed successfully"
fi

# 5. Sync assets with Capacitor
echo "🔄 Step 5: Syncing Web Assets to Android project..."
npx cap sync

# 6. Build Android Project using Gradle
echo "🏗️  Step 6: Compiling APK using Gradle..."
cd android

# Ensure gradlew has execution permission
chmod +x gradlew

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
