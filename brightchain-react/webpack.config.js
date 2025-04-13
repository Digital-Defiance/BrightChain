const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');

// Nx plugins for webpack.
module.exports = composePlugins(
  withNx(),
  withReact({
    // Uncomment this line if you don't want to use SVGR
    // See: https://react-svgr.com/
    // svgr: false
  }),
  (config) => {
    // Update the webpack config as needed here.
    // e.g. `config.plugins.push(new MyPlugin())`
    
    // Ignore source map warnings and module not found errors for node_modules packages
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      // Ignore all source map parsing failures for node_modules
      /Failed to parse source map/,
      // Ignore file-type and pg-hstore module not found errors (server-only dependencies)
      (warning) => {
        return (
          warning.message &&
          (warning.message.includes('file-type') ||
           warning.message.includes('pg-hstore'))
        );
      },
    ];
    
    // Configure node polyfills for browser
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
      stream: false,
      buffer: false,
      util: false,
      fs: false,
      path: false,
      os: false,
      assert: false,
      url: false,
    };
    
    // Stub out server-only modules
    config.resolve.alias = {
      ...config.resolve.alias,
      'file-type': false,
      'pg-hstore': false,
    };
    
    return config;
  }
);
