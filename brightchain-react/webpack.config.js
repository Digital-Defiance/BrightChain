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
      /Failed to parse source map/,
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

    // Stub out server-only modules that get pulled in transitively
    config.resolve.alias = {
      ...config.resolve.alias,
      'file-type': false,
      'pg-hstore': false,
      // Heavy Node.js-only deps from brightchain-lib's dependency tree
      'nat-pmp': false,
      'nat-upnp': false,
      express: false,
    };

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

    // Exclude problematic Node.js-only dependencies
    config.externals = [
      ...(Array.isArray(config.externals)
        ? config.externals
        : config.externals
          ? [config.externals]
          : []),
      // Function to externalize heavy server-only packages that webpack shouldn't resolve
      function ({ request }, callback) {
        const serverOnlyPackages = [
          'express',
          'nat-pmp',
          'nat-upnp',
          '@ethereumjs/wallet',
          'paillier-bigint',
          'secp256k1',
          '@digitaldefiance/reed-solomon-erasure.wasm',
          '@digitaldefiance/secrets',
          '@digitaldefiance/enclave-bridge-client',
          '@digitaldefiance/node-express-suite',
          '@digitaldefiance/node-ecies-lib',
          'mock-aws-s3',
          'aws-sdk',
          'nock',
          'kerberos',
          '@mongodb-js/zstd',
          '@aws-sdk/credential-providers',
          'gcp-metadata',
          'snappy',
          'mongodb-client-encryption',
          'bcrypt',
        ];
        if (
          serverOnlyPackages.some(
            (pkg) => request === pkg || request.startsWith(pkg + '/'),
          )
        ) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      },
    ];

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
      },
    );

    return config;
  },
);
