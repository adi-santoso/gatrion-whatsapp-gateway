import { defineConfig } from 'vite';

export default defineConfig({
  base: '/dashboard/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  }
});
