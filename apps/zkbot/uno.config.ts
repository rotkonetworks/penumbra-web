import { defineConfig, presetUno, presetWebFonts } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetWebFonts({
      fonts: {
        mono: 'JetBrains Mono:400,500,700',
      },
    }),
  ],
  theme: {
    colors: {
      bg: '#0a0a0a',
      panel: '#0f0f0f',
      input: '#141414',
      border: '#1a1a1a',
      text: '#c0c0c0',
      dim: '#606060',
      bright: '#ffffff',
      accent: '#00ff88',
      'accent-dim': '#00aa55',
      warn: '#ffaa00',
      err: '#ff4444',
      info: '#4488ff',
      purple: '#aa88ff',
      cyan: '#00dddd',
      near: '#ffaa00',
      penumbra: '#aa88ff',
    },
  },
  shortcuts: {
    'btn': 'bg-input border border-border text-text px-5 py-2 font-mono text-13px cursor-pointer hover:border-accent-dim hover:text-accent transition-all',
    'btn-primary': 'btn border-accent-dim text-accent hover:bg-accent-dim hover:text-bg',
    'input-field': 'w-full bg-input border border-border text-text px-3 py-2 font-mono text-13px focus:outline-none focus:border-accent-dim focus:text-bright',
    'panel': 'bg-panel border border-border p-4',
    'panel-header': 'text-cyan mb-2 pb-1 border-b border-border text-12px',
  },
});
