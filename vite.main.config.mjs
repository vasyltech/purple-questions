import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
    browserField: false,
    conditions: ['node', 'require'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
  },
  },
});
