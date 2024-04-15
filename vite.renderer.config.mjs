import { defineConfig } from 'vite';
import { pluginExposeRenderer } from './vite.base.config.mjs';
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config
export default defineConfig((env) => {
  /** @type {import('vite').ConfigEnv<'renderer'>} */
  const forgeEnv = env;
  const { root, mode, forgeConfigSelf } = forgeEnv;
  const name = forgeConfigSelf.name ?? '';

  /** @type {import('vite').UserConfig} */
  return {
    root,
    mode,
    base: './',
    build: {
      outDir: `.vite/renderer/${name}`,
    },
    plugins: [pluginExposeRenderer(name), vue({
      template: { transformAssetUrls }
    }), vuetify({
      autoImport: true
    })],
    resolve: {
      preserveSymlinks: true,
      alias: {
        '@': fileURLToPath(new URL('./src/renderer', import.meta.url))
      }
    },
    clearScreen: false
  };
});
