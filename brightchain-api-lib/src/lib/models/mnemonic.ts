import { model } from 'mongoose';
import { MnemonicSchema } from '../schemas/mnemonic';
import { IMnemonicDocument } from '../documents/mnemonic';
import { ModelName } from '../enumerations/model-name';

const MnemonicModel = model<IMnemonicDocument>(ModelName.Mnemonic, MnemonicSchema);
export default MnemonicModel;
