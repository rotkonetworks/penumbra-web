import createConfig from '@penumbra-zone/configs/tailwind-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';
import { createRequire } from 'node:module';

const eslintConfig = createConfig(
  createRequire(import.meta.url).resolve('@penumbra-zone/ui/theme.css'),
);

// Drop plugins from nextVitals already provided by our base config to avoid
// "plugin already defined" collisions when both spread into the same array.
const excludePlugins = eslintConfig.flatMap(config => Object.keys(config.plugins || {}));

const config = [
  ...nextVitals.filter(config =>
    Object.keys(config.plugins || {}).every(plugin => !excludePlugins.includes(plugin)),
  ),

  ...eslintConfig.filter(config => config.name !== 'custom:turbo-config'),

  {
    name: 'ignore-old-ts-files',
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },

  {
    name: 'ignore-broken-rules',
    rules: {
      '@next/next/no-duplicate-head': 'off',
    },
  },
  // Allow console logging in the scripts directory.
  {
    files: ['src/scripts/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];

/**
 * The next block of code is a workaround that enables the outdated eslint config in the DEX code.
 * In the future, we must bring the ESLint config to the repo and keep the dependencies up to date.
 * TODO: Remove this workaround when the ESLint config is moved to the repo.
 */
const IGNORE_RULES = ['@typescript-eslint/dot-notation', '@typescript-eslint/no-empty-function'];
config.forEach(option => {
  IGNORE_RULES.forEach(rule => {
    if (option.rules?.[rule]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- required here
      delete option.rules[rule];
    }
  });
});

export default config;
