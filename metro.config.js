const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for "Cannot use 'import.meta' outside a module" error
// Force Metro to prioritize CommonJS exports over ESM for recharts and other libraries
// that use import.meta which is not supported by Hermes engine
config.resolver.unstable_conditionNames = [
  'browser',
  'require',
  'react-native',
];

module.exports = config;
