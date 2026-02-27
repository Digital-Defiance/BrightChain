/**
 * CLIOperatorPrompt — Node.js readline-based implementation of IOperatorPrompt.
 *
 * Presents quorum proposals to the node operator via the terminal and collects
 * vote decisions with password authentication on approve votes.
 *
 * Tracks failed authentication attempts per proposal and locks voting after
 * a configurable number of consecutive failures for a cooldown period.
 *
 * This is a Node.js-specific service that lives in brightchain-api-lib.
 *
 * @see Requirements 6
 */

import {
  IOperatorPrompt,
  OperatorVoteResult,
  ProposalDisplay,
} from '@brightchain/brightchain-lib';
import { HexString } from '@digitaldefiance/ecies-lib';
import * as readline from 'readline';
import { Writable } from 'stream';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Configuration for the CLI operator prompt lockout behavior.
 */
export interface CLIOperatorPromptConfig {
  /** Maximum consecutive failed authentication attempts before lockout. Default: 3 */
  maxAttempts: number;
  /** Cooldown duration in milliseconds after lockout. Default: 300000 (5 minutes) */
  cooldownMs: number;
}

/**
 * Internal tracking state for failed authentication attempts on a proposal.
 */
interface LockoutState {
  /** Number of consecutive failed attempts */
  failedAttempts: number;
  /** Timestamp (ms) when the lockout was triggered, or null if not locked */
  lockedAt: number | null;
}

// ─── Default Config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: CLIOperatorPromptConfig = {
  maxAttempts: 3,
  cooldownMs: 300_000, // 5 minutes
};

// ─── Implementation ─────────────────────────────────────────────────────────

/**
 * CLI-based operator prompt for quorum voting.
 *
 * Uses Node.js readline to interact with the operator via stdin/stdout.
 * Tracks failed authentication attempts per proposal and enforces lockout
 * after the configured maximum failures.
 */
export class CLIOperatorPrompt implements IOperatorPrompt {
  private readonly config: CLIOperatorPromptConfig;
  private readonly lockoutMap: Map<HexString, LockoutState> = new Map();
  private readonly rlFactory: () => readline.Interface;
  private readonly output: Writable;

  constructor(
    config?: Partial<CLIOperatorPromptConfig>,
    rlFactory?: () => readline.Interface,
    output?: Writable,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.output = output ?? process.stdout;
    this.rlFactory =
      rlFactory ??
      (() =>
        readline.createInterface({
          input: process.stdin,
          output: this.output,
        }));
  }

  /**
   * Check if the voting interface is locked for a given proposal.
   * Returns true if the operator has exceeded the maximum failed attempts
   * and the cooldown period has not yet elapsed.
   */
  isLocked(proposalId: HexString): boolean {
    const state = this.lockoutMap.get(proposalId);
    if (!state || state.lockedAt === null) {
      return false;
    }
    const elapsed = Date.now() - state.lockedAt;
    if (elapsed >= this.config.cooldownMs) {
      // Cooldown expired — reset lockout state
      state.failedAttempts = 0;
      state.lockedAt = null;
      return false;
    }
    return true;
  }

  /**
   * Present a proposal to the operator and collect their vote.
   * Displays proposal details, collects a vote decision, and on approve
   * requires password authentication.
   *
   * @throws Error if the proposal is currently locked due to failed attempts
   */
  async promptForVote(proposal: ProposalDisplay): Promise<OperatorVoteResult> {
    if (this.isLocked(proposal.proposalId)) {
      throw new Error(
        `Voting is locked for proposal ${proposal.proposalId}. Please wait for the cooldown period to expire.`,
      );
    }

    const rl = this.rlFactory();

    try {
      this.displayProposal(proposal);

      const decision = await this.collectDecision(rl);

      if (decision === 'reject') {
        return { decision: 'reject' };
      }

      // Approve path — collect password
      const password = await this.collectPassword(rl);

      if (!password) {
        this.recordFailedAttempt(proposal.proposalId);
        throw new Error('Authentication failed: empty password provided.');
      }

      // Reset failed attempts on successful authentication
      this.resetAttempts(proposal.proposalId);

      return { decision: 'approve', password };
    } finally {
      rl.close();
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  /**
   * Display proposal details to the operator via the readline output.
   */
  private displayProposal(proposal: ProposalDisplay): void {
    this.output.write('\n══════════════════════════════════════════════════\n');
    this.output.write('  QUORUM PROPOSAL — VOTE REQUIRED\n');
    this.output.write('══════════════════════════════════════════════════\n\n');
    this.output.write(`  Proposal ID:  ${proposal.proposalId}\n`);
    this.output.write(`  Description:  ${proposal.description}\n`);
    this.output.write(`  Action Type:  ${proposal.actionType}\n`);
    this.output.write(
      `  Action Payload: ${JSON.stringify(proposal.actionPayload, null, 2)}\n`,
    );
    this.output.write(`  Proposer:     ${proposal.proposerMemberId}\n`);
    this.output.write(`  Expires At:   ${proposal.expiresAt.toISOString()}\n`);

    if (proposal.attachmentCblId) {
      this.output.write(`  Attachment:   CBL ${proposal.attachmentCblId}\n`);
    }
    if (proposal.attachmentContent) {
      this.output.write(
        `  Attachment Size: ${proposal.attachmentContent.byteLength} bytes\n`,
      );
    }

    this.output.write('\n──────────────────────────────────────────────────\n');
  }

  /**
   * Prompt the operator for their vote decision (approve or reject).
   */
  private collectDecision(
    rl: readline.Interface,
  ): Promise<'approve' | 'reject'> {
    return new Promise((resolve) => {
      const ask = (): void => {
        rl.question(
          '  Enter your vote (approve/reject): ',
          (answer: string) => {
            const normalized = answer.trim().toLowerCase();
            if (normalized === 'approve' || normalized === 'reject') {
              resolve(normalized);
            } else {
              this.output.write(
                '  Invalid input. Please enter "approve" or "reject".\n',
              );
              ask();
            }
          },
        );
      };
      ask();
    });
  }

  /**
   * Prompt the operator for their password to authenticate the approve vote.
   */
  private collectPassword(rl: readline.Interface): Promise<string> {
    return new Promise((resolve) => {
      rl.question(
        '  Enter your password to authenticate: ',
        (answer: string) => {
          resolve(answer);
        },
      );
    });
  }

  /**
   * Record a failed authentication attempt for a proposal.
   * If the maximum attempts are reached, trigger lockout.
   */
  private recordFailedAttempt(proposalId: HexString): void {
    let state = this.lockoutMap.get(proposalId);
    if (!state) {
      state = { failedAttempts: 0, lockedAt: null };
      this.lockoutMap.set(proposalId, state);
    }
    state.failedAttempts += 1;
    if (state.failedAttempts >= this.config.maxAttempts) {
      state.lockedAt = Date.now();
    }
  }

  /**
   * Record a failed attempt externally (for use when authentication
   * is validated outside this class, e.g., by the QuorumStateMachine).
   */
  recordAuthFailure(proposalId: HexString): void {
    this.recordFailedAttempt(proposalId);
  }

  /**
   * Reset failed attempts for a proposal (on successful authentication).
   */
  private resetAttempts(proposalId: HexString): void {
    this.lockoutMap.delete(proposalId);
  }
}
