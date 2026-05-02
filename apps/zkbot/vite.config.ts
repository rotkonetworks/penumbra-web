import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import UnoCSS from 'unocss/vite';
// @ts-ignore - no types
import polyfillNode from 'vite-plugin-node-stdlib-browser';

export default defineConfig({
  plugins: [
    polyfillNode(),
    UnoCSS(),
    solid(),
  ],
  server: {
    port: 5175,
  },
  build: {
    target: 'esnext',
  },
});
