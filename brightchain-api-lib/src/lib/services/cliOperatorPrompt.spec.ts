import {
  ProposalActionType,
  ProposalDisplay,
} from '@brightchain/brightchain-lib';
import { HexString } from '@digitaldefiance/ecies-lib';
import * as readline from 'readline';
import { PassThrough } from 'stream';
import { CLIOperatorPrompt } from './cliOperatorPrompt';

/**
 * Create a mock readline factory that feeds predefined answers
 * to successive rl.question() calls via process.nextTick.
 */
function createMockRlFactory(answers: string[]): () => readline.Interface {
  return () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const rl = readline.createInterface({ input, output });

    let callIndex = 0;

    // Replace question with a mock that resolves from the answers array
    const mockQuestion = (
      _query: string,
      callback: (answer: string) => void,
    ): void => {
      const answer = answers[callIndex] ?? '';
      callIndex++;
      process.nextTick(() => callback(answer));
    };

    rl.question = mockQuestion as typeof rl.question;

    return rl;
  };
}

/**
 * Build a minimal ProposalDisplay for testing.
 */
function makeProposal(overrides?: Partial<ProposalDisplay>): ProposalDisplay {
  return {
    proposalId: 'aabbccdd11223344aabbccdd11223344' as HexString,
    description: 'Test proposal description',
    actionType: ProposalActionType.ADD_MEMBER,
    actionPayload: { memberId: 'test-member' },
    proposerMemberId: '11223344aabbccdd11223344aabbccdd' as HexString,
    expiresAt: new Date('2025-12-31T23:59:59Z'),
    ...overrides,
  };
}

