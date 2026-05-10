import type { Collection } from '@brightchain/db';
import type {
  IBurnbagStorageContract,
  IBurnbagStorageContractRepository,
} from '@brightchain/digitalburnbag-lib';

/** Bigint fields that must be serialized as strings in the JSON store. */
const BIGINT_FIELDS = [
  'bytes',
  'upfrontMicroJoules',
  'dailyMicroJoules',
  'remainingCreditMicroJoules',
  'survivalFundMicroJoules',
] as const;

/** Shape of a document stored in the `burnbag_storage_contracts` collection. */
type IStorageContractDoc = Omit<
  IBurnbagStorageContract,
  | '_id'
  | 'bytes'
  | 'upfrontMicroJoules'
  | 'dailyMicroJoules'
  | 'remainingCreditMicroJoules'
  | 'survivalFundMicroJoules'
> & {
  _id: string;
  bytes: string;
  upfrontMicroJoules: string;
  dailyMicroJoules: string;
  remainingCreditMicroJoules: string;
  survivalFundMicroJoules: string;
};

function toDoc(contract: IBurnbagStorageContract): Record<string, unknown> {
  const { contractId, ...rest } = contract;
  const doc: Record<string, unknown> = { _id: contractId };
  for (const [key, value] of Object.entries(rest)) {
    if ((BIGINT_FIELDS as readonly string[]).includes(key)) {
      doc[key] = String(value as bigint);
    } else {
      doc[key] = value;
    }
  }
  return doc;
}

function fromDoc(doc: Record<string, unknown>): IBurnbagStorageContract {
  const { _id, ...rest } = doc;
  const contract: Record<string, unknown> = { contractId: _id as string };
  for (const [key, value] of Object.entries(rest)) {
    if ((BIGINT_FIELDS as readonly string[]).includes(key)) {
      contract[key] = BigInt(value as string);
    } else {
      contract[key] = value;
    }
  }
  return contract as unknown as IBurnbagStorageContract;
}

export class BrightDBStorageContractRepository
  implements IBurnbagStorageContractRepository
{
  constructor(private readonly contracts: Collection) {}

  async create(contract: IBurnbagStorageContract): Promise<void> {
    await this.contracts.insertOne(toDoc(contract));
  }

  async findByContractId(
    contractId: string,
  ): Promise<IBurnbagStorageContract | null> {
    const doc = await this.contracts.findOne({ _id: contractId });
    if (!doc) return null;
    return fromDoc(doc as Record<string, unknown>);
  }

  async findByFileId(fileId: string): Promise<IBurnbagStorageContract | null> {
    const doc = await this.contracts.findOne({ fileId } as Record<
      string,
      unknown
    >);
    if (!doc) return null;
    return fromDoc(doc as Record<string, unknown>);
  }

  async findByOwner(
    ownerId: string,
    status?: IBurnbagStorageContract['status'],
  ): Promise<IBurnbagStorageContract[]> {
    const filter: Record<string, unknown> = { ownerId };
    if (status !== undefined) {
      filter['status'] = status;
    }
    const docs = await this.contracts.find(filter).toArray();
    return docs.map((d) => fromDoc(d as Record<string, unknown>));
  }

  async updateContract(
    contractId: string,
    updates: Partial<IBurnbagStorageContract>,
  ): Promise<void> {
    const setFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if ((BIGINT_FIELDS as readonly string[]).includes(key)) {
        setFields[key] = String(value as bigint);
      } else {
        setFields[key] = value;
      }
    }
    await this.contracts.updateOne(
      { _id: contractId } as Record<string, unknown>,
      { $set: setFields },
    );
  }

  async findDueForSettlement(cutoff: Date): Promise<IBurnbagStorageContract[]> {
    const docs = await this.contracts
      .find({
        status: 'active',
        lastSettledAt: { $lt: cutoff },
      } as Record<string, unknown>)
      .toArray();
    return docs.map((d) => fromDoc(d as Record<string, unknown>));
  }

  async findActiveExpiredBefore(
    cutoff: Date,
  ): Promise<IBurnbagStorageContract[]> {
    const docs = await this.contracts
      .find({
        status: 'active',
        autoRenew: false,
        expiresAt: { $lt: cutoff },
      } as Record<string, unknown>)
      .toArray();
    return docs.map((d) => fromDoc(d as Record<string, unknown>));
  }

  async expireByFileId(fileId: string): Promise<void> {
    await this.contracts.updateOne({ fileId } as Record<string, unknown>, {
      $set: { status: 'expired' },
    });
  }
}
