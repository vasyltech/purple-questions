import { defineConfig } from 'vite';
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

// Plugins
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config
export default defineConfig({
    plugins: [
        vue({
            template: { transformAssetUrls }
        }),
        vuetify({
            autoImport: true
        })
    ],
    define: { 'process.env': {} },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        },
        extensions: [
            '.js',
            '.json',
            '.jsx',
            '.mjs',
            '.ts',
            '.tsx',
            '.vue',
        ],
    },
});
