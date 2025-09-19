import { StringName, translate } from '@brightchain/brightchain-lib';

export class InvalidBackupCodeVersionError extends Error {
  public readonly version: string;
  constructor(version: string) {
    super(
      translate(StringName.Error_InvalidBackupCodeVersionTemplate, { version }),
    );
    this.version = version;
  }
}