describe('CLIOperatorPrompt', () => {
  const output = new PassThrough();

  describe('promptForVote — approve flow', () => {
    it('should return approve with password when operator approves', async () => {
      const rlFactory = createMockRlFactory(['approve', 'my-secret-password']);
      const prompt = new CLIOperatorPrompt({}, rlFactory, output);
      const proposal = makeProposal();

      const result = await prompt.promptForVote(proposal);

      expect(result.decision).toBe('approve');
      expect(result.password).toBe('my-secret-password');
    });
  });

  describe('promptForVote — reject flow', () => {
    it('should return reject without password when operator rejects', async () => {
      const rlFactory = createMockRlFactory(['reject']);
      const prompt = new CLIOperatorPrompt({}, rlFactory, output);
      const proposal = makeProposal();

      const result = await prompt.promptForVote(proposal);

      expect(result.decision).toBe('reject');
      expect(result.password).toBeUndefined();
    });
  });

  describe('promptForVote — empty password', () => {
    it('should throw and record a failed attempt when password is empty', async () => {
      const rlFactory = createMockRlFactory(['approve', '']);
      const prompt = new CLIOperatorPrompt({}, rlFactory, output);
      const proposal = makeProposal();

      await expect(prompt.promptForVote(proposal)).rejects.toThrow(
        'Authentication failed: empty password provided.',
      );
    });
  });

  describe('promptForVote — displays attachment info', () => {
    it('should display attachment CBL ID and size when present', async () => {
      const chunks: string[] = [];
      const captureOutput = new PassThrough();
      captureOutput.on('data', (chunk: Buffer) =>
        chunks.push(chunk.toString()),
      );

      const rlFactory = createMockRlFactory(['reject']);
      const prompt = new CLIOperatorPrompt({}, rlFactory, captureOutput);
      const proposal = makeProposal({
        attachmentCblId: 'cbl-ref-12345',
        attachmentContent: new Uint8Array(1024),
      });

      await prompt.promptForVote(proposal);

      const fullOutput = chunks.join('');
      expect(fullOutput).toContain('CBL cbl-ref-12345');
      expect(fullOutput).toContain('1024 bytes');
    });
  });

  describe('authentication lockout', () => {
    it('should lock after 3 consecutive failures (default config)', () => {
      const prompt = new CLIOperatorPrompt();
      const proposalId = 'aabbccdd11223344aabbccdd11223344' as HexString;

      expect(prompt.isLocked(proposalId)).toBe(false);

      prompt.recordAuthFailure(proposalId);
      expect(prompt.isLocked(proposalId)).toBe(false);

      prompt.recordAuthFailure(proposalId);
      expect(prompt.isLocked(proposalId)).toBe(false);

      prompt.recordAuthFailure(proposalId);
      expect(prompt.isLocked(proposalId)).toBe(true);
    });

    it('should lock after custom maxAttempts', () => {
      const prompt = new CLIOperatorPrompt({ maxAttempts: 2 });
      const proposalId = 'aabbccdd11223344aabbccdd11223344' as HexString;

      prompt.recordAuthFailure(proposalId);
      expect(prompt.isLocked(proposalId)).toBe(false);

      prompt.recordAuthFailure(proposalId);
      expect(prompt.isLocked(proposalId)).toBe(true);
    });

    it('should throw when promptForVote is called on a locked proposal', async () => {
      const rlFactory = createMockRlFactory(['approve', 'password']);
      const prompt = new CLIOperatorPrompt({}, rlFactory, output);
      const proposal = makeProposal();

      // Lock it
      prompt.recordAuthFailure(proposal.proposalId);
      prompt.recordAuthFailure(proposal.proposalId);
      prompt.recordAuthFailure(proposal.proposalId);

      await expect(prompt.promptForVote(proposal)).rejects.toThrow(
        'Voting is locked for proposal',
      );
    });

    it('should track lockout independently per proposal', () => {
      const prompt = new CLIOperatorPrompt();
      const proposalA = 'aaaa000011112222aaaa000011112222' as HexString;
      const proposalB = 'bbbb000011112222bbbb000011112222' as HexString;

      // Lock proposal A
      prompt.recordAuthFailure(proposalA);
      prompt.recordAuthFailure(proposalA);
      prompt.recordAuthFailure(proposalA);

      expect(prompt.isLocked(proposalA)).toBe(true);
      expect(prompt.isLocked(proposalB)).toBe(false);
    });
  });

  describe('cooldown expiry', () => {
    let realDateNow: () => number;
    let currentTime: number;

    beforeEach(() => {
      realDateNow = Date.now;
      currentTime = 1_000_000;
      Date.now = () => currentTime;
    });

    afterEach(() => {
      Date.now = realDateNow;
    });

    it('should unlock after cooldown period expires', () => {
      const cooldownMs = 5_000;
      const prompt = new CLIOperatorPrompt({ cooldownMs });
      const proposalId = 'aabbccdd11223344aabbccdd11223344' as HexString;

      // Lock it
      prompt.recordAuthFailure(proposalId);
      prompt.recordAuthFailure(proposalId);
      prompt.recordAuthFailure(proposalId);
      expect(prompt.isLocked(proposalId)).toBe(true);

      // Advance time just under cooldown
      currentTime += cooldownMs - 1;
      expect(prompt.isLocked(proposalId)).toBe(true);

      // Advance past cooldown
      currentTime += 2;
      expect(prompt.isLocked(proposalId)).toBe(false);
    });

    it('should allow voting again after cooldown expires', async () => {
      const cooldownMs = 1_000;
      const rlFactory = createMockRlFactory(['approve', 'my-password']);
      const prompt = new CLIOperatorPrompt({ cooldownMs }, rlFactory, output);
      const proposal = makeProposal();

      // Lock it
      prompt.recordAuthFailure(proposal.proposalId);
      prompt.recordAuthFailure(proposal.proposalId);
      prompt.recordAuthFailure(proposal.proposalId);
      expect(prompt.isLocked(proposal.proposalId)).toBe(true);

      // Advance past cooldown
      currentTime += cooldownMs + 1;

      const result = await prompt.promptForVote(proposal);
      expect(result.decision).toBe('approve');
      expect(result.password).toBe('my-password');
    });

    it('should reset failed attempts counter after cooldown expires', () => {
      const cooldownMs = 1_000;
      const prompt = new CLIOperatorPrompt({ cooldownMs });
      const proposalId = 'aabbccdd11223344aabbccdd11223344' as HexString;

      // Lock it
      prompt.recordAuthFailure(proposalId);
      prompt.recordAuthFailure(proposalId);
      prompt.recordAuthFailure(proposalId);
      expect(prompt.isLocked(proposalId)).toBe(true);

      // Advance past cooldown
      currentTime += cooldownMs + 1;
      expect(prompt.isLocked(proposalId)).toBe(false);

      // Should need 3 more failures to lock again
      prompt.recordAuthFailure(proposalId);
      expect(prompt.isLocked(proposalId)).toBe(false);

      prompt.recordAuthFailure(proposalId);
      expect(prompt.isLocked(proposalId)).toBe(false);

      prompt.recordAuthFailure(proposalId);
      expect(prompt.isLocked(proposalId)).toBe(true);
    });
  });

  describe('isLocked state transitions', () => {
    let realDateNow: () => number;
    let currentTime: number;

    beforeEach(() => {
      realDateNow = Date.now;
      currentTime = 1_000_000;
      Date.now = () => currentTime;
    });

    afterEach(() => {
      Date.now = realDateNow;
    });

    it('should return false for unknown proposal IDs', () => {
      const prompt = new CLIOperatorPrompt();
      const unknownId = 'ffff000011112222ffff000011112222' as HexString;
      expect(prompt.isLocked(unknownId)).toBe(false);
    });

    it('should transition: unlocked → locked → unlocked (after cooldown)', () => {
      const cooldownMs = 2_000;
      const prompt = new CLIOperatorPrompt({ cooldownMs });
      const proposalId = 'aabbccdd11223344aabbccdd11223344' as HexString;

      // Initially unlocked
      expect(prompt.isLocked(proposalId)).toBe(false);

      // Trigger lockout
      prompt.recordAuthFailure(proposalId);
      prompt.recordAuthFailure(proposalId);
      prompt.recordAuthFailure(proposalId);
      expect(prompt.isLocked(proposalId)).toBe(true);

      // After cooldown — unlocked again
      currentTime += cooldownMs + 1;
      expect(prompt.isLocked(proposalId)).toBe(false);
    });
  });
});
