import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  }, 
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/x-charts', '@emotion/react', '@emotion/styled'],
          amplify: ['aws-amplify'],
          stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          jspdf: ['jspdf'],
          docx: ['docx'],
          html2canvas: ['html2canvas'],
          filesaver: ['file-saver'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})
