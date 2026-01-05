import { model } from 'mongoose';
import { IMnemonicDocument } from '../documents/mnemonic';
import { ModelName } from '../enumerations/model-name';
import { MnemonicSchema } from '../schemas/mnemonic';

const MnemonicModel = model<IMnemonicDocument>(
  ModelName.Mnemonic,
  MnemonicSchema,
);
export default MnemonicModel;
