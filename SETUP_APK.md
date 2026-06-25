# 📱 Android APK Build Setup Guide

यह guide आपको step-by-step Android APK बनाने में मदद करेगा।

## Prerequisites (पहले install करें)

```bash
# Node.js (v16+ recommended)
node --version

# npm (Node के साथ आता है)
npm --version

# Git
git --version

# Java Development Kit (JDK 11+)
java -version

# Android SDK
# Download from: https://developer.android.com/studio
```

## Step 1: Capacitor Setup

```bash
# Project directory में जाएं
cd Yaseenm237-app

# Capacitor install करें
npm install @capacitor/core @capacitor/cli

# Capacitor Core plugins
npm install @capacitor/android
```

## Step 2: Build करें

```bash
# React app को build करें
npm run build

# Check करें कि dist folder बना है
ls -la dist/
```

## Step 3: Android Project Setup

```bash
# Capacitor को initialize करें
npx cap init

# Prompts में यह भरें:
# - App name: Carpenter Optimizer
# - App Package ID: com.carpenter.optimizer
# - Web asset directory: dist

# Android project add करें
npx cap add android
```

## Step 4: Android Studio में Open करें

```bash
# Android Studio में open करेगा
npx cap open android
```

### Android Studio में:

1. **Wait करें** - Gradle sync हो जाए
2. **Left panel** में `android` folder expand करें
3. **File** > **Sync Now** click करें
4. **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**

## Step 5: APK Generate करें

```bash
# Command line से APK बनाएं
cd android
./gradlew assembleDebug
# या Release के लिए:
./gradlew assembleRelease
```

### APK मिलेगा यहां:
```
android/app/build/outputs/apk/debug/app-debug.apk
android/app/build/outputs/apk/release/app-release.apk
```

## Step 6: Device/Emulator में Test करें

```bash
# Emulator/Device connect करें
adb devices

# APK install करें
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Troubleshooting

### समस्या 1: Gradle sync fail हो रहा है
```
Solution: 
- Build > Clean Project
- Build > Rebuild Project
- File > Invalidate Caches > Invalidate and Restart
```

### समस्या 2: Java version error
```
Solution:
export JAVA_HOME=/path/to/java11
```

### समस्या 3: Android SDK not found
```
Solution:
- Create local.properties file in android/ folder:
sdk.dir=/path/to/android/sdk
```

## Important Files (GitHub पर add करने हैं)

✅ `SETUP_APK.md` - यह file
✅ `capacitor.config.json` - Capacitor configuration
✅ `.env.example` - Environment variables
✅ `.capacitorignore` - Capacitor ignore file
✅ `android/` - (Auto-generated) Android project folder

---

**Next Step:** `capacitor.config.json` create करें।
