
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

```
## 🚀 Production Build & APK Generation Flow
Follow these step-by-step commands in your terminal to compile your latest application upgrades into a mobile package.
### Step 1: Build the Web Production Assets
Compile and optimize the frontend React/TypeScript application into static web files:
```bash
npm run build

```
### Step 2: Sync Assets with Native Android Container
Copy the freshly compiled web assets from the dist/ directory into the native Android platform environment:
```bash
npx @capacitor/cli sync

```
### Step 3: Compile the Android APK
#### Option A: Generate a Debug APK (For Testing)
To quickly build an executable package for testing on local devices, run:
```bash
cd android && ./gradlew assembleDebug

```
#### Option B: Generate an Unsigned Release APK (For Production)
To compile a highly optimized, production-ready package, run:
```bash
cd android && ./gradlew assembleRelease

```
## 📂 Project Architecture
```text
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

`
