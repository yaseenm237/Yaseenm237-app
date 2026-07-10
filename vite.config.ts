import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, '.') },
        { find: /^lucide-react$/, replacement: path.resolve(__dirname, 'src/icons.ts') },
      ],
    },
    build: {
      target: 'esnext',
      sourcemap: false,
      minify: 'esbuild',
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        maxParallelFileOps: 2,
        cache: false,
      },
    },
    server: {
      // Configure HMR for the reverse proxy environment to resolve WS connection errors
      hmr: process.env.DISABLE_HMR === 'true' ? false : {
        clientPort: 443
      },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
