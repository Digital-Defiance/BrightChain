import {
  Constants as AppConstants,
  BrightChainApiStrings,
  Environment as BrightChainEnvironment,
  BrightChainMemberInitService,
  DefaultBackendIdType,
  type IBrightChainMemberInitConfig,
} from '@brightchain/brightchain-api-lib';
import type { IBrightChainMemberInitInput } from '@brightchain/brightchain-lib';
import { IECIESConfig, MemberType } from '@digitaldefiance/ecies-lib';
import {
  CoreLanguageCode,
  GlobalActiveContext,
  IActiveContext,
} from '@digitaldefiance/i18n-lib';
import {
  ECIESService,
  GuidV4Provider,
  PlatformID,
  registerNodeRuntimeConfiguration,
} from '@digitaldefiance/node-ecies-lib';
import {
  ApplicationConcrete,
  DatabaseInitializationService,
  debugLog,
  IConstants,
  IServerInitResult,
} from '@digitaldefiance/node-express-suite';
import {
  getSuiteCoreI18nEngine,
  getSuiteCoreTranslation,
  IFailableResult,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';
import { randomBytes } from 'crypto';
import { join } from 'path';

class BrightChainInitUserDbApplication<
  TID extends PlatformID = DefaultBackendIdType,
> extends ApplicationConcrete<TID> {
  public override get environment(): BrightChainEnvironment<TID> {
    return super.environment as BrightChainEnvironment<TID>;
  }
  constructor(
    environment: BrightChainEnvironment<TID>,
    constants: IConstants = AppConstants,
  ) {
    constants.idProvider = new GuidV4Provider();
    super(environment, constants);
    registerNodeRuntimeConfiguration('guid-config', constants);
  }
}

async function main() {
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
  const eciesService = new ECIESService(config);
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

  const envDir = join(
    ApplicationConcrete.distDir,
    'brightchain-inituserdb',
    '.env',
  );
  const env: BrightChainEnvironment = new BrightChainEnvironment(envDir, true);
  const app = new BrightChainInitUserDbApplication(env, AppConstants);
  context.languageContextSpace = 'admin';
  const shouldDropDatabase = process.argv.includes('--drop');
  debugLog(
    app.environment.detailedDebug,
    'log',
    getSuiteCoreTranslation(
      SuiteCoreStringKey.Admin_TransactionsEnabledDisabledTemplate,
      {
        STATE: getSuiteCoreTranslation(
          app.environment.useTransactions
            ? SuiteCoreStringKey.Common_Enabled
            : SuiteCoreStringKey.Common_Disabled,
        ),
      },
    ),
  );
  let exitCode = 1;
  await app.start();
  if (shouldDropDatabase) {
    const result = await DatabaseInitializationService.dropDatabase(
      app.db.connection,
    );
    if (result) {
      debugLog(
        app.environment.detailedDebug,
        'log',
        getSuiteCoreTranslation(SuiteCoreStringKey.Admin_DatabaseDropped),
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      debugLog(
        app.environment.detailedDebug,
        'log',
        getSuiteCoreTranslation(
          SuiteCoreStringKey.Admin_ProceedingToDbInitialization,
        ),
      );
    } else {
      debugLog(
        app.environment.detailedDebug,
        'error',
        getSuiteCoreTranslation(
          SuiteCoreStringKey.Admin_Error_FailedToDropDatabase,
        ),
      );
      await app.stop();
      process.exit(2);
    }
  }
  debugLog(
    app.environment.detailedDebug,
    'log',
    getSuiteCoreTranslation(SuiteCoreStringKey.Admin_StartingDbInitialization),
  );
  const result: IFailableResult<IServerInitResult> =
    await DatabaseInitializationService.initUserDb(app);
  if (result.success && result.data) {
    debugLog(
      app.environment.debug,
      'log',
      getSuiteCoreTranslation(SuiteCoreStringKey.Admin_UserDatabaseInitialized),
    );
    if (app.environment.detailedDebug) {
      DatabaseInitializationService.printServerInitResults(result.data, true);
      const initHash = DatabaseInitializationService.serverInitResultHash(
        result.data,
      );
      debugLog(
        true,
        'log',
        `Database initialized with options hash: ${initHash}`,
      );
    }
    // BrightChain member init — persist system/admin/member users into BrightChainDb
    try {
      const bcEnv = app.environment as BrightChainEnvironment;
      const initConfig: IBrightChainMemberInitConfig = {
        memberPoolName: bcEnv.memberPoolName,
        blockStorePath: bcEnv.blockStorePath,
        useMemoryStore: bcEnv.useMemoryDocumentStore,
        blockSize: bcEnv.blockStoreBlockSize,
      };
      const initInput: IBrightChainMemberInitInput = {
        systemUser: {
          id: String(result.data.systemUser._id),
          type: MemberType.System,
        },
        adminUser: {
          id: String(result.data.adminUser._id),
          type: MemberType.User,
        },
        memberUser: {
          id: String(result.data.memberUser._id),
          type: MemberType.User,
        },
      };
      const brightChainMemberInitService = new BrightChainMemberInitService();
      const brightChainInitResult =
        await brightChainMemberInitService.initialize(initConfig, initInput);
      if (brightChainInitResult.alreadyInitialized) {
        debugLog(
          app.environment.debug,
          'log',
          BrightChainApiStrings.BrightChainMemberInitServiceAlreadyInitialized.replace(
            '%d',
            String(brightChainInitResult.skippedCount),
          ),
        );
      } else {
        debugLog(
          app.environment.debug,
          'log',
          BrightChainApiStrings.BrightChainMemberInitServiceInitialized.replace(
            '%d',
            String(brightChainInitResult.insertedCount),
          ).replace('%d', String(brightChainInitResult.skippedCount)),
        );
      }
    } catch (brightChainErr) {
      debugLog(
        true,
        'error',
        BrightChainApiStrings.BrightChainMemberInitServiceError,
        brightChainErr,
      );
      // MongoDB init succeeded — use exit code 3 to signal partial failure
      exitCode = 3;
    }
    if (exitCode !== 3) {
      exitCode = 0;
    }
  } else {
    const engine = getSuiteCoreI18nEngine();
    console.error(
      engine.t(
        '{{SuiteCoreStringKey.Admin_Error_FailedToInitializeUserDatabase}}:',
      ),
      result.error,
    );
    exitCode++;
  }
  await app.stop();
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
