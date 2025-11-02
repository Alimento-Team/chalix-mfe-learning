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

// Add an explicit rule to transpile the Chalix header package source in node_modules
// Provide explicit babel options so JSX is supported when transpiling node_modules.
const chalixSrcPath = path.resolve(__dirname, 'node_modules/@chalix/frontend-component-header/src');
config.module.rules.unshift({
  test: /\.jsx?$/,
  include: [chalixSrcPath],
  use: {
    loader: require.resolve('babel-loader'),
    options: {
      presets: [
        require.resolve('@babel/preset-env'),
        require.resolve('@babel/preset-react'),
      ],
      babelrc: false,
      configFile: false,
    },
  },
});

// Keep project aliases. Do NOT alias '@edx/frontend-platform/auth' to avoid
// recursive resolution when the shim imports the real module.
config.resolve.alias = {
  ...config.resolve.alias,
  '@src': path.resolve(__dirname, 'src'),
};
// Provide a build-time alias mapping for the real auth module so the shim
// can import it without creating a circular alias.
try {
  const realAuthPath = require.resolve('@edx/frontend-platform/auth');
  config.resolve.alias['@edx/frontend-platform/auth-original'] = realAuthPath;
  config.resolve.alias['@edx/frontend-platform/auth$'] = path.resolve(__dirname, 'src/compat/auth-shim.js');
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('Could not resolve @edx/frontend-platform/auth at build-time:', err && err.message);
}

module.exports = config;
