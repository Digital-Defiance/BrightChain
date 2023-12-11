import {
  SuiteCoreStringKey,
  getSuiteCoreTranslation as translate,
} from '@digitaldefiance/suite-core-lib';
import { AppConstants } from '../appConstants';
import { ModelName } from '../enumerations/model-name';

// Datastore-agnostic schema metadata for mnemonics
export const MnemonicSchema = {
  name: ModelName.Mnemonic,
  fields: {
    hmac: {
      type: 'string',
      required: true,
      unique: true,
      validate: (v: string) => AppConstants.HmacRegex.test(v),
      message: () => translate(SuiteCoreStringKey.Validation_HmacRegex),
    },
  },
  indexes: [{ fields: { hmac: 1 }, options: { unique: true } }],
};
