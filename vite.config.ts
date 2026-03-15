import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      eventemitter3: path.resolve(__dirname, 'node_modules/eventemitter3/dist/eventemitter3.esm.js'),
    },
  },
});
