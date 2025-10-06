const path = require('path');
const { createConfig } = require('@openedx/frontend-build');
const CopyPlugin = require('copy-webpack-plugin');

const config = createConfig('webpack-prod');

config.plugins.push(
  new CopyPlugin({
    patterns: [
      {
        from: path.resolve(__dirname, './public/static'),
        to: path.resolve(__dirname, './dist/static'),
      },
    ],
  }),
);

config.resolve.alias = {
  ...config.resolve.alias,
  '@src': path.resolve(__dirname, 'src'),
  // Force entities to resolve to the correct location
  'entities': path.resolve(__dirname, 'node_modules/entities'),
  'entities/lib/escape.js': path.resolve(__dirname, 'node_modules/entities/lib/escape.js'),
};

config.resolve.modules = [
  path.resolve(__dirname, './src'),
  path.resolve(__dirname, './node_modules'),
  'node_modules',
];

module.exports = config;
