import {
  AppConstants,
  BrightChainApiStrings,
  Constants as BrightChainConstants,
  Environment as BrightChainEnvironment,
  BrightChainMemberInitService,
  configureBrightChainApp,
  DefaultBackendIdType,
  type IBrightChainMemberInitConfig,
} from '@brightchain/brightchain-api-lib';
import type {
  IBrightChainRbacInitInput,
  IBrightChainUserCredentials,
  IBrightChainUserInitEntry,
  IPasswordWrappedPrivateKey,
} from '@brightchain/brightchain-lib';
import { initializeBrightChain } from '@brightchain/brightchain-lib';
import {
  EmailString,
  IECIESConfig,
  MemberType,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import {
  CoreLanguageCode,
  GlobalActiveContext,
  IActiveContext,
} from '@digitaldefiance/i18n-lib';
import {
  ECIESService,
  GuidV4Buffer,
  GuidV4Provider,
  Member,
  registerNodeRuntimeConfiguration,
} from '@digitaldefiance/node-ecies-lib';
import {
  BackupCode,
  BaseApplication,
  createNoOpDatabase,
  debugLog,
  IConstants,
  KeyWrappingService,
} from '@digitaldefiance/node-express-suite';
import {
  getSuiteCoreI18nEngine,
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { createHmac, randomBytes } from 'crypto';
import { appendFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Append a key=value pair to the .env file if the key is not already present.
 */
function appendEnvVar(envFilePath: string, key: string, value: string): void {
  if (!existsSync(envFilePath)) return;
  const contents = readFileSync(envFilePath, 'utf-8');
  if (contents.includes(`${key}=`)) return;
  appendFileSync(envFilePath, `\n${key}="${value}"\n`);
}

async function main() {
  // Initialize BrightChain library (ServiceProvider, ConstantsRegistry, etc.)
  // Must happen before any block store or member operations.
  initializeBrightChain();

  const context = GlobalActiveContext.getInstance<
    CoreLanguageCode,
    IActiveContext<CoreLanguageCode>
  >();
  context.languageContextSpace = 'admin';

  const config: IECIESConfig = {
    curveName: AppConstants.ECIES.CURVE_NAME,
    primaryKeyDerivationPath: AppConstants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
    mnemonicStrength: AppConstants.ECIES.MNEMONIC_STRENGTH,
    symmetricAlgorithm: AppConstants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
    symmetricKeyBits: AppConstants.ECIES.SYMMETRIC.KEY_BITS,
    symmetricKeyMode: AppConstants.ECIES.SYMMETRIC.MODE,
  };
  const eciesService = new ECIESService<DefaultBackendIdType>(config);
  if (process.argv.includes('--gen-system-user-mnemonic')) {
    const mnemonic = eciesService.generateNewMnemonic();
    process.env.ADMIN_MNEMONIC = mnemonic.value ?? undefined;
    console.log(
      `ADMIN_MNEMONIC="${mnemonic.value}"\n`,
      getSuiteCoreTranslation(SuiteCoreStringKey.Admin_MakeSureToSetItInEnv),
    );
  }
  if (process.argv.includes('--gen-member-user-mnemonic')) {
    const mnemonic = eciesService.generateNewMnemonic();
    process.env.MEMBER_MNEMONIC = mnemonic.value ?? undefined;
    console.log(
      `MEMBER_MNEMONIC="${mnemonic.value}"\n`,
      getSuiteCoreTranslation(SuiteCoreStringKey.Admin_MakeSureToSetItInEnv),
    );
  }
  if (process.argv.includes('--gen-mnemonic-hmac-secret')) {
    const mnemonicHmacSecret = randomBytes(32).toString('hex');
    process.env.MNEMONIC_HMAC_SECRET = mnemonicHmacSecret;
    console.log(
      `MNEMONIC_HMAC_SECRET="${mnemonicHmacSecret}"\n`,
      getSuiteCoreTranslation(SuiteCoreStringKey.Admin_MakeSureToSetItInEnv),
    );
  }
  if (process.argv.includes('--gen-mnemonic-encryption-key')) {
    const mnemonicEncryptionKey = randomBytes(32).toString('hex');
    process.env.MNEMONIC_ENCRYPTION_KEY = mnemonicEncryptionKey;
    console.log(
      `MNEMONIC_ENCRYPTION_KEY="${mnemonicEncryptionKey}"\n`,
      getSuiteCoreTranslation(SuiteCoreStringKey.Admin_MakeSureToSetItInEnv),
    );
  }

  // Auto-generate MNEMONIC_HMAC_SECRET if not already in the environment.
  // The Environment constructor validates this as a 64-char hex string,
  // so it must exist before construction.
  if (!process.env.MNEMONIC_HMAC_SECRET) {
    process.env.MNEMONIC_HMAC_SECRET = randomBytes(32).toString('hex');
  }
  // Auto-generate MNEMONIC_ENCRYPTION_KEY if not already in the environment.
  if (!process.env.MNEMONIC_ENCRYPTION_KEY) {
    process.env.MNEMONIC_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  }

  const envFilePath = join(
    BaseApplication.distDir,
    'brightchain-inituserdb',
    '.env',
  );

  // Configure GuidV4Provider on BrightChainConstants BEFORE constructing
  // Environment so the upstream BaseEnvironment constructor uses the correct
  // idProvider when parsing/generating SYSTEM_ID, ADMIN_ID, MEMBER_ID.
  const guidProvider = new GuidV4Provider();
  const constants = BrightChainConstants as IConstants;
  constants.idProvider = guidProvider;
  constants.MEMBER_ID_LENGTH = guidProvider.byteLength;
  constants.ECIES = {
    ...constants.ECIES,
    MULTIPLE: {
      ...constants.ECIES.MULTIPLE,
      RECIPIENT_ID_SIZE: guidProvider.byteLength,
    },
  };
  if ('ENCRYPTION' in constants && constants.ENCRYPTION) {
    constants.ENCRYPTION = {
      ...constants.ENCRYPTION,
      RECIPIENT_ID_SIZE: guidProvider.byteLength,
    };
  }
  registerNodeRuntimeConfiguration('guid-config', constants);

  // Now the Environment will use the GuidV4Provider to parse/generate IDs
  const env: BrightChainEnvironment = new BrightChainEnvironment(
    envFilePath,
    true,
    true,
    constants,
  );

  // Create a lightweight BaseApplication — no Express server needed for CLI tool.
  // BaseApplication handles plugin lifecycle (connect, initAll, stop) without
  // starting an HTTP server.
  const app = new BaseApplication<DefaultBackendIdType, unknown, IConstants>(
    env,
    createNoOpDatabase(),
    AppConstants,
  );

  // Shared setup: registers the database plugin and syncs AppConstants.
  // The GuidV4Provider is already configured on BrightChainConstants above.
  const { plugin } = configureBrightChainApp(app, env);

  // Cast to BrightChainEnvironment for access to BrightChain-specific properties
  const bcEnv = app.environment as BrightChainEnvironment;

  context.languageContextSpace = 'admin';
  const shouldDropDatabase = process.argv.includes('--drop');
  debugLog(
    bcEnv.detailedDebug,
    'log',
    getSuiteCoreTranslation(
      SuiteCoreStringKey.Admin_TransactionsEnabledDisabledTemplate,
      {
        STATE: getSuiteCoreTranslation(
          bcEnv.useTransactions
            ? SuiteCoreStringKey.Common_Enabled
            : SuiteCoreStringKey.Common_Disabled,
        ),
      },
    ),
  );
  let exitCode = 1;

  // Manually drive the plugin lifecycle for the CLI tool:
  // 1. Connect the database plugin (initializes BrightChainDb, stores)
  await plugin.connect();
  // 2. Initialize all plugins (creates auth provider, etc.)
  await app.plugins.initAll(app);

  if (shouldDropDatabase) {
    try {
      await plugin.brightChainDb.dropDatabase();
      debugLog(
        bcEnv.detailedDebug,
        'log',
        getSuiteCoreTranslation(SuiteCoreStringKey.Admin_DatabaseDropped),
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      debugLog(
        bcEnv.detailedDebug,
        'log',
        getSuiteCoreTranslation(
          SuiteCoreStringKey.Admin_ProceedingToDbInitialization,
        ),
      );
    } catch {
      debugLog(
        bcEnv.detailedDebug,
        'error',
        getSuiteCoreTranslation(
          SuiteCoreStringKey.Admin_Error_FailedToDropDatabase,
        ),
      );
      await app.plugins.stopAll();
      process.exit(2);
    }
  }
  debugLog(
    bcEnv.detailedDebug,
    'log',
    getSuiteCoreTranslation(SuiteCoreStringKey.Admin_StartingDbInitialization),
  );

  // The Environment now has valid GUIDs for all three IDs (parsed from .env
  // or freshly generated) because we configured GuidV4Provider before construction.
  // BaseEnvironment always generates an ID when the env var is missing, so these
  // are guaranteed to be set — but the type signature is TID | undefined.
  if (!bcEnv.systemId || !bcEnv.adminId || !bcEnv.memberId) {
    throw new Error(
      'Environment failed to initialise one or more user IDs (system/admin/member). ' +
        'Check that the GuidV4Provider is configured correctly on the constants object.',
    );
  }
  // Full hex with dashes for logging and .env persistence
  const systemIdFull = guidProvider.idToString(bcEnv.systemId);
  const adminIdFull = guidProvider.idToString(bcEnv.adminId);
  const memberIdFull = guidProvider.idToString(bcEnv.memberId);
  // Short hex (32 chars, no dashes) for the member index schema
  const systemId = bcEnv.systemId.asShortHexGuid;
  const adminId = bcEnv.adminId.asShortHexGuid;
  const memberId = bcEnv.memberId.asShortHexGuid;

  // Persist any newly generated IDs back to .env so subsequent runs reuse them
  appendEnvVar(envFilePath, 'SYSTEM_ID', systemIdFull);
  appendEnvVar(envFilePath, 'ADMIN_ID', adminIdFull);
  appendEnvVar(envFilePath, 'MEMBER_ID', memberIdFull);

  // Role IDs and user-role IDs: use existing values from .env or generate new ones.
  // BrightChain doesn't have Mongoose role documents, but we generate these for
  // parity with the Mongoose init flow and .env template.
  const generateGuidId = (): GuidV4Buffer =>
    guidProvider.fromBytes(guidProvider.generate());

  const systemRoleId: GuidV4Buffer = bcEnv.systemRoleId ?? generateGuidId();
  const systemUserRoleId: GuidV4Buffer =
    bcEnv.systemUserRoleId ?? generateGuidId();
  const adminRoleId: GuidV4Buffer = bcEnv.adminRoleId ?? generateGuidId();
  const adminUserRoleId: GuidV4Buffer =
    bcEnv.adminUserRoleId ?? generateGuidId();
  const memberRoleId: GuidV4Buffer = bcEnv.memberRoleId ?? generateGuidId();
  const memberUserRoleId: GuidV4Buffer =
    bcEnv.memberUserRoleId ?? generateGuidId();

  appendEnvVar(
    envFilePath,
    'SYSTEM_ROLE_ID',
    guidProvider.idToString(systemRoleId),
  );
  appendEnvVar(
    envFilePath,
    'SYSTEM_USER_ROLE_ID',
    guidProvider.idToString(systemUserRoleId),
  );
  appendEnvVar(
    envFilePath,
    'ADMIN_ROLE_ID',
    guidProvider.idToString(adminRoleId),
  );
  appendEnvVar(
    envFilePath,
    'ADMIN_USER_ROLE_ID',
    guidProvider.idToString(adminUserRoleId),
  );
  appendEnvVar(
    envFilePath,
    'MEMBER_ROLE_ID',
    guidProvider.idToString(memberRoleId),
  );
  appendEnvVar(
    envFilePath,
    'MEMBER_USER_ROLE_ID',
    guidProvider.idToString(memberUserRoleId),
  );

  debugLog(
    bcEnv.detailedDebug,
    'log',
    `User IDs — system: ${systemId}, admin: ${adminId}, member: ${memberId}`,
  );

  // BrightChain member init — persist system/admin/member users into BrightChainDb
  // with full RBAC documents (roles, users, user-roles, mnemonics)
  try {
    const initConfig: IBrightChainMemberInitConfig = {
      memberPoolName: bcEnv.memberPoolName,
      blockStorePath: bcEnv.blockStorePath,
      useMemoryStore: bcEnv.useMemoryDocumentStore,
      blockSize: bcEnv.blockStoreBlockSize,
    };

    // ── Create ECIES members from mnemonics to get key pairs ──────────
    const keyWrappingService = new KeyWrappingService();

    // HMAC secret for mnemonic uniqueness checks
    const hmacSecretHex =
      bcEnv.get('MNEMONIC_HMAC_SECRET') ?? randomBytes(32).toString('hex');
    appendEnvVar(envFilePath, 'MNEMONIC_HMAC_SECRET', hmacSecretHex);
    const hmacSecretBuf = Buffer.from(hmacSecretHex, 'hex');

    // Persist encryption key so subsequent runs reuse the same value
    const encryptionKeyHex =
      bcEnv.get('MNEMONIC_ENCRYPTION_KEY') ?? randomBytes(32).toString('hex');
    appendEnvVar(envFilePath, 'MNEMONIC_ENCRYPTION_KEY', encryptionKeyHex);

    /**
     * Build a full IBrightChainUserInitEntry for a single user.
     * Creates the ECIES member, wraps the private key, encrypts the mnemonic,
     * generates backup codes, and computes the mnemonic HMAC.
     */
    function buildUserInitEntry(
      shortId: GuidV4Buffer,
      fullId: GuidV4Buffer,
      memberType: MemberType,
      username: string,
      email: string,
      mnemonic: SecureString | undefined,
      password: SecureString | undefined,
      roleId: GuidV4Buffer,
      userRoleId: GuidV4Buffer,
      roleName: string,
      roleAdmin: boolean,
      roleMember: boolean,
      roleSystem: boolean,
      systemMember: Member<DefaultBackendIdType> | undefined,
    ): {
      entry: IBrightChainUserInitEntry<GuidV4Buffer>;
      creds: IBrightChainUserCredentials<GuidV4Buffer>;
      member: Member<DefaultBackendIdType>;
      encryptingMember: Member<DefaultBackendIdType>;
    } {
      // Create ECIES member from mnemonic
      const { member, mnemonic: resolvedMnemonic } =
        Member.newMember<DefaultBackendIdType>(
          eciesService,
          memberType,
          username,
          new EmailString(email),
          mnemonic,
        );

      // Generate password if not provided
      const resolvedPassword =
        password ??
        new SecureString(
          Array.from(randomBytes(16))
            .map((b) => String.fromCharCode(33 + (b % 94)))
            .join(''),
        );

      // Wrap private key with password
      let wrappedKey: IPasswordWrappedPrivateKey | undefined;
      if (member.privateKey) {
        const wrapped = keyWrappingService.wrapSecret(
          member.privateKey,
          resolvedPassword,
          constants,
        );
        wrappedKey = {
          salt: wrapped.salt,
          iv: wrapped.iv,
          authTag: wrapped.authTag,
          ciphertext: wrapped.ciphertext,
          iterations: wrapped.iterations,
        };
      }

      // Encrypt mnemonic for recovery using the member's public key
      const mnemonicRecovery = member
        .encryptData(Buffer.from(resolvedMnemonic.value ?? '', 'utf-8'))
        .toString('hex');

      // Compute mnemonic HMAC for uniqueness checks
      const mnemonicHmac = createHmac('sha256', hmacSecretBuf)
        .update(Buffer.from(resolvedMnemonic.value ?? '', 'utf-8'))
        .digest('hex');

      // Generate mnemonic document ID
      const mnemonicDocId = generateGuidId();

      // Generate and encrypt backup codes
      const rawBackupCodes = BackupCode.generateBackupCodes(constants);
      // BackupCode.encryptBackupCodes is async — we'll handle this outside
      // For now, build the entry with empty backup codes; we'll fill them in after await
      const publicKeyHex = member.publicKey.toString('hex');

      const entry: IBrightChainUserInitEntry<GuidV4Buffer> = {
        id: shortId,
        type: memberType,
        fullId,
        username,
        email,
        publicKeyHex,
        passwordWrappedPrivateKey: wrappedKey,
        mnemonicRecovery,
        mnemonicHmac,
        backupCodes: [], // filled in after async encryption
        roleId,
        userRoleId,
        mnemonicDocId,
        roleName,
        roleAdmin,
        roleMember,
        roleSystem,
        plaintextMnemonic: resolvedMnemonic.value ?? '',
        plaintextPassword: resolvedPassword.value ?? '',
        plaintextBackupCodes: [], // filled in after async backup code generation
      };

      const creds: IBrightChainUserCredentials<GuidV4Buffer> = {
        id: shortId,
        fullId,
        type: memberType,
        username,
        email,
        mnemonic: resolvedMnemonic.value ?? '(not set)',
        password: resolvedPassword.value ?? '(not set)',
        backupCodes: rawBackupCodes.map((c) => c.value ?? ''),
        publicKeyHex,
        roleId,
        userRoleId,
      };

      return { entry, creds, member, encryptingMember: systemMember ?? member };
    }

    // Build system user first (needed as createdBy for others)
    const systemResult = buildUserInitEntry(
      bcEnv.systemId,
      bcEnv.systemId,
      MemberType.System,
      bcEnv.get('SYSTEM_USERNAME') ?? 'system',
      bcEnv.get('SYSTEM_EMAIL') ?? bcEnv.emailSender,
      bcEnv.systemMnemonic,
      bcEnv.systemPassword,
      systemRoleId,
      systemUserRoleId,
      'System',
      true,
      true,
      true,
      undefined,
    );

    // Build admin and member users (system member encrypts their backup codes)
    const adminResult = buildUserInitEntry(
      bcEnv.adminId,
      bcEnv.adminId,
      MemberType.User,
      bcEnv.get('ADMIN_USERNAME') ?? 'admin',
      bcEnv.get('ADMIN_EMAIL') ?? bcEnv.emailSender,
      bcEnv.adminMnemonic,
      bcEnv.adminPassword,
      adminRoleId,
      adminUserRoleId,
      'Admin',
      true,
      true,
      false,
      systemResult.member,
    );

    const memberResult = buildUserInitEntry(
      bcEnv.memberId,
      bcEnv.memberId,
      MemberType.User,
      bcEnv.get('MEMBER_USERNAME') ?? 'member',
      bcEnv.get('MEMBER_EMAIL') ?? bcEnv.emailSender,
      bcEnv.memberMnemonic,
      bcEnv.memberPassword,
      memberRoleId,
      memberUserRoleId,
      'Member',
      false,
      true,
      false,
      systemResult.member,
    );

    // Generate and encrypt backup codes (async operation)
    const generateBackupCodes = (): BackupCode[] =>
      Array.from(
        { length: constants.BACKUP_CODES.Count },
        () => new BackupCode(BackupCode.generateBackupCode()),
      );
    const systemBackupCodes = generateBackupCodes();
    const adminBackupCodes = generateBackupCodes();
    const memberBackupCodes = generateBackupCodes();

    const [encSystemCodes, encAdminCodes, encMemberCodes] = await Promise.all([
      BackupCode.encryptBackupCodes(
        systemResult.member,
        systemResult.encryptingMember,
        systemBackupCodes,
      ),
      BackupCode.encryptBackupCodes(
        adminResult.member,
        adminResult.encryptingMember,
        adminBackupCodes,
      ),
      BackupCode.encryptBackupCodes(
        memberResult.member,
        memberResult.encryptingMember,
        memberBackupCodes,
      ),
    ]);

    // Fill in encrypted backup codes on the entries
    systemResult.entry.backupCodes = encSystemCodes;
    adminResult.entry.backupCodes = encAdminCodes;
    memberResult.entry.backupCodes = encMemberCodes;

    // Fill in plaintext backup codes on the entries so initializeWithRbac() can wire them through
    systemResult.entry.plaintextBackupCodes = systemBackupCodes.map(
      (c) => c.value ?? '',
    );
    adminResult.entry.plaintextBackupCodes = adminBackupCodes.map(
      (c) => c.value ?? '',
    );
    memberResult.entry.plaintextBackupCodes = memberBackupCodes.map(
      (c) => c.value ?? '',
    );

    // Update credential backup codes with the raw (unencrypted) values for display
    systemResult.creds.backupCodes = systemBackupCodes.map(
      (c) => c.value ?? '',
    );
    adminResult.creds.backupCodes = adminBackupCodes.map((c) => c.value ?? '');
    memberResult.creds.backupCodes = memberBackupCodes.map(
      (c) => c.value ?? '',
    );

    // Build the full RBAC init input
    const rbacInput: IBrightChainRbacInitInput<GuidV4Buffer> = {
      systemUser: systemResult.entry,
      adminUser: adminResult.entry,
      memberUser: memberResult.entry,
    };

    const brightChainMemberInitService = new BrightChainMemberInitService();
    const brightChainInitResult =
      await brightChainMemberInitService.initializeWithRbac(
        initConfig,
        rbacInput,
      );

    if (brightChainInitResult.alreadyInitialized) {
      debugLog(
        bcEnv.debug,
        'log',
        BrightChainApiStrings.BrightChainMemberInitServiceAlreadyInitialized.replace(
          '%d',
          String(brightChainInitResult.skippedCount),
        ),
      );
    } else {
      debugLog(
        bcEnv.debug,
        'log',
        BrightChainApiStrings.BrightChainMemberInitServiceInitialized.replace(
          '%d',
          String(brightChainInitResult.insertedCount),
        ).replace('%d', String(brightChainInitResult.skippedCount)),
      );
    }

    // Build the full server init result
    const serverInitResult = BrightChainMemberInitService.buildServerInitResult(
      brightChainInitResult,
      {
        system: systemResult.creds,
        admin: adminResult.creds,
        member: memberResult.creds,
      },
    );

    // Print formatted credential results
    BrightChainMemberInitService.printServerInitResults(
      serverInitResult,
      initConfig,
    );

    // Print .env format for convenience
    debugLog(bcEnv.debug, 'log', '=== .env format ===');
    debugLog(
      bcEnv.debug,
      'log',
      BrightChainMemberInitService.formatDotEnv({
        system: systemResult.creds,
        admin: adminResult.creds,
        member: memberResult.creds,
      }),
    );
    debugLog(bcEnv.debug, 'log', '=== End .env format ===');

    // Dispose ECIES members to clean up secure memory
    systemResult.member.dispose();
    adminResult.member.dispose();
    memberResult.member.dispose();

    exitCode = 0;
  } catch (brightChainErr) {
    debugLog(
      true,
      'error',
      BrightChainApiStrings.BrightChainMemberInitServiceError,
      brightChainErr,
    );
    // Use exit code 3 to signal BrightChain member init failure
    exitCode = 3;
  }
  await app.plugins.stopAll();
  process.exit(exitCode);
}

main().catch((err) => {
  const engine = getSuiteCoreI18nEngine();
  console.error(
    engine.t('{{SuiteCoreStringKey.Admin_Error_UnhandledErrorInMain}}:'),
    err,
  );
  process.exit(1);
});
