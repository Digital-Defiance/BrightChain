/**
 * @fileoverview Fake email service for E2E testing.
 * Captures outbound emails in-memory so tests can extract verification codes
 * and login links without depending on real email delivery (AWS SES).
 * @module services/fakeEmailService
 */

import { IEmailService } from '@digitaldefiance/node-express-suite';

/**
 * Represents a captured email stored by the FakeEmailService.
 */
export interface CapturedEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  timestamp: Date;
}

/**
 * In-memory email service that captures sent emails for test inspection.
 * Implements the same `sendEmail` interface as the production EmailService.
 * Uses a singleton pattern so the TestEmailRouter can access the same instance.
 */
export class FakeEmailService implements IEmailService {
  private static instance: FakeEmailService | null = null;
  private readonly emails: Map<string, CapturedEmail[]> = new Map();

  private constructor() {}

  /**
   * Returns the singleton FakeEmailService instance.
   */
  public static getInstance(): FakeEmailService {
    if (!FakeEmailService.instance) {
      FakeEmailService.instance = new FakeEmailService();
    }
    return FakeEmailService.instance;
  }

  /**
   * Resets the singleton (useful for test teardown).
   */
  public static resetInstance(): void {
    FakeEmailService.instance = null;
  }

  /**
   * Captures an email in the in-memory store instead of sending it.
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param text - Plain text email body
   * @param html - HTML email body
   */
  public async sendEmail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    const email: CapturedEmail = {
      to,
      subject,
      text,
      html,
      timestamp: new Date(),
    };

    const existing = this.emails.get(to);
    if (existing) {
      existing.push(email);
    } else {
      this.emails.set(to, [email]);
    }
  }

  /**
   * Returns all captured emails for a given recipient address.
   * @param recipientAddress - The email address to look up
   * @returns Array of captured emails, or empty array if none found
   */
  public getEmails(recipientAddress: string): CapturedEmail[] {
    return this.emails.get(recipientAddress) ?? [];
  }

  /**
   * Returns the most recently captured email for a given recipient address.
   * @param recipientAddress - The email address to look up
   * @returns The latest captured email, or undefined if none found
   */
  public getLatestEmail(recipientAddress: string): CapturedEmail | undefined {
    const list = this.emails.get(recipientAddress);
    if (!list || list.length === 0) {
      return undefined;
    }
    return list[list.length - 1];
  }

  /**
   * Removes all captured emails from the in-memory store.
   */
  public clear(): void {
    this.emails.clear();
  }

  /**
   * Parses a verification code or login token from email body content.
   * Looks for common patterns: 6-digit codes, UUID-style tokens, and
   * codes embedded in "code=XXX" or "verification code: XXX" patterns.
   * @param emailBody - The email HTML or plain text content to parse
   * @returns The extracted code string, or null if no code found
   */
  public extractCode(emailBody: string): string | null {
    // Pattern: "code=XXXXX" or "code: XXXXX" in query strings or text
    const codeParamMatch = emailBody.match(/code[=:]\s*([A-Za-z0-9-]+)/i);
    if (codeParamMatch) {
      return codeParamMatch[1];
    }

    // Pattern: "verification code: 123456" or "your code is 123456"
    const verificationMatch = emailBody.match(
      /(?:verification\s+code|your\s+code\s+is)[:\s]+(\d{4,8})/i,
    );
    if (verificationMatch) {
      return verificationMatch[1];
    }

    // Pattern: standalone 6-digit code on its own line or between tags
    const sixDigitMatch = emailBody.match(/\b(\d{6})\b/);
    if (sixDigitMatch) {
      return sixDigitMatch[1];
    }

    return null;
  }
}
