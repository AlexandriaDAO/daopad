/// <reference types="vitest" />
import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';
import { visualizer } from 'rollup-plugin-visualizer';

dotenv.config({ path: '../../.env' });

export default defineConfig({
  build: {
    emptyOutDir: true,
    // Add rollup options for better code splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          // More granular chunking strategy
          if (id.includes('node_modules')) {
            // Split vendor code by usage frequency and size
            if (id.includes('@dfinity')) {
              // Split large dfinity packages
              if (id.includes('@dfinity/agent')) return 'vendor-dfinity-agent';
              if (id.includes('@dfinity/auth-client')) return 'vendor-dfinity-auth';
              if (id.includes('@dfinity/principal')) return 'vendor-dfinity-principal';
              return 'vendor-dfinity';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('react-router-dom')) {
              return 'vendor-router';
            }
            if (id.includes('@radix-ui')) {
              // Split UI components by feature to allow lazy loading
              if (id.includes('dialog') || id.includes('alert-dialog')) return 'ui-dialogs';
              if (id.includes('table') || id.includes('data-table')) return 'ui-tables';
              if (id.includes('dropdown') || id.includes('select')) return 'ui-dropdowns';
              if (id.includes('tooltip') || id.includes('popover')) return 'ui-overlays';
              return 'ui-core';
            }
            if (id.includes('redux') || id.includes('@reduxjs/toolkit')) {
              return 'vendor-redux';
            }
            // Group smaller libraries together
            return 'vendor-misc';
          }

          // Split application code by feature
          if (id.includes('/components/orbit/')) {
            return 'feature-orbit';
          }
          if (id.includes('/components/canisters/')) {
            return 'feature-canisters';
          }
          if (id.includes('/components/security/')) {
            return 'feature-security';
          }
          if (id.includes('/components/tables/')) {
            return 'feature-tables';
          }
          if (id.includes('/services/')) {
            return 'services';
          }
          if (id.includes('/features/')) {
            return 'store';
          }
        },
        // Optimize chunk names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          if (facadeModuleId) {
            const name = facadeModuleId.split('/').pop().split('.')[0];
            return `chunks/${name}-[hash].js`;
          }
          return 'chunks/[name]-[hash].js';
        },
      },
    },
    // Optimize CSS
    cssCodeSplit: true,
    // Better minification with terser
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
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
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
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
