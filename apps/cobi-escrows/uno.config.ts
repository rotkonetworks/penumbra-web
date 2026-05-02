import { defineConfig, presetUno } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
  ],
  theme: {
    colors: {
      primary: '#000066',
      surface: '#f3f3f3',
      border: '#ccc',
    },
  },
  shortcuts: {
    'btn': 'bg-#f0f0f0 border border-#666 px-3 py-1 text-sm cursor-pointer hover:bg-#e0e0e0 disabled:bg-#ccc disabled:text-#666 disabled:cursor-default',
    'header': 'bg-primary text-white px-3 py-2 font-bold',
    'panel': 'bg-surface border border-border p-2',
    'status-ok': 'bg-#cfc border-#080',
    'status-warn': 'bg-#ffc border-#880',
    'status-err': 'bg-#fcc border-#800',
    'input-field': 'border border-#666 px-2 py-1 text-sm w-full',
    'addr': 'font-mono text-xs break-all cursor-pointer p-1 bg-#f0f0f0 border border-#ccc hover:bg-#e0e0e0',
  },
});
