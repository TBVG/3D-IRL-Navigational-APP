
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { cesiumPlugin } from "./cesium-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    cesiumPlugin()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      'cesium': path.resolve(__dirname, "node_modules/cesium"),
      'three': path.resolve(__dirname, "node_modules/three"),
      'stats.js': path.resolve(__dirname, "node_modules/stats.js/build/stats.min.js"),
      'stats.js/build/stats.min.js': path.resolve(__dirname, "node_modules/stats.js/build/stats.min.js"),
      'prop-types': path.resolve(__dirname, "src/utils/propTypesShim.js"),
      'use-sync-external-store/shim/with-selector': path.resolve(__dirname, "src/utils/useSyncExternalStoreShim.js")
    },
  },
  // Define process.env for Cesium
  define: {
    'process.env': {},
    'window.CESIUM_BASE_URL': JSON.stringify('/Cesium')
  },
  // Make environment variables available to client code
  envPrefix: 'VITE_',
  optimizeDeps: {
    esbuildOptions: {
      // Define global constants that Three.js and libraries use
      define: {
        global: 'window',
      },
    },
    exclude: ['@react-three/drei'],
    include: [
      'stats.js', 
      'prop-types', 
      'use-sync-external-store/shim/with-selector',
      'use-sync-external-store'
    ]
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      // External packages that should not be bundled
      external: [],
      // Custom output configuration for problematic dependencies
      output: {
        manualChunks: {
          'three-basic': ['three'],
          'cesium': ['cesium']
        }
      }
    }
  }
}));
