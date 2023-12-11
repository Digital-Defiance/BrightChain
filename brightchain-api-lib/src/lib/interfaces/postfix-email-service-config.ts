/**
 * Configuration options for PostfixEmailService.
 */
export interface IPostfixEmailServiceConfig {
  /** Postfix SMTP host (default: from gateway config or 'localhost') */
  host?: string;
  /** Postfix SMTP port (default: from gateway config or 25) */
  port?: number;
  /** Optional SMTP authentication credentials */
  auth?: { user: string; pass: string };
  /** Sender email address (required) */
  emailSender: string;
  /** Whether to disable email sending (for testing) */
  disableEmailSend?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /** Connection timeout in milliseconds (default: 10000) */
  connectionTimeout?: number;
  /** Socket timeout in milliseconds (default: 10000) */
  socketTimeout?: number;
  /** Use TLS (default: false for local Postfix) */
  secure?: boolean;
  /** Ignore TLS certificate errors (default: true for local dev) */
  ignoreTLS?: boolean;
}
