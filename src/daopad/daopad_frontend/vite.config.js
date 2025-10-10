/// <reference types="vitest" />
import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export default defineConfig({
  build: {
    emptyOutDir: true,
    // Add rollup options for better code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          'vendor-dfinity': ['@dfinity/agent', '@dfinity/auth-client', '@dfinity/principal'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    // Add source maps for production debugging
    sourcemap: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: 'src/setupTests.js',
  },
  resolve: {
    alias: [
      {
        find: "declarations",
        // FIX: Point to local frontend declarations (synced from dfx)
        replacement: fileURLToPath(
          new URL("./src/declarations", import.meta.url)  // FIXED PATH
        ),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
    dedupe: ['@dfinity/agent'],
  },
});
