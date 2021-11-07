module.exports = {
  ignorePatterns: [
    '**/node_modules/**',
  ],
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'standard'
    // 'plugin:prettier/recommended',
    // 'plugin:node/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {
    'comma-dangle': 'off',
    'space-before-function-paren': 'off',
    'no-use-before-define': 'off',
    'no-unused-vars': 'off',
  }
}
