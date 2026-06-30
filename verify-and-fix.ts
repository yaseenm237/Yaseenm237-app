import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as http from 'http';
import * as https from 'https';

const jarPath = path.join('android', 'gradle', 'wrapper', 'gradle-wrapper.jar');
const wrapperDir = path.dirname(jarPath);

console.log('🏁 Starting Gradle Wrapper verification and fix utility...');

// Create directory if it doesn't exist
if (!fs.existsSync(wrapperDir)) {
  fs.mkdirSync(wrapperDir, { recursive: true });
}

// Function to check if a JAR file is physically a valid ZIP file and runs via Java
function verifyJar(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File ${filePath} does not exist.`);
    return false;
  }
  const size = fs.statSync(filePath).size;
  if (size < 10000) {
    console.log(`❌ File ${filePath} is too small (${size} bytes).`);
    return false;
  }
  
  // Check magic bytes
  const buffer = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
    console.log(`❌ File ${filePath} does not have valid ZIP magic bytes.`);
    return false;
  }

  // 1. Verify archive integrity using unzip -t if available
  try {
    console.log(`⚙️ Testing archive integrity of ${filePath} using unzip...`);
    execSync(`unzip -t "${filePath}"`, { stdio: 'pipe' });
    console.log(`✅ ${filePath} archive integrity verified via unzip!`);
  } catch (err: any) {
    console.log(`❌ unzip -t failed: This file is corrupt or not a valid ZIP archive.`);
    return false;
  }

  // 2. Test executing with Java if available
  try {
    console.log(`⚙️ Testing execution of ${filePath} using Java...`);
    const javaCmd = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : 'java';
    execSync(`"${javaCmd}" -jar "${filePath}" --version`, { stdio: 'pipe' });
    console.log(`✅ ${filePath} verified successfully with Java execution!`);
    return true;
  } catch (err: any) {
    const stderr = err.stderr?.toString() || '';
    const stdout = err.stdout?.toString() || '';
    const message = err.message || '';
    
    if (stderr.includes('Invalid or corrupt jarfile') || stdout.includes('Invalid or corrupt jarfile')) {
      console.log(`❌ Java reports: Invalid or corrupt jarfile.`);
      return false;
    }
    
    if (message.includes('ENOENT') || stderr.includes('not found') || message.includes('not found')) {
      console.log(`⚠️ Java command was not found or could not execute, relying on unzip verification.`);
      return true; // Succeeded unzip, so assume good
    }
    
    // Any other error (like missing properties or gradle-wrapper.properties not found) is acceptable because the jar structure itself is intact!
    console.log(`✅ Jar is structurally valid (Java recognized it without corruption error).`);
    return true;
  }
}

// Helper to download a file with redirects supported
function downloadFile(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    
    const request = client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(dest);
          downloadFile(redirectUrl, dest).then(resolve);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        resolve(false);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      resolve(false);
    });

    // Set 10s timeout
    request.setTimeout(10000, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      resolve(false);
    });
  });
}

async function run() {
  // If the jar is already healthy, we are good
  if (verifyJar(jarPath)) {
    console.log('🎉 Current gradle-wrapper.jar is already healthy!');
    process.exit(0);
  }

  console.log('⚠️ Current jar is corrupt or missing. Attempting to restore...');

  // 1. Try local extraction from @capacitor/cli assets
  const templatePath = path.join('node_modules', '@capacitor/cli', 'assets', 'android-template.tar.gz');
  if (fs.existsSync(templatePath)) {
    try {
      console.log('📦 Attempting local extraction from @capacitor/cli assets...');
      const tempDir = path.join('android', 'gradle', 'wrapper', 'temp-extract');
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
      fs.mkdirSync(tempDir, { recursive: true });

      execSync(`tar -xzf ${templatePath} -C ${tempDir}`);

      // Search for gradle-wrapper.jar
      const findAndCopy = (dir: string): boolean => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            if (findAndCopy(fullPath)) return true;
          } else if (file === 'gradle-wrapper.jar') {
            fs.copyFileSync(fullPath, jarPath);
            if (verifyJar(jarPath)) {
              console.log('✅ Successfully extracted and verified gradle-wrapper.jar from local template!');
              return true;
            }
          }
        }
        return false;
      };

      const extracted = findAndCopy(tempDir);
      fs.rmSync(tempDir, { recursive: true, force: true });

      if (extracted) {
        process.exit(0);
      }
    } catch (err) {
      console.warn('⚠️ Local extraction failed:', err);
    }
  }

  // 2. Try online download from candidate URLs
  const candidates = [
    // Standard gradle wrapper release download (directly from Services Gradle)
    'https://services.gradle.org/distributions/gradle-8.14.3-bin.zip', // We can extract it from here, but downloading 100MB is slow
    
    // Gradle GitHub tags
    'https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar',
    'https://raw.githubusercontent.com/gradle/gradle/v8.14.3/gradle/wrapper/gradle-wrapper.jar',
    'https://raw.githubusercontent.com/gradle/gradle/v8.2.0/gradle/wrapper/gradle-wrapper.jar',
    'https://raw.githubusercontent.com/gradle/gradle/v8.9.0/gradle/wrapper/gradle-wrapper.jar',
    
    // Healthy gradle-wrapper.jar from active popular github repos
    'https://raw.githubusercontent.com/android/sunflower/main/gradle/wrapper/gradle-wrapper.jar',
    'https://raw.githubusercontent.com/ionic-team/capacitor/main/android/gradle/wrapper/gradle-wrapper.jar',
    'https://raw.githubusercontent.com/facebook/react-native/main/template/android/gradle/wrapper/gradle-wrapper.jar',
    'https://raw.githubusercontent.com/google/iosched/main/gradle/wrapper/gradle-wrapper.jar',
    
    // Release branches
    'https://raw.githubusercontent.com/gradle/gradle/release/gradle/wrapper/gradle-wrapper.jar',
  ];

  for (const url of candidates) {
    if (url.endsWith('.zip')) {
      // It's a full distribution zip, download is slow, only try if others fail
      continue;
    }
    
    console.log(`📡 Fetching from: ${url}`);
    const success = await downloadFile(url, jarPath);
    if (success) {
      if (verifyJar(jarPath)) {
        console.log(`🎉 SUCCESS: Downloaded and verified healthy gradle-wrapper.jar from ${url}`);
        process.exit(0);
      } else {
        console.log(`⚠️ Downloaded file from ${url} was invalid/corrupt. Trying next...`);
        if (fs.existsSync(jarPath)) fs.unlinkSync(jarPath);
      }
    } else {
      console.log(`❌ Failed to download from ${url}`);
    }
  }

  // 3. Fallback: Download a small gradle-8.5-bin.zip and extract gradle-wrapper.jar
  console.log('⚠️ Standard jar URLs failed. Attempting to download small gradle wrapper binary package to extract...');
  const gradleZipUrl = 'https://services.gradle.org/distributions/gradle-8.5-bin.zip';
  const zipDest = path.join('android', 'gradle', 'wrapper', 'gradle-dist.zip');
  
  console.log(`📡 Fetching Gradle bin zip from: ${gradleZipUrl}`);
  const zipSuccess = await downloadFile(gradleZipUrl, zipDest);
  if (zipSuccess) {
    try {
      console.log('📦 Extracting gradle-wrapper.jar from Gradle bin zip...');
      const extractTemp = path.join('android', 'gradle', 'wrapper', 'temp-zip-extract');
      if (fs.existsSync(extractTemp)) fs.rmSync(extractTemp, { recursive: true, force: true });
      fs.mkdirSync(extractTemp, { recursive: true });
      
      execSync(`unzip -q ${zipDest} -d ${extractTemp}`);
      
      const findAndCopy = (dir: string): boolean => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            if (findAndCopy(fullPath)) return true;
          } else if (file === 'gradle-wrapper.jar') {
            fs.copyFileSync(fullPath, jarPath);
            if (verifyJar(jarPath)) {
              console.log('✅ Successfully extracted gradle-wrapper.jar from downloaded bin zip!');
              return true;
            }
          }
        }
        return false;
      };
      
      findAndCopy(extractTemp);
      fs.rmSync(extractTemp, { recursive: true, force: true });
      fs.unlinkSync(zipDest);
      
      if (verifyJar(jarPath)) {
        process.exit(0);
      }
    } catch (err) {
      console.error('❌ Error extracting from zip:', err);
    }
  }

  console.error('❌ CRITICAL ERROR: Could not restore a healthy gradle-wrapper.jar through any method.');
  process.exit(1);
}

run();
