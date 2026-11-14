// Real linting for the server tier. This package holds render.ts, which is a
// security boundary (its output is injected with dangerouslySetInnerHTML), so
// it is worth linting rather than skipping.
//
// Previously this workspace declared `eslint src --ext .ts` with no config and
// no eslint dependency. `npm run lint` therefore failed, and it went unnoticed
// because pushes to develop run deploy.yml, which does not lint; only a pull
// request runs ci.yml.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['lib/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      // Unused args are fine when prefixed, matching the other workspaces.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
