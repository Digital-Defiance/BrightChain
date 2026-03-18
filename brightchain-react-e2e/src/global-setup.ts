/**
 * Playwright global setup — runs once before all tests.
 *
 * Registers a single shared test user and saves the auth token to disk.
 * The `authenticatedPage` fixture reuses this token instead of registering
 * a new user per test, which dramatically reduces server load and prevents
 * the API server from crashing under heavy concurrent crypto operations.
 */
import fs from 'fs';
import path from 'path';
import type { FullConfig } from '@playwright/test';

const STATE_DIR = path.join(__dirname, '.auth');
export const SHARED_AUTH_PATH = path.join(STATE_DIR, 'shared-auth.json');

export interface SharedAuth {
  token: string;
  memberId: string;
  username: string;
  email: string;
  password: string;
}

async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL || 'http://localhost:3000';

  // Ensure state directory exists
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  // Wait for server to be reachable
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${baseURL}/api/health`);
      if (res.ok) break;
    } catch {
      // Server not ready yet
    }
    if (i === maxRetries - 1) {
      throw new Error(
        `API server not reachable at ${baseURL} after ${maxRetries} retries`,
      );
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Register a shared test user
  const id =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const creds = {
    username: `e2e_shared_${id}`,
    email: `e2e_shared_${id}@test.brightchain.local`,
    password: `T3st!Pass${id}`,
  };

  const res = await fetch(`${baseURL}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `[global-setup] Registration failed (${res.status}): ${body}`,
    );
  }

  const data = (await res.json()) as {
    data?: { token?: string; memberId?: string };
  };
  const token = data.data?.token;
  if (!token) {
    throw new Error('[global-setup] Registration succeeded but no token');
  }

  const shared: SharedAuth = {
    token,
    memberId: data.data?.memberId ?? '',
    username: creds.username,
    email: creds.email,
    password: creds.password,
  };

  fs.writeFileSync(SHARED_AUTH_PATH, JSON.stringify(shared), 'utf-8');
  console.log(
    `[global-setup] Shared user registered: ${creds.username}`,
  );
}

export default globalSetup;
