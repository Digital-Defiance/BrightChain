import * as vscode from 'vscode';

const SECRET_KEY = 'brightchain.jwt';

/**
 * Wraps VS Code SecretStorage for JWT token persistence.
 * Tokens survive extension restarts and VS Code restarts.
 */
export class TokenStore {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  /** Store a JWT token. */
  async store(token: string): Promise<void> {
    await this.secrets.store(SECRET_KEY, token);
  }

  /** Retrieve the stored JWT token, or undefined if none exists. */
  async get(): Promise<string | undefined> {
    return this.secrets.get(SECRET_KEY);
  }

  /** Remove the stored JWT token. */
  async clear(): Promise<void> {
    await this.secrets.delete(SECRET_KEY);
  }
}
