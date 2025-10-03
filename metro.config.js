const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for resolving modules with @ alias
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    '@': path.resolve(__dirname),
  },
  // Ensure we watch the assets folder
  watchFolders: [path.resolve(__dirname)],
};

module.exports = config;

