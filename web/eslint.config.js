import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  reactHooks.configs.flat.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // The numeric formatter and the HUD interpolate numbers on purpose.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    // Dependency rule of the architecture (5.2): the editor depends on the viewer only through
    // the `ImageViewer` interface, so only the adapter may import OpenSeadragon.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/features/viewer/OsdImageViewer.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'openseadragon',
              message: 'Solo OsdImageViewer puede importar OpenSeadragon (arquitectura §5.2).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['vite.config.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // The config file itself is plain JavaScript, outside the TypeScript project.
    files: ['eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
