import {
  HandleableError,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';
export class MnemonicOrPasswordRequiredError extends HandleableError {
  constructor() {
    super(translate(StringName.Validation_MnemonicOrPasswordRequired), {
      statusCode: 422,
    });
  }
}
