import { AppConstants } from '../appConstants';
import {
  SuiteCoreStringKey,
  getSuiteCoreTranslation as translate,
} from '@digitaldefiance/suite-core-lib';
import { Schema } from 'mongoose';
import { IMnemonicDocument } from '../documents/mnemonic';

/**
 * Schema for mnemonics
 */
export const MnemonicSchema: Schema = new Schema<IMnemonicDocument>({
  hmac: {
    type: String,
    required: true,
    unique: true,
    index: true, // Add an index for fast lookups
    validate: {
      validator: (v: string) => AppConstants.HmacRegex.test(v),
      message: () => translate(SuiteCoreStringKey.Validation_HmacRegex),
    },
  },
});
