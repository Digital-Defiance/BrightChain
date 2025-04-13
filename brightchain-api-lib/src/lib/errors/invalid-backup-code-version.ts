import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';

export class InvalidBackupCodeVersionError extends Error {
  public readonly version: string;
  constructor(version: string) {
    super(
      getSuiteCoreTranslation(
        SuiteCoreStringKey.Error_InvalidBackupCodeVersionTemplate,
        { version },
      ),
    );
    this.version = version;
  }
}
