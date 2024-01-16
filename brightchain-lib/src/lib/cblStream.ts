import { Readable } from "stream";
import { ConstituentBlockListBlock } from "./blocks/cbl";
import { BaseBlock } from "./blocks/base";
import { ChecksumBuffer } from "./types";
import { StaticHelpersChecksum } from "./staticHelpers.checksum";
import { StaticHelpersTuple } from "./staticHelpers.tuple";
import { WhitenedBlock } from "./blocks/whitened";
import { BrightChainMember } from "./brightChainMember";

export class CblStream extends Readable
{
    private readonly cbl: ConstituentBlockListBlock;
    private readonly getBlock: (blockId: ChecksumBuffer) => BaseBlock;
    private currentTupleIndex: number = 0;
    private currentData: BaseBlock | null = null;
    private overallReadOffset: bigint = 0n;
    private currentDataOffset = 0;
    private readonly maxTuple: number;
    private readonly creatorForDecryption?: BrightChainMember;
    constructor(cbl: ConstituentBlockListBlock, getBlock: (blockId: ChecksumBuffer) => BaseBlock, creatorForDecryption?: BrightChainMember)
    {
        super();
        this.cbl = cbl;
        this.getBlock = getBlock;
        this.maxTuple = cbl.cblAddressCount / cbl.tupleSize;
        this.overallReadOffset = 0n;
        this.currentDataOffset = -1;
        this.creatorForDecryption = creatorForDecryption;
    }
    override _read(size: number): void {
        const bytesRemaining = this.cbl.originalDataLength - this.overallReadOffset;
        let stillToRead = (bytesRemaining > BigInt(size)) ? size : Number(bytesRemaining);
        while (stillToRead > 0) {
            // if we have no data, read some
            if (!this.currentData || this.currentDataOffset >= this.currentData.lengthBeforeEncryption) {
                this.readData();
                if (!this.currentData) {
                    // No more data available
                    break;
                }
            }
            // read up to lengthBeforeEncryption bytes from the current data
            // we have lengthBeforeEncryption - currentDataOffset bytes left in the current data
            const bytesToRead = Math.min(stillToRead, this.currentData.lengthBeforeEncryption - this.currentDataOffset);
            this.push(this.currentData.data.subarray(this.currentDataOffset, this.currentDataOffset + bytesToRead));
            this.overallReadOffset += BigInt(bytesToRead);
            this.currentDataOffset += bytesToRead;
            stillToRead -= bytesToRead;
    
            // Check if we have reached or exceeded the originalDataLength
            if (this.overallReadOffset >= this.cbl.originalDataLength) {
                this.push(null); // End the stream
                break;
            }
        }
    }
    private readData() {
        if (this.currentTupleIndex >= this.maxTuple) {
            this.push(null);
            this.currentData = null;
            this.currentDataOffset = -1;
            return;
        }
        /* the data addresses start at ConstituentBlockListBlock.CblHeaderSize and we need to read
         * cbl.tupleSize addresses (ChecksumBuffer) from the array of addresses */
        const startOffset = ConstituentBlockListBlock.CblHeaderSize + (this.cbl.tupleSize * this.currentTupleIndex);
        const blocks: BaseBlock[] = [];
        for (let i=0; i<this.cbl.tupleSize; i++) {
            const address = this.cbl.data.subarray(startOffset + (i * StaticHelpersChecksum.Sha3ChecksumBufferLength), startOffset + ((i+1) * StaticHelpersChecksum.Sha3ChecksumBufferLength)) as ChecksumBuffer;
            blocks.push(this.getBlock(address));
        }
        const primeWhitenedBlock = blocks[0] as WhitenedBlock;
        const whiteners = blocks.slice(1);
        const data = StaticHelpersTuple.xorDestPrimeWhitenedToOwned(primeWhitenedBlock, whiteners);
        if (this.creatorForDecryption) {
            this.currentData = data.decrypt(this.creatorForDecryption);
        } else {
            this.currentData = data;
        }
        this.currentTupleIndex++;
        this.currentDataOffset = 0;
    }
}