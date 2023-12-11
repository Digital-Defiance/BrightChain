/**
 * KeyStoreController — REST API for encryption key/certificate management.
 *
 * Routes:
 *   POST   /gpg/generate       — Generate GPG keypair
 *   POST   /gpg/import         — Import GPG public key
 *   POST   /gpg/publish        — Publish GPG key to keyserver
 *   GET    /gpg/export         — Export GPG public key
 *   DELETE /gpg                — Delete GPG keypair
 *   POST   /smime/import       — Import S/MIME certificate
 *   GET    /smime              — Get S/MIME certificate metadata
 *   DELETE /smime              — Delete S/MIME certificate
 *   GET    /resolve/:email     — Resolve available keys for email
 *   PUT    /preferences        — Set encryption preference
 *   GET    /preferences        — Get encryption preferences
 *
 * @see Requirements 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.6, 6.1, 6.2, 6.3, 6.6, 10.3, 13.1, 13.2
 */

import {
  GpgKeyManager,
  IKeyStore,
  IKeyStoreEntry,
  IRecipientKeyAvailability,
  MessageEncryptionScheme,
  SmimeCertificateManager,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  IApiMessageResponse,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

// ─── Response types ──────────────────────────────────────────────────────────

type KeyStoreApiResponse = IApiMessageResponse | ApiErrorResponse;

// ─── Handler interface ───────────────────────────────────────────────────────

interface KeyStoreHandlers extends TypedHandlers {
  generateGpgKeyPair: ApiRequestHandler<KeyStoreApiResponse>;
  importGpgPublicKey: ApiRequestHandler<KeyStoreApiResponse>;
  publishGpgKey: ApiRequestHandler<KeyStoreApiResponse>;
  exportGpgPublicKey: ApiRequestHandler<KeyStoreApiResponse>;
  deleteGpgKeyPair: ApiRequestHandler<KeyStoreApiResponse>;
  importSmimeCertificate: ApiRequestHandler<KeyStoreApiResponse>;
  getSmimeCertificate: ApiRequestHandler<KeyStoreApiResponse>;
  deleteSmimeCertificate: ApiRequestHandler<KeyStoreApiResponse>;
  resolveKeys: ApiRequestHandler<KeyStoreApiResponse>;
  setPreference: ApiRequestHandler<KeyStoreApiResponse>;
  getPreference: ApiRequestHandler<KeyStoreApiResponse>;
}

// ─── Valid encryption scheme values ──────────────────────────────────────────

const VALID_SCHEMES = new Set(Object.values(MessageEncryptionScheme));

// ─── Controller ──────────────────────────────────────────────────────────────

export class KeyStoreController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  KeyStoreApiResponse,
  KeyStoreHandlers,
  CoreLanguageCode
> {
  private keyStore: IKeyStore<string> | null = null;
  private gpgKeyManager: GpgKeyManager | null = null;
  private smimeCertificateManager: SmimeCertificateManager | null = null;
  private keyserverUrl = 'https://keys.openpgp.org';

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  // ── Dependency setters ─────────────────────────────────────────────

  public setKeyStore(store: IKeyStore<string>): void {
    this.keyStore = store;
  }

  public setGpgKeyManager(manager: GpgKeyManager): void {
    this.gpgKeyManager = manager;
  }

  public setSmimeCertificateManager(manager: SmimeCertificateManager): void {
    this.smimeCertificateManager = manager;
  }

  public setKeyserverUrl(url: string): void {
    this.keyserverUrl = url;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private getKeyStore(): IKeyStore<string> {
    if (!this.keyStore) {
      throw new Error('KeyStoreService not initialized');
    }
    return this.keyStore;
  }

  private getGpgKeyManager(): GpgKeyManager {
    if (!this.gpgKeyManager) {
      throw new Error('GpgKeyManager not initialized');
    }
    return this.gpgKeyManager;
  }

  private getSmimeCertManager(): SmimeCertificateManager {
    if (!this.smimeCertificateManager) {
      throw new Error('SmimeCertificateManager not initialized');
    }
    return this.smimeCertificateManager;
  }

  private getMemberId(req: unknown): string {
    const user = (req as { user?: { id?: string } }).user;
    if (user && typeof user.id === 'string') return user.id;
    throw new Error('No authenticated user');
  }

  private getUserEmail(req: unknown): string {
    const user = (req as { user?: { id?: string; email?: string } }).user;
    if (!user) throw new Error('No authenticated user');
    if (typeof user.email === 'string' && user.email.length > 0)
      return user.email;
    if (typeof user.id === 'string') return user.id;
    throw new Error('No authenticated user');
  }

  // ── Route definitions ───────────────────────────────────────────────

  protected initRouteDefinitions(): void {
    const auth = {
      useAuthentication: true,
      useCryptoAuthentication: false,
    };

    this.routeDefinitions = [
      routeConfig('post', '/gpg/generate', {
        ...auth,
        handlerKey: 'generateGpgKeyPair',
      }),
      routeConfig('post', '/gpg/import', {
        ...auth,
        handlerKey: 'importGpgPublicKey',
      }),
      routeConfig('post', '/gpg/publish', {
        ...auth,
        handlerKey: 'publishGpgKey',
      }),
      routeConfig('get', '/gpg/export', {
        ...auth,
        handlerKey: 'exportGpgPublicKey',
      }),
      routeConfig('delete', '/gpg', {
        ...auth,
        handlerKey: 'deleteGpgKeyPair',
      }),
      routeConfig('post', '/smime/import', {
        ...auth,
        handlerKey: 'importSmimeCertificate',
      }),
      routeConfig('get', '/smime', {
        ...auth,
        handlerKey: 'getSmimeCertificate',
      }),
      routeConfig('delete', '/smime', {
        ...auth,
        handlerKey: 'deleteSmimeCertificate',
      }),
      routeConfig('get', '/resolve/:email', {
        ...auth,
        handlerKey: 'resolveKeys',
      }),
      routeConfig('put', '/preferences', {
        ...auth,
        handlerKey: 'setPreference',
      }),
      routeConfig('get', '/preferences', {
        ...auth,
        handlerKey: 'getPreference',
      }),
    ];

    this.handlers = {
      generateGpgKeyPair: this.handleGenerateGpgKeyPair.bind(this),
      importGpgPublicKey: this.handleImportGpgPublicKey.bind(this),
      publishGpgKey: this.handlePublishGpgKey.bind(this),
      exportGpgPublicKey: this.handleExportGpgPublicKey.bind(this),
      deleteGpgKeyPair: this.handleDeleteGpgKeyPair.bind(this),
      importSmimeCertificate: this.handleImportSmimeCertificate.bind(this),
      getSmimeCertificate: this.handleGetSmimeCertificate.bind(this),
      deleteSmimeCertificate: this.handleDeleteSmimeCertificate.bind(this),
      resolveKeys: this.handleResolveKeys.bind(this),
      setPreference: this.handleSetPreference.bind(this),
      getPreference: this.handleGetPreference.bind(this),
    };

    ControllerRegistry.register(
      '/keys',
      'KeyStoreController',
      this.routeDefinitions,
    );
  }

  // ── Handler: POST /gpg/generate ─────────────────────────────────────

  private async handleGenerateGpgKeyPair(req: unknown): Promise<{
    statusCode: number;
    response: KeyStoreApiResponse;
  }> {
    try {
      const body = (req as { body?: { passphrase?: string; name?: string } })
        .body;
      if (!body?.passphrase || typeof body.passphrase !== 'string') {
        return validationError('passphrase is required');
      }

      const userId = this.getMemberId(req);
      const email = this.getUserEmail(req);
      const name = body.name ?? email.split('@')[0];

      const gpg = this.getGpgKeyManager();
      const keyPair = await gpg.generateKeyPair(name, email, body.passphrase);

      const store = this.getKeyStore();
      const entry = await store.storeGpgKeyPair(userId, keyPair);

      return {
        statusCode: 201,
        response: {
          message: 'GPG keypair generated successfully',
          ...this.sanitizeEntry(entry),
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ── Handler: POST /gpg/import ──────────────────────────────────────

  private async handleImportGpgPublicKey(req: unknown): Promise<{
    statusCode: number;
    response: KeyStoreApiResponse;
  }> {
    try {
      const body = (req as { body?: { armoredKey?: string; email?: string } })
        .body;
      if (!body?.armoredKey || typeof body.armoredKey !== 'string') {
        return validationError('armoredKey is required');
      }

      const userId = this.getMemberId(req);
      const gpg = this.getGpgKeyManager();
      const metadata = await gpg.importPublicKey(body.armoredKey);
      const contactEmail =
        body.email ?? this.extractEmailFromGpgUserId(metadata.userId);

      const store = this.getKeyStore();
      const entry = await store.storeGpgPublicKey(
        userId,
        contactEmail,
        body.armoredKey,
        metadata,
      );

      return {
        statusCode: 201,
        response: {
          message: 'GPG public key imported successfully',
          ...this.sanitizeEntry(entry),
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ── Handler: POST /gpg/publish ─────────────────────────────────────

  private async handlePublishGpgKey(req: unknown): Promise<{
    statusCode: number;
    response: KeyStoreApiResponse;
  }> {
    try {
      const userId = this.getMemberId(req);
      const store = this.getKeyStore();
      const entry = await store.getGpgKeyPair(userId);
      if (!entry) {
        return notFoundError('GPG keypair', userId);
      }

      const gpg = this.getGpgKeyManager();
      await gpg.publishToKeyserver(entry.publicMaterial, this.keyserverUrl);

      return {
        statusCode: 200,
        response: {
          message: 'GPG public key published to keyserver',
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ── Handler: GET /gpg/export ───────────────────────────────────────

  private async handleExportGpgPublicKey(req: unknown): Promise<{
    statusCode: number;
    response: KeyStoreApiResponse;
  }> {
    try {
      const userId = this.getMemberId(req);
      const store = this.getKeyStore();
      const entry = await store.getGpgKeyPair(userId);
      if (!entry) {
        return notFoundError('GPG keypair', userId);
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          publicKeyArmored: entry.publicMaterial,
          metadata: entry.metadata,
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ── Handler: DELETE /gpg ───────────────────────────────────────────

  private async handleDeleteGpgKeyPair(req: unknown): Promise<{
    statusCode: number;
    response: KeyStoreApiResponse;
  }> {
    try {
      const userId = this.getMemberId(req);
      const store = this.getKeyStore();
      await store.deleteGpgKeyPair(userId);

      return {
        statusCode: 200,
        response: { message: 'GPG keypair deleted' } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ── Handler: POST /smime/import ─────────────────────────────────────

  private async handleImportSmimeCertificate(req: unknown): Promise<{
    statusCode: number;
    response: KeyStoreApiResponse;
  }> {
    try {
      const body = (
        req as {
          body?: {
            certificatePem?: string;
            pkcs12Base64?: string;
            password?: string;
            format?: 'pem' | 'pkcs12';
          };
        }
      ).body;

      if (!body) {
        return validationError('Request body is required');
      }

      const userId = this.getMemberId(req);
      const smime = this.getSmimeCertManager();
      const store = this.getKeyStore();

      if (body.format === 'pkcs12' || body.pkcs12Base64) {
        if (!body.pkcs12Base64 || typeof body.pkcs12Base64 !== 'string') {
          return validationError('pkcs12Base64 is required for PKCS#12 import');
        }
        if (!body.password || typeof body.password !== 'string') {
          return validationError('password is required for PKCS#12 import');
        }

        const data = new Uint8Array(Buffer.from(body.pkcs12Base64, 'base64'));
        const bundle = await smime.importPkcs12(data, body.password);
        const entry = await store.storeSmimeCertificate(userId, bundle);

        return {
          statusCode: 201,
          response: {
            message: 'S/MIME certificate imported from PKCS#12',
            ...this.sanitizeEntry(entry),
          } as IApiMessageResponse,
        };
      }

      // PEM import
      if (!body.certificatePem || typeof body.certificatePem !== 'string') {
        return validationError('certificatePem or pkcs12Base64 is required');
      }

      const metadata = await smime.importCertificate(
        body.certificatePem,
        'pem',
      );
      const entry = await store.storeSmimeCertificate(userId, {
        certificatePem: body.certificatePem,
        metadata,
      });

      return {
        statusCode: 201,
        response: {
          message: 'S/MIME certificate imported',
          ...this.sanitizeEntry(entry),
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ── Handler: GET /smime ────────────────────────────────────────────

  private async handleGetSmimeCertificate(req: unknown): Promise<{
    statusCode: number;
    response: KeyStoreApiResponse;
  }> {
    try {
      const userId = this.getMemberId(req);
      const store = this.getKeyStore();
      const entry = await store.getSmimeCertificate(userId);
      if (!entry) {
        return notFoundError('S/MIME certificate', userId);
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          ...this.sanitizeEntry(entry),
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ── Handler: DELETE /smime ─────────────────────────────────────────

  private async handleDeleteSmimeCertificate(req: unknown): Promise<{
    statusCode: number;
    response: KeyStoreApiResponse;
  }> {
    try {
      const userId = this.getMemberId(req);
      const store = this.getKeyStore();
      await store.deleteSmimeCertificate(userId);

      return {
        statusCode: 200,
        response: {
          message: 'S/MIME certificate deleted',
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ── Handler: GET /resolve/:email ───────────────────────────────────

  private async handleResolveKeys(req: unknown): Promise<{
    statusCode: number;
    response: KeyStoreApiResponse;
  }> {
    try {
      const params = (req as { params?: { email?: string } }).params;
      if (!params?.email || typeof params.email !== 'string') {
        return validationError('email parameter is required');
      }

      const store = this.getKeyStore();
      const entries = await store.getKeysForEmail(params.email);

      const availability: IRecipientKeyAvailability = {
        email: params.email,
        hasGpgKey: entries.some(
          (e) => e.type === 'gpg_public' || e.type === 'gpg_keypair',
        ),
        hasSmimeCert: entries.some(
          (e) => e.type === 'smime_cert' || e.type === 'smime_bundle',
        ),
        hasEciesKey: false, // ECIES keys are managed separately
        isInternal: entries.length > 0,
      };

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          ...availability,
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ── Handler: PUT /preferences ───────────────────────────────────────

  private async handleSetPreference(req: unknown): Promise<{
    statusCode: number;
    response: KeyStoreApiResponse;
  }> {
    try {
      const body = (
        req as {
          body?: { scheme?: string; contactEmail?: string };
        }
      ).body;

      if (!body?.scheme || typeof body.scheme !== 'string') {
        return validationError('scheme is required');
      }

      if (!VALID_SCHEMES.has(body.scheme as MessageEncryptionScheme)) {
        return validationError(
          `Invalid encryption scheme: ${body.scheme}. Valid values: ${[...VALID_SCHEMES].join(', ')}`,
        );
      }

      const userId = this.getMemberId(req);
      const store = this.getKeyStore();
      await store.setEncryptionPreference({
        userId,
        contactEmail: body.contactEmail,
        scheme: body.scheme as MessageEncryptionScheme,
      });

      return {
        statusCode: 200,
        response: {
          message: 'Encryption preference updated',
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ── Handler: GET /preferences ──────────────────────────────────────

  private async handleGetPreference(req: unknown): Promise<{
    statusCode: number;
    response: KeyStoreApiResponse;
  }> {
    try {
      const userId = this.getMemberId(req);
      const query = (req as { query?: { contactEmail?: string } }).query;
      const contactEmail = query?.contactEmail;

      const store = this.getKeyStore();
      const pref = await store.getEncryptionPreference(userId, contactEmail);

      if (!pref) {
        return {
          statusCode: 200,
          response: {
            message: 'OK',
            preference: null,
          } as IApiMessageResponse,
        };
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          preference: pref,
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ── Utility ────────────────────────────────────────────────────────

  /**
   * Strip private material from entry before returning in API response.
   * Private keys are never returned in API responses.
   */
  private sanitizeEntry(
    entry: IKeyStoreEntry<string>,
  ): Record<string, unknown> {
    return {
      id: entry.id,
      userId: entry.userId,
      type: entry.type,
      associatedEmail: entry.associatedEmail,
      publicMaterial: entry.publicMaterial,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private extractEmailFromGpgUserId(gpgUserId: string): string {
    const match = gpgUserId.match(/<([^>]+)>/);
    return match ? match[1] : gpgUserId;
  }
}
