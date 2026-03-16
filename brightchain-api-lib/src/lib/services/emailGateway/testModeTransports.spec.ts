/**
 * Unit tests for test mode transports.
 *
 * @see Requirement 8.8 — Test mode for local development
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { createTestModeConfig, type IEmailGatewayConfig } from './emailGatewayConfig';
import {
  CatchallTransport,
  createDkimSigner,
  createTransport,
  FakeDkimSigner,
  NoOpDkimSigner,
} from './testModeTransports';

describe('CatchallTransport', () => {
  let config: IEmailGatewayConfig;
  let transport: CatchallTransport;
  let tempDir: string;

  beforeEach(() => {
    // Create a temp directory for catchall
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catchall-test-'));
    config = createTestModeConfig();
    config.testMode.catchallDirectory = tempDir;
    transport = new CatchallTransport(config);
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should create Maildir directory structure', () => {
    expect(fs.existsSync(path.join(tempDir, 'new'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'cur'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'tmp'))).toBe(true);
  });

  it('should capture email to filesystem', async () => {
    const rawMessage = new TextEncoder().encode(
      'From: sender@test.local\r\nTo: recipient@test.local\r\n\r\nTest body',
    );

    const result = await transport.send(
      'sender@test.local',
      ['recipient@test.local'],
      rawMessage,
    );

    expect(result.success).toBe(true);
    expect(result.responseCode).toBe(250);

    // Check file was created
    const files = fs.readdirSync(path.join(tempDir, 'new'));
    expect(files.length).toBeGreaterThanOrEqual(1);

    // Check metadata sidecar
    const metaFiles = files.filter((f) => f.endsWith('.meta.json'));
    expect(metaFiles.length).toBeGreaterThanOrEqual(1);
  });

  it('should track captured emails in memory', async () => {
    const rawMessage = new TextEncoder().encode('Test message');

    await transport.send('sender@test.local', ['recipient@test.local'], rawMessage);

    const captured = transport.getCapturedEmails();
    expect(captured).toHaveLength(1);
    expect(captured[0].from).toBe('sender@test.local');
    expect(captured[0].to).toContain('recipient@test.local');
  });

  it('should return last captured email', async () => {
    await transport.send(
      'first@test.local',
      ['recipient@test.local'],
      new TextEncoder().encode('First'),
    );
    await transport.send(
      'second@test.local',
      ['recipient@test.local'],
      new TextEncoder().encode('Second'),
    );

    const last = transport.getLastCaptured();
    expect(last?.from).toBe('second@test.local');
  });

  it('should clear captured emails', async () => {
    await transport.send(
      'sender@test.local',
      ['recipient@test.local'],
      new TextEncoder().encode('Test'),
    );

    expect(transport.getCapturedEmails()).toHaveLength(1);

    transport.clearCaptured();

    expect(transport.getCapturedEmails()).toHaveLength(0);
  });

  it('should handle multiple recipients', async () => {
    const result = await transport.send(
      'sender@test.local',
      ['alice@test.local', 'bob@test.local', 'charlie@test.local'],
      new TextEncoder().encode('Test'),
    );

    expect(result.success).toBe(true);

    const captured = transport.getLastCaptured();
    expect(captured?.to).toHaveLength(3);
    expect(captured?.to).toContain('alice@test.local');
    expect(captured?.to).toContain('bob@test.local');
    expect(captured?.to).toContain('charlie@test.local');
  });
});

describe('NoOpDkimSigner', () => {
  it('should return message unchanged', async () => {
    const signer = new NoOpDkimSigner();
    const message = new TextEncoder().encode('Original message');

    const signed = await signer.sign(message, 'test.local', 'default');

    expect(signed).toEqual(message);
  });
});

describe('FakeDkimSigner', () => {
  it('should prepend fake DKIM-Signature header', async () => {
    const signer = new FakeDkimSigner();
    const message = new TextEncoder().encode('Original message');

    const signed = await signer.sign(message, 'test.local', 'selector1');

    const signedText = new TextDecoder().decode(signed);
    expect(signedText).toContain('DKIM-Signature:');
    expect(signedText).toContain('d=test.local');
    expect(signedText).toContain('s=selector1');
    expect(signedText).toContain('FAKE_SIGNATURE_FOR_TESTING_ONLY');
    expect(signedText).toContain('Original message');
  });

  it('should preserve original message after signature', async () => {
    const signer = new FakeDkimSigner();
    const originalText = 'From: test@test.local\r\n\r\nBody';
    const message = new TextEncoder().encode(originalText);

    const signed = await signer.sign(message, 'test.local', 'default');

    const signedText = new TextDecoder().decode(signed);
    expect(signedText).toContain(originalText);
  });
});

describe('createTransport', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transport-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return CatchallTransport when test mode and catchall enabled', () => {
    const config = createTestModeConfig();
    config.testMode.catchallDirectory = tempDir;

    const mockProduction = {
      send: jest.fn(),
    };

    const transport = createTransport(config, mockProduction);

    expect(transport).toBeInstanceOf(CatchallTransport);
  });

  it('should return production transport when test mode disabled', () => {
    const config = createTestModeConfig();
    config.testMode.enabled = false;

    const mockProduction = {
      send: jest.fn(),
    };

    const transport = createTransport(config, mockProduction);

    expect(transport).toBe(mockProduction);
  });

  it('should return production transport when catchall disabled', () => {
    const config = createTestModeConfig();
    config.testMode.catchallEnabled = false;

    const mockProduction = {
      send: jest.fn(),
    };

    const transport = createTransport(config, mockProduction);

    expect(transport).toBe(mockProduction);
  });
});

describe('createDkimSigner', () => {
  it('should return NoOpDkimSigner when test mode and skipDkim enabled', () => {
    const config = createTestModeConfig();

    const mockProduction = {
      sign: jest.fn(),
    };

    const signer = createDkimSigner(config, mockProduction);

    expect(signer).toBeInstanceOf(NoOpDkimSigner);
  });

  it('should return production signer when test mode disabled', () => {
    const config = createTestModeConfig();
    config.testMode.enabled = false;

    const mockProduction = {
      sign: jest.fn(),
    };

    const signer = createDkimSigner(config, mockProduction);

    expect(signer).toBe(mockProduction);
  });

  it('should return production signer when skipDkim disabled', () => {
    const config = createTestModeConfig();
    config.testMode.skipDkim = false;

    const mockProduction = {
      sign: jest.fn(),
    };

    const signer = createDkimSigner(config, mockProduction);

    expect(signer).toBe(mockProduction);
  });
});
