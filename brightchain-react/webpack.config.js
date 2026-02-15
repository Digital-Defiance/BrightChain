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
      https: false,
      http: false,
      net: false,
      tls: false,
      zlib: false,
      child_process: false,
      async_hooks: false,
    };
    
    // Stub out server-only modules
    config.resolve.alias = {
      ...config.resolve.alias,
      'file-type': false,
      'pg-hstore': false,
    };
    
    // Exclude problematic Node.js-only dependencies
    config.externals = {
      ...config.externals,
      'mock-aws-s3': 'commonjs mock-aws-s3',
      'aws-sdk': 'commonjs aws-sdk',
      'nock': 'commonjs nock',
      'kerberos': 'commonjs kerberos',
      '@mongodb-js/zstd': 'commonjs @mongodb-js/zstd',
      '@aws-sdk/credential-providers': 'commonjs @aws-sdk/credential-providers',
      'gcp-metadata': 'commonjs gcp-metadata',
      'snappy': 'commonjs snappy',
      'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
      'bcrypt': 'commonjs bcrypt',
    };
    
    // Add module rules to ignore HTML files and problematic dependencies
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push(
      {
        test: /\.html$/,
        include: /node_modules/,
        type: 'asset/resource',
      },
      {
        test: /node_modules\/@mapbox\/node-pre-gyp/,
        use: 'null-loader',
      },
      {
        test: /node_modules\/@digitaldefiance\/enclave-bridge-client/,
        use: 'null-loader',
      },
      {
        test: /node_modules\/@digitaldefiance\/node-express-suite/,
        use: 'null-loader',
      },
      {
        test: /node_modules\/@root\/greenlock/,
        use: 'null-loader',
      }
    );
    
    return config;
  }
);
