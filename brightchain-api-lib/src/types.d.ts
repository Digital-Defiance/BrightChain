// In: brightchain-api-lib/src/types.d.ts
declare module '@digitaldefiance/reed-solomon-erasure.wasm' {
  export class ReedSolomonErasure {
    static fromCurrentDirectory(): Promise<ReedSolomonErasure>;
    encode(data: Uint8Array, dataShards: number, parityShards: number): void;
    reconstruct(
      data: Uint8Array,
      dataShards: number,
      parityShards: number,
      shardsAvailable: boolean[],
    ): void;
  }
}
