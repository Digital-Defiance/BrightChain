/**
 * Authentication-related types for the BrightChain VFS Explorer extension.
 */

import type { IRequestUserDTO } from '../api/types';

/** Auth state emitted by AuthManager */
export interface IAuthState {
  authenticated: boolean;
  user?: IRequestUserDTO;
  serverPublicKey?: string;
}

/** Auth event names */
export type AuthEvent = 'auth-changed';

/** Connection states for StatusIndicator */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/** Messages from Webview → Extension Host */
export type WebviewToHostMessage =
  | {
      type: 'mnemonic-login';
      mnemonic: string;
      username?: string;
      email?: string;
    }
  | { type: 'password-login'; usernameOrEmail: string; password: string }
  | { type: 'cancel' };

/** Messages from Extension Host → Webview */
export type HostToWebviewMessage =
  | { type: 'login-success' }
  | { type: 'login-error'; message: string }
  | { type: 'loading'; loading: boolean };
