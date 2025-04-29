
import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

export function cesiumPlugin() {
  return {
    name: 'cesium-plugin',
    configureServer(server) {
      // Serve Cesium's static files
      server.middlewares.use((req, res, next) => {
        const cesiumPath = path.resolve('node_modules/cesium/Build/Cesium');
        
        if (req.url?.startsWith('/Cesium/')) {
          const filePath = path.join(cesiumPath, req.url.replace('/Cesium/', ''));
          
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath);
            
            // Set appropriate content type
            const ext = path.extname(filePath);
            let contentType = 'text/plain';
            
            if (ext === '.js') contentType = 'application/javascript';
            else if (ext === '.css') contentType = 'text/css';
            else if (ext === '.json') contentType = 'application/json';
            else if (ext === '.png') contentType = 'image/png';
            else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
            return;
          }
        }
        
        next();
      });
    },
    config() {
      return {
        define: {
          // Define CESIUM_BASE_URL for production builds
          'window.CESIUM_BASE_URL': JSON.stringify('/Cesium')
        },
        build: {
          assetsInlineLimit: 0,
          // Copy Cesium assets to dist
          rollupOptions: {
            output: {
              manualChunks: {
                cesium: ['cesium']
              }
            }
          },
          // Ensure Cesium assets are copied to output directory
          commonjsOptions: {
            include: [/node_modules/]
          }
        },
        resolve: {
          alias: {
            '@': path.resolve('src'),
            'cesium': path.resolve('node_modules/cesium')
          }
        }
      };
    }
  };
}
