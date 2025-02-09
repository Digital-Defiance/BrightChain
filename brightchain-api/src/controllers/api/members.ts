import {
  BlockDataType,
  BlockSize,
  BlockType,
  BrightChainMember,
  ChecksumBuffer,
  ConstituentBlockListBlock,
  DiskBlockAsyncStore,
  EmailString,
  GuidV4,
  MemberApiRequest,
  MembersHandlers,
  RawDataBlock,
  RouteConfig,
  StaticHelpersVoting,
  StringNames,
  translate,
} from '@BrightChain/brightchain-lib';
import { CblBlockMetadata } from 'brightchain-lib/src/lib/cblBlockMetadata';
import { IApplication } from '../../interfaces/application';
import { MembersResponse } from '../../interfaces/membersResponse';
import { BaseController } from '../base';

export class MembersController extends BaseController<
  MembersResponse,
  MembersHandlers
> {
  public blockStore: DiskBlockAsyncStore;
  private memberBlockMap: Map<string, string>; // Maps member IDs to their latest block IDs

  constructor(application: IApplication) {
    super(application);
    // Initialize block store with configured path and block size
    this.blockStore = new DiskBlockAsyncStore(
      process.env.BLOCK_STORE_PATH || './blocks',
      BlockSize.Medium,
    );
    this.memberBlockMap = new Map();
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      {
        method: 'post',
        path: '/',
        handlerKey: 'createMember',
        useAuthentication: false,
      },
      {
        method: 'get',
        path: '/:memberId',
        handlerKey: 'getMember',
        useAuthentication: false,
      },
      {
        method: 'post',
        path: '/:memberId/reconstitute',
        handlerKey: 'reconstituteMember',
        useAuthentication: false,
      },
    ] as RouteConfig<MembersResponse, MembersHandlers>[];

    this.handlers = {
      createMember: this.handleCreateMember.bind(this),
      getMember: this.handleGetMember.bind(this),
      reconstituteMember: this.handleReconstituteMember.bind(this),
    };
  }

  private async handleCreateMember(req: MemberApiRequest): Promise<{
    statusCode: number;
    response: MembersResponse;
  }> {
    const { name, email, memberType, passphrase } = req.body;

    if (!name || !email || memberType === undefined) {
      throw new Error(translate(StringNames.Error_ValidationError));
    }

    // Create new member with generated keys
    const { member, mnemonic } = BrightChainMember.newMember(
      memberType,
      name,
      new EmailString(email),
    );

    // Store member data in a CBL block
    const memberData = member.toJson();
    const dataBuffer = Buffer.from(memberData);
    const cblBlock = new ConstituentBlockListBlock(
      member.id, // Use member ID as creator
      new CblBlockMetadata(
        this.blockStore.blockSize,
        BlockType.ConstituentBlockList,
        BlockDataType.EphemeralStructuredData,
        dataBuffer.length,
      ),
      BigInt(dataBuffer.length),
      [], // No addresses yet since this is a new block
      new Date(),
    );

    // Store as raw block
    const rawBlock = new RawDataBlock(
      this.blockStore.blockSize,
      cblBlock.data,
      new Date(),
      cblBlock.idChecksum,
      true, // canRead
      true, // canPersist
    );

    // Store block and update member mapping
    this.blockStore.setData(rawBlock);
    const blockId = rawBlock.idChecksum.toString('hex');
    this.memberBlockMap.set(member.id.toString(), blockId);

    // If passphrase provided, store it securely for key reconstitution
    if (passphrase) {
      // TODO: Store passphrase securely, perhaps encrypted with member's public key
    }

    return {
      statusCode: 200,
      response: {
        success: true,
        memberId: member.id.toString(),
        blockId,
        publicKey: member.publicKey.toString('hex'),
        votingPublicKey: StaticHelpersVoting.votingPublicKeyToBuffer(
          member.votingPublicKey,
        ).toString('hex'),
        message: 'Member created successfully',
      },
    };
  }

  public async getMember(memberId: string): Promise<{
    statusCode: number;
    response: MembersResponse;
  }> {
    return this.handleGetMember({
      params: { memberId },
    } as MemberApiRequest);
  }

  public async handleGetMember(req: MemberApiRequest): Promise<{
    statusCode: number;
    response: MembersResponse;
  }> {
    const { memberId } = req.params;

    if (!memberId) {
      throw new Error(translate(StringNames.Error_ValidationError));
    }

    // Get latest block ID for member
    const blockId = this.memberBlockMap.get(memberId);
    if (!blockId) {
      throw new Error(translate(StringNames.Error_UserNotFound));
    }

    // Get member data from block store
    const checksumBuffer = Buffer.from(blockId, 'hex') as ChecksumBuffer;
    const block = this.blockStore.getData(checksumBuffer);

    // Parse member data
    const memberData = block.data.toString();
    const memberJson = JSON.parse(memberData);

    // Create member instance
    const member = new BrightChainMember(
      memberJson.type,
      memberJson.name,
      new EmailString(memberJson.contactEmail),
      Buffer.from(memberJson.publicKey, 'hex'),
      memberJson.votingPublicKey,
      undefined, // privateKey
      undefined, // wallet
      memberJson.id ? new GuidV4(memberJson.id) : undefined,
      memberJson.dateCreated ? new Date(memberJson.dateCreated) : undefined,
      memberJson.dateUpdated ? new Date(memberJson.dateUpdated) : undefined,
      memberJson.createdBy ? new GuidV4(memberJson.createdBy) : undefined,
    );

    return {
      statusCode: 200,
      response: {
        success: true,
        memberId: member.id.toString(),
        blockId,
        publicKey: member.publicKey.toString('hex'),
        votingPublicKey: StaticHelpersVoting.votingPublicKeyToBuffer(
          member.votingPublicKey,
        ).toString('hex'),
        type: memberJson.type,
        name: memberJson.name,
        email: memberJson.contactEmail,
        message: 'Member retrieved successfully',
      },
    };
  }

  private async handleReconstituteMember(req: MemberApiRequest): Promise<{
    statusCode: number;
    response: MembersResponse;
  }> {
    const { memberId } = req.params;
    const { passphrase } = req.query;

    if (!memberId || !passphrase) {
      throw new Error(translate(StringNames.Error_ValidationError));
    }

    // Get member data first
    const blockId = this.memberBlockMap.get(memberId);
    if (!blockId) {
      throw new Error(translate(StringNames.Error_UserNotFound));
    }

    // Get member from block store
    const checksumBuffer = Buffer.from(blockId, 'hex') as ChecksumBuffer;
    const block = this.blockStore.getData(checksumBuffer);
    const memberData = block.data.toString();
    const memberJson = JSON.parse(memberData);
    const member = new BrightChainMember(
      memberJson.type,
      memberJson.name,
      new EmailString(memberJson.contactEmail),
      Buffer.from(memberJson.publicKey, 'hex'),
      memberJson.votingPublicKey,
      undefined, // privateKey
      undefined, // wallet
      memberJson.id ? new GuidV4(memberJson.id) : undefined,
      memberJson.dateCreated ? new Date(memberJson.dateCreated) : undefined,
      memberJson.dateUpdated ? new Date(memberJson.dateUpdated) : undefined,
      memberJson.createdBy ? new GuidV4(memberJson.createdBy) : undefined,
    );

    // Load wallet using passphrase
    member.loadWallet(passphrase);
    member.deriveVotingKeyPair();

    return {
      statusCode: 200,
      response: {
        success: true,
        memberId: member.id.toString(),
        message: 'Member keys reconstituted successfully',
      },
    };
  }
}
