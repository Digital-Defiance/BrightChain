/**
 * Jest transformer for ESM-only packages that BrightChain's React tests load.
 *
 * react-router v8 (and its dependencies @remix-run/route-pattern and
 * cookie-es) ship as ESM (`"type": "module"`), and react-router contains a
 * dead HMR guard that reads `import.meta.hot`. Compiled to CommonJS for Jest
 * that would throw "Cannot use 'import.meta' outside a module", so bare
 * `import.meta` references are neutralized first, then the ESM is downleveled
 * to CommonJS with the TypeScript compiler (already a workspace dependency;
 * @babel/preset-env is not resolvable under the pnpm node linker).
 *
 * Wire it in per project, ahead of the project's own transforms:
 *
 *   transform: {
 *     '/node_modules/.+\\.[cm]?js$': '<rootDir>/../tools/jest-esm-transformer.js',
 *     ...
 *   },
 *   transformIgnorePatterns: [
 *     'node_modules/(?!(?:\\.store/)?(?:react-router|@remix-run[-/]route-pattern|cookie-es)[-/])',
 *   ],
 *
 * The ignore pattern also matches the `.store/<name>-<hash>/package` layout.
 */
const crypto = require('crypto');
const ts = require('typescript');

module.exports = {
  canInstrument: false,
  process(sourceText, sourcePath) {
    const neutralized = sourceText.replace(/\bimport\.meta\b/g, '({})');
    const result = ts.transpileModule(neutralized, {
      // TypeScript treats .mjs/.cjs as always-ESM/always-CJS and will not
      // downlevel an .mjs file to CommonJS, so present it as plain .js.
      fileName: sourcePath.replace(/\.[cm]js$/, '.js'),
      compilerOptions: {
        allowJs: true,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        inlineSourceMap: true,
        inlineSources: false,
      },
    });
    return { code: result.outputText };
  },
  getCacheKey(sourceText, sourcePath, transformOptions) {
    // Key on the source content, the TypeScript version (output changes with
    // the compiler) and the Jest transformer config, so a same-length edit or
    // a compiler upgrade never reuses stale output.
    return crypto
      .createHash('sha256')
      .update('jest-esm-transformer:v3')
      .update('\0')
      .update(ts.version)
      .update('\0')
      .update(transformOptions?.configString ?? '')
      .update('\0')
      .update(sourcePath)
      .update('\0')
      .update(sourceText)
      .digest('hex');
  },
};
