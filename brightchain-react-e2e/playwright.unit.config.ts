/**
 * Minimal Playwright config for running unit-style property tests
 * that do NOT require a browser or the API server.
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  testMatch: 'auth-helper.spec.ts', // Unit-style property tests only
  timeout: 60_000,
});
