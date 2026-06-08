import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: true, // Automatically open browser
    host: true  // Allow external connections
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Enable @ imports
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Set to true for debugging
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          // Split heavy, route-specific libraries so the landing page doesn't
          // download PDF/Excel/DOCX/chart bundles up front.
          if (id.includes('pdfjs-dist')) return 'pdfjs';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf-export';
          if (id.includes('xlsx')) return 'xlsx';
          if (id.includes('docx') || id.includes('mammoth')) return 'docx';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('groq-sdk')) return 'groq';
          return 'vendor';
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})