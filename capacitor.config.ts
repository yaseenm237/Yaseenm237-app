import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartcarpentry.optimizer',
  appName: 'Smart Carpentry Optimizer',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
