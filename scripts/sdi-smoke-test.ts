#!/usr/bin/env tsx
/**
 * End-to-end smoke test for the OSC 7777 SDI pipeline.
 *
 * Starts a minimal mock Desktop Agent daemon on a temp Unix socket,
 * invokes bsh-inject with test credentials (via SDI_SOCKET_PATH),
 * captures and decrypts the emitted OSC 7777 sequence, then asserts
 * the payload round-trips correctly.
 *
 * Usage:
 *   npx tsx scripts/sdi-smoke-test.ts
 *
 * Requires bsh 5.10.0+ in PATH.
 */

import { spawn } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';

// ── Constants matching sdi.c ──────────────────────────────────────────────────

const SESSION_ID_LEN = 16; // bytes
const X25519_KEY_LEN = 32; // bytes

// DER SubjectPublicKeyInfo header for X25519 (OID 1.3.101.110)
const X25519_SPKI_PREFIX = Buffer.from('302a300506032b656e032100', 'hex');

function wrapX25519Pub(raw: Buffer): crypto.KeyObject {
  const der = Buffer.concat([X25519_SPKI_PREFIX, raw]);
  return crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
}

function rawBytesOfX25519Pub(pub: crypto.KeyObject): Buffer {
  const der = pub.export({ type: 'spki', format: 'der' }) as Buffer;
  return der.subarray(X25519_SPKI_PREFIX.length);
}

// ── Mock Desktop Agent Daemon ─────────────────────────────────────────────────

interface MockSession {
  sessionId: Buffer;
  sessionKey: Buffer;
}

function startMockDaemon(socketPath: string): {
  sessionPromise: Promise<MockSession>;
  server: net.Server;
} {
  try {
    fs.unlinkSync(socketPath);
  } catch {
    /* stale socket */
  }

  let resolve!: (v: MockSession) => void;
  let reject!: (e: unknown) => void;
  const sessionPromise = new Promise<MockSession>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const server = net.createServer((conn) => {
    const chunks: Buffer[] = [];

    conn.on('error', reject);
    conn.on('data', (chunk) => {
      chunks.push(chunk);
      const buf = Buffer.concat(chunks);
      if (buf.length < SESSION_ID_LEN + X25519_KEY_LEN) return;

      const sessionId = buf.subarray(0, SESSION_ID_LEN);
      const shellPubRaw = buf.subarray(
        SESSION_ID_LEN,
        SESSION_ID_LEN + X25519_KEY_LEN,
      );

      // Generate daemon's ephemeral X25519 keypair
      const { privateKey: daemonPriv, publicKey: daemonPub } =
        crypto.generateKeyPairSync('x25519');

      // Send daemon's raw 32-byte public key back to the shell
      conn.write(rawBytesOfX25519Pub(daemonPub), () => conn.end());
      server.close();

      // ECDH shared secret
      const shellPub = wrapX25519Pub(shellPubRaw);
      const shared = crypto.diffieHellman({
        privateKey: daemonPriv,
        publicKey: shellPub,
      });

      // HKDF-SHA256 — matches sdi.c: IKM=shared, salt=sessionId, info="sdi-session-key"
      crypto.hkdf(
        'sha256',
        shared,
        sessionId,
        Buffer.from('sdi-session-key'),
        32,
        (err, key) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({ sessionId, sessionKey: Buffer.from(key) });
        },
      );
    });
  });

  server.on('error', reject);
  server.listen(socketPath, () => {
    fs.chmodSync(socketPath, 0o600);
    process.stderr.write(`[daemon] listening at ${socketPath}\n`);
  });

  return { sessionPromise, server };
}

// ── OSC 7777 sequence parser ──────────────────────────────────────────────────

interface Osc7777 {
  sessionIdHex: string;
  type: string;
  context: string;
  nonce: Buffer;
  ciphertext: Buffer;
  authTag: Buffer;
}

