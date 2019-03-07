module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    jest: true,
    browser: true
  },
  plugins: ['prettier'],
  extends: ['eslint:recommended', require.resolve('eslint-config-prettier')],
  rules: {
    'prettier/prettier': 'warn',
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'
  },
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module',
    ecmaVersion: 2019
  }
}
