import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173, host: true },
  build: {
    rollupOptions: {
      output: {
        // Recharts y qrcode son pesados y cambian poco: van en su propio chunk
        // para que el código de la app se pueda cachear por separado.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          qr: ['qrcode'],
        },
      },
    },
  },
});
