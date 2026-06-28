# Yaseen Smart Design & Packing Application

An advanced React + Vite web application built with TypeScript and Tailwind CSS, seamlessly integrated with Capacitor to deliver a high-performance native Android experience. This application is specifically engineered to automate template-based structural layouts, generate modular cabinet/furniture frameworks from dynamic dimension inputs, and optimize multi-material packing lists efficiently.

---

## 📋 Prerequisites

Before setting up the project or generating builds, ensure you have the following tools installed on your system or configured in your cloud container:

* **Node.js** (v18 or higher) & **npm**
* **Java Development Kit (JDK)** (v17 or v21)
* **Android SDK** (with Command-line Tools and Build-Tools)
* **Gradle** (configured via wrapper)

---

## ⚙️ Project Configuration

Capacitor requires a configuration file at the root of the project to map web assets to the native Android container. Ensure your `capacitor.config.json` looks like this:

```json
{
  "appId": "com.yaseen.app",
  "appName": "Yaseen App",
  "webDir": "dist"
}

npm run build

npx @capacitor/cli sync

cd android && ./gradlew assembleDebug

cd android && ./gradlew assembleRelease

# 1. Generate a keystore certificate (run once)
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-alias

# 2. Sign the unsigned release APK
apksigner sign --ks my-release-key.jks android/app/build/outputs/apk/release/app-release-unsigned.apk

├── android/               # Native Android Studio project structure & Gradle setups
├── assets/                # Static design resources and application branding graphics
├── dist/                  # Production-ready web assets generated after running npm build
├── node_modules/          # Project dependencies managed by npm
├── src/                   # Core application workspace
│   ├── assets/            # Component-specific UI graphics and localized styling
│   ├── components/        # Reusable interface components and layout grids
│   ├── hooks/             # Custom React lifecycle state hooks
│   ├── utils/             # Core layout calculation logic and optimization utilities
│   ├── App.tsx            # Main application setup and view router
│   ├── main.tsx           # Global React rendering bridge
│   └── types.ts           # Global TypeScript type definitions and interfaces
├── capacitor.config.json  # Bridge configurations mapping webDir pathing to Android
├── package.json           # Node scripts, version control, and engine packages
└── vite.config.ts         # High-performance asset compilation and server configurations

