import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = (env.VITE_API_ENDPOINT || '').trim().replace(/\/+$/, '')
  const stripeApiTarget = (env.VITE_STRIPE_API_URL || '').trim().replace(/\/+$/, '')

  return {
    base: './',
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,
      proxy: {
        ...(apiTarget && {
          '/__rg_api__': {
            target: apiTarget,
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/__rg_api__/, ''),
          },
        }),
        ...(stripeApiTarget && {
          '/__stripe_api__': {
            target: stripeApiTarget,
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/__stripe_api__/, ''),
          },
        }),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/x-charts', '@emotion/react', '@emotion/styled'],
            amplify: ['aws-amplify'],
            stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
            docx: ['docx'],
            filesaver: ['file-saver'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  }
})
