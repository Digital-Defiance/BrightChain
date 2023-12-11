/**
 * Operation cost breakdown in microunits (bigint).
 */
export class OperationCost {
  constructor(
    public readonly computation: bigint,
    public readonly storage: bigint,
    public readonly network: bigint,
    public readonly proofOfWork: bigint = 0n,
  ) {}

  get totalMicrojoules(): bigint {
    return this.computation + this.storage + this.network + this.proofOfWork;
  }

  /**
   * @deprecated Alias for {@link totalMicrojoules} — retained for grep
   * compatibility. Returns `bigint` microunits, not floating-point joules.
   */
  get totalJoules(): bigint {
    return this.totalMicrojoules;
  }

  /**
   * Create zero-cost operation
   */
  static zero(): OperationCost {
    return new OperationCost(0n, 0n, 0n, 0n);
  }

  /**
   * Add two operation costs
   */
  add(other: OperationCost): OperationCost {
    return new OperationCost(
      this.computation + other.computation,
      this.storage + other.storage,
      this.network + other.network,
      this.proofOfWork + other.proofOfWork,
    );
  }
}
