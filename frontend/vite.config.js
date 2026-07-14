import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../frontend-dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('lucide-react') || id.includes('classnames')) return 'vendor-ui';
            if (id.includes('xlsx') || id.includes('exceljs')) return 'vendor-xlsx';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  }
})