function parseOsc7777(buf: Buffer): Osc7777 {
  const PREFIX = Buffer.from('\x1b]7777;');
  const start = buf.indexOf(PREFIX);
  if (start === -1) {
    throw new Error(
      `OSC 7777 sequence not found. stdout hex: ${buf.slice(0, 64).toString('hex')}…`,
    );
  }

  let end = -1;
  for (let i = start + PREFIX.length; i < buf.length; i++) {
    if (buf[i] === 0x07) {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error('OSC 7777: missing BEL terminator');

  const inner = buf.subarray(start + PREFIX.length, end).toString('ascii');
  const parts = inner.split(';');
  if (parts.length !== 6)
    throw new Error(
      `OSC 7777: expected 6 fields, got ${parts.length}: ${inner}`,
    );

  const [sessionIdHex, typeStr, b64Context, b64Nonce, b64Ct, b64Tag] = parts;
  return {
    sessionIdHex,
    type: typeStr,
    context: Buffer.from(b64Context, 'base64').toString('utf8'),
    nonce: Buffer.from(b64Nonce, 'base64'),
    ciphertext: Buffer.from(b64Ct, 'base64'),
    authTag: Buffer.from(b64Tag, 'base64'),
  };
}

// ── bsh-inject runner (async, stdout captured for analysis) ──────────────────

function runBshInject(
  socketPath: string,
  context: string,
  payloadJson: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'bsh',
      [
        '-c',
        'zmodload bsh/sdi 2>/dev/null; bsh-inject "$@"',
        '_', // $0 (dummy; $@ starts from $1)
        '--type',
        'ephemeral-auth',
        '--context',
        context,
      ],
      {
        env: { ...process.env, SDI_SOCKET_PATH: socketPath },
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout?.on('data', (d: Buffer) => out.push(d));
    child.stderr?.on('data', (d: Buffer) => err.push(d));

    child.stdin?.write(payloadJson, (writeErr) => {
      if (writeErr) reject(writeErr);
      else child.stdin?.end();
    });

    child.on('close', (code) => {
      const stderr = Buffer.concat(err).toString();
      if (code !== 0) {
        reject(new Error(`bsh-inject exited ${code}: ${stderr}`));
        return;
      }
      if (stderr) process.stderr.write(`[bsh] ${stderr}`);
      resolve(Buffer.concat(out));
    });

    child.on('error', reject);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const socketPath = path.join(os.tmpdir(), `bsh-sdi-test-${process.pid}.sock`);
  const context = 'http://localhost:3000/api';

  const testPayload = {
    type: 'ephemeral-auth' as const,
    context,
    ttl: 300,
    data: {
      username: 'smoketest',
      password: 'SmokeTest1!',
      email: 'smoke@example.com',
      additional_fields: {
        mnemonic:
          'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      },
    },
  };

  // 1. Start mock daemon
  const { sessionPromise } = startMockDaemon(socketPath);

  // Give the server one event-loop tick to bind the socket before bsh connects
  await new Promise((r) => setImmediate(r));

  // 2. Run bsh-inject (async — event loop also drives daemon connection callbacks)
  process.stderr.write('[test] running bsh-inject…\n');
  const [bshStdout, session] = await Promise.all([
    runBshInject(socketPath, context, JSON.stringify(testPayload)),
    sessionPromise,
  ]);

  process.stderr.write(
    `[test] session ID: ${session.sessionId.toString('hex')}\n`,
  );

  // 3. Parse the OSC 7777 sequence from bsh-inject's captured stdout
  const osc = parseOsc7777(bshStdout);
  process.stderr.write(`[test] OSC session ID: ${osc.sessionIdHex}\n`);

  // 4. Verify session ID
  const expectedHex = session.sessionId.toString('hex');
  if (osc.sessionIdHex !== expectedHex) {
    throw new Error(
      `Session ID mismatch: got ${osc.sessionIdHex}, expected ${expectedHex}`,
    );
  }

  // 5. Decrypt — AAD = bytes(type) || bytes(context), from the OSC sequence fields
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    session.sessionKey,
    osc.nonce,
  );
  decipher.setAuthTag(osc.authTag);
  decipher.setAAD(
    Buffer.concat([Buffer.from(osc.type), Buffer.from(osc.context)]),
  );

  let decrypted: Buffer;
  try {
    decrypted = Buffer.concat([
      decipher.update(osc.ciphertext),
      decipher.final(),
    ]);
  } catch (err) {
    throw new Error(`AES-256-GCM auth/decrypt failed: ${err}`);
  }

  const parsed = JSON.parse(decrypted.toString('utf8')) as typeof testPayload;
  process.stderr.write('[test] decrypted payload:\n');
  process.stderr.write(JSON.stringify(parsed, null, 2) + '\n');

  // 6. Assertions
  const d = parsed.data;
  if (d.username !== testPayload.data.username)
    throw new Error(`username mismatch: ${d.username}`);
  if (d.password !== testPayload.data.password)
    throw new Error('password mismatch');
  if (d.email !== testPayload.data.email)
    throw new Error(`email mismatch: ${d.email}`);

  console.log('\nPASS — SDI round-trip verified end-to-end');

  try {
    fs.unlinkSync(socketPath);
  } catch {
    /* ignore */
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\nFAIL: ${msg}`);
  process.exit(1);
});
