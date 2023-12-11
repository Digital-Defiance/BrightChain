#!/usr/bin/env node
/**
 * Ensures native Node.js addons (like bcrypt) are compiled for the current platform.
 *
 * Yarn 4 with the pnpm nodeLinker doesn't always run install lifecycle scripts,
 * so native bindings may be missing after `yarn install`. This script is called
 * from the root postinstall hook to fix that.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..', '..');

function rebuildBcrypt() {
  const bcryptDir = path.join(root, 'node_modules', 'bcrypt');
  if (!fs.existsSync(bcryptDir)) {
    console.log('[rebuild-native] bcrypt not found, skipping');
    return;
  }

  // Check if the native binding already exists
  const bindingDir = path.join(bcryptDir, 'lib', 'binding');
  if (fs.existsSync(bindingDir)) {
    const entries = fs.readdirSync(bindingDir);
    if (entries.some((e) => e.startsWith('napi'))) {
      console.log('[rebuild-native] bcrypt native binding already present');
      return;
    }
  }

  console.log('[rebuild-native] bcrypt native binding missing, rebuilding...');

  // Find node-pre-gyp in the store
  const storeDir = path.join(root, 'node_modules', '.store');
  let preGypLib = null;
  if (fs.existsSync(storeDir)) {
    const entries = fs.readdirSync(storeDir);
    const preGypDir = entries.find((e) => e.startsWith('@mapbox-node-pre-gyp-npm-'));
    if (preGypDir) {
      const candidate = path.join(storeDir, preGypDir, 'package', 'lib', 'node-pre-gyp.js');
      if (fs.existsSync(candidate)) {
        preGypLib = candidate;
      }
    }
  }

  if (!preGypLib) {
    // Fallback: try the standard hoisted location
    const hoisted = path.join(root, 'node_modules', '@mapbox', 'node-pre-gyp', 'lib', 'node-pre-gyp.js');
    if (fs.existsSync(hoisted)) {
      preGypLib = hoisted;
    }
  }

  if (!preGypLib) {
    console.warn('[rebuild-native] Could not find @mapbox/node-pre-gyp — run `npm rebuild bcrypt` manually');
    return;
  }

  try {
    execSync(`node "${preGypLib}" install --fallback-to-build`, {
      cwd: bcryptDir,
      stdio: 'inherit',
    });
    console.log('[rebuild-native] bcrypt rebuilt successfully');
  } catch (err) {
    console.warn('[rebuild-native] bcrypt rebuild failed:', err.message);
  }
}

function rebuildSharp() {
  const sharpDir = path.join(root, 'node_modules', 'sharp');
  if (!fs.existsSync(sharpDir)) {
    console.log('[rebuild-native] sharp not found, skipping');
    return;
  }

  // sharp uses @img/sharp-<platform> prebuilt binaries — check if the binding loads
  try {
    require(sharpDir);
    console.log('[rebuild-native] sharp native binding already present');
    return;
  } catch {
    // binding missing or broken, fall through to rebuild
  }

  console.log('[rebuild-native] sharp native binding missing, rebuilding...');
  try {
    execSync('node -e "require(\'sharp\')"', {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, npm_config_platform: process.platform },
    });
    console.log('[rebuild-native] sharp rebuilt successfully');
  } catch (err) {
    console.warn('[rebuild-native] sharp rebuild failed:', err.message);
    console.warn('[rebuild-native] Try running: yarn add sharp --ignore-scripts=false');
  }
}

rebuildBcrypt();
rebuildSharp();
