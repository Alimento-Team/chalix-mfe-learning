const path = require('path');
const { createConfig } = require('@openedx/frontend-build');

const config = createConfig('webpack-dev');

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
// This is more robust than relying on modifying the existing babel-loader exclude.
// Provide explicit babel options so JSX is supported when transpiling node_modules.
const chalixSrcPath = path.resolve(__dirname, 'node_modules/@chalix/frontend-component-header/src');
config.module.rules.unshift({
  test: /\.jsx?$/,
  include: [chalixSrcPath],
  use: {
    loader: require.resolve('babel-loader'),
    options: {
      // Keep this minimal and aligned with project Babel targets. These
      // presets ensure JSX is transformed when compiling the package source.
      presets: [
        require.resolve('@babel/preset-env'),
        require.resolve('@babel/preset-react'),
      ],
      // Do not attempt to load a project-level config for node_modules
      // files; use these options instead.
      babelrc: false,
      configFile: false,
    },
  },
});

// Modify existing babel-loader rule to include @chalix/frontend-component-header
const babelRule = config.module.rules.find(
  rule => rule.use && rule.use.loader && rule.use.loader.includes('babel-loader')
);

if (babelRule) {
  // Store the original exclude function/pattern
  const originalExclude = babelRule.exclude;
  
  // Create new exclude function that allows our package
  babelRule.exclude = (filepath) => {
    // Allow @chalix/frontend-component-header
    if (filepath.includes('@chalix/frontend-component-header')) {
      return false;
    }
    // Use original exclude for everything else
    if (typeof originalExclude === 'function') {
      return originalExclude(filepath);
    }
    if (originalExclude instanceof RegExp) {
      return originalExclude.test(filepath);
    }
    return false;
  };
}

// Keep project aliases. Do NOT alias '@edx/frontend-platform/auth' to avoid
// recursive resolution when the shim imports the real module.
config.resolve.alias = {
  ...config.resolve.alias,
  '@src': path.resolve(__dirname, 'src'),
};
// Provide a build-time alias: map the real auth module to an "original" name
// we can import from inside our shim, then alias the public name to the shim.
try {
  const realAuthPath = require.resolve('@edx/frontend-platform/auth');
  config.resolve.alias['@edx/frontend-platform/auth-original'] = realAuthPath;
  config.resolve.alias['@edx/frontend-platform/auth$'] = path.resolve(__dirname, 'src/compat/auth-shim.js');
} catch (err) {
  // If require.resolve fails at config time, we skip adding the alias. The
  // build will likely fail later if the package is missing.
  // eslint-disable-next-line no-console
  console.warn('Could not resolve @edx/frontend-platform/auth at build-time:', err && err.message);
}

module.exports = config;
