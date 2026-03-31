import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    basicSsl(), // Enable HTTPS for camera access on mobile
  ],
  server: {
    host: true, // Allow network access
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Firebase
          'firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage'
          ],
          
          // UI libraries
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
          
          // Maps
          'maps': ['leaflet', 'react-leaflet'],
          
          // PDF and QR
          'document-libs': ['jspdf', 'html5-qrcode', 'html2canvas'],
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1000kB
  }
})
