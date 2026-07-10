# Build Scripts

This directory contains build automation scripts for compiling the application for different platforms.

## Scripts

- `build-apk.sh` - Builds Android APK file using Capacitor and Gradle

## Usage

From the project root directory:

```bash
bash scripts/builders/build-apk.sh
```

or

```bash
npm run android:build
```

## Requirements

Ensure you have the following installed:
- Node.js and npm
- Android SDK
- Java Development Kit (JDK 17+)
- Capacitor CLI
- Gradle (managed by Capacitor)

## What It Does

1. Builds web assets using Vite
2. Initializes Android platform if needed
3. Configures JDK and Gradle
4. Syncs web assets to Android project
5. Compiles and packages the APK

## Output

The compiled APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```
