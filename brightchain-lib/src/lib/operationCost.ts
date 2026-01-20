/**
 * Operation cost breakdown in Joules
 */
export class OperationCost {
  constructor(
    public readonly computation: number,
    public readonly storage: number,
    public readonly network: number,
    public readonly proofOfWork: number = 0,
  ) {}

  get totalJoules(): number {
    return this.computation + this.storage + this.network + this.proofOfWork;
  }

  /**
   * Create zero-cost operation
   */
  static zero(): OperationCost {
    return new OperationCost(0, 0, 0, 0);
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
