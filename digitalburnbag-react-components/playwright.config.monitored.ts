/**
 * Playwright config for digitalburnbag-react-components e2e — monitored variant.
 * Identical to playwright.config.ts but adds the custom progress reporter
 * so e2e-with-progress.mjs gets per-test events via the shared JSONL file.
 */
import baseConfig from './playwright.config';
import { workspaceRoot } from '@nx/devkit';
import path from 'path';

export default {
  ...baseConfig,
  reporter: [
    ['html'],
    [path.join(workspaceRoot, 'tools/custom-playwright-reporter.js')],
  ],
};
