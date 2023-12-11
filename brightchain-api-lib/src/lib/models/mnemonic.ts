import { ModelName } from '../enumerations/model-name';
import { MnemonicSchema } from '../schemas/mnemonic';

// Datastore-agnostic placeholder model descriptor
const MnemonicModel = {
  modelName: ModelName.Mnemonic,
  schema: MnemonicSchema,
} as const;
export default MnemonicModel;
