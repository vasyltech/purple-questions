import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    browserField: false,
    conditions: ['node', 'require'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
    alias: {
      '@': fileURLToPath(new URL('./src/main/', import.meta.url))
  },
  },
});
