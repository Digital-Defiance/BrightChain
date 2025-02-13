import { BrightChainMember } from '../brightChainMember';
import { SchemaDefinition } from '../document';
import { QuorumDocument } from '../documents/quorumDocument';
import { GuidV4 } from '../guid';
import { SerializableBuffer } from '../serializableBuffer';

export const QuorumDocumentSchema: SchemaDefinition<QuorumDocument> = {
  checksum: {
    type: Object,
    required: true,
    serialize: (value: SerializableBuffer) => value.serialize(),
    hydrate: (value: string) => SerializableBuffer.hydrate(value),
  },
  creator: {
    type: Object,
    required: true,
    serialize: (value: BrightChainMember) => value.toJson(),
    hydrate: (value: string) => BrightChainMember.fromJson(value),
  },
  signature: {
    type: Object,
    required: true,
    serialize: (value: SerializableBuffer) => value.serialize(),
    hydrate: (value: string) => SerializableBuffer.hydrate(value),
  },
  memberIDs: {
    type: Array,
    required: true,
    serialize: (value: GuidV4[]) => value.map((v) => v.serialize()),
    hydrate: (value: string[]) => value.map((v) => GuidV4.hydrate(v)),
  },
  sharesRequired: { type: Number, required: true },
  dateCreated: { type: Date, required: true },
  dateUpdated: { type: Date, required: true },
};
