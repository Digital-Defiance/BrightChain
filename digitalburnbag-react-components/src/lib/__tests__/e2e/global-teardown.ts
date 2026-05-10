/**
 * Playwright global teardown — runs once after all tests.
 *
 * Cleans up any test data created during the test run.
 * For now this is a no-op placeholder; add cleanup API calls as needed.
 */
import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const STATE_DIR = path.join(__dirname, '.auth');

async function globalTeardown(_config: FullConfig) {
  // Clean up auth state files
  if (fs.existsSync(STATE_DIR)) {
    fs.rmSync(STATE_DIR, { recursive: true, force: true });
  }
}

export default globalTeardown;
