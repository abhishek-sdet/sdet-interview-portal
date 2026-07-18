module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    '.eslintrc.cjs',
    'node_modules',
    // One-off/throwaway dev utilities — not wired into any workflow or npm
    // script, not part of the shipped app. Not worth holding to the same
    // lint bar as src/ and the scripts actually run in CI/cron.
    'scripts/test_parser*.js',
    'scripts/check_count.js',
    'scripts/repair.js',
    'scripts/generate_txt_questions_experienced.js',
    'cleanup.cjs',
    'cleanup-test.cjs',
    'load-test.cjs',
    'update.cjs',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // `while (true) { ... if (done) break; }` is a deliberate pagination idiom
    // used throughout the codebase — only flag genuinely constant `if`/ternary
    // conditions, not intentional loop-with-break patterns.
    'no-constant-condition': ['error', { checkLoops: false }],
  },
};
