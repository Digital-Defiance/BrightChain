export class OperationCost {
  constructor(
    public readonly computation: number,
    public readonly storage: number,
    public readonly network: number,
  ) {}

  get totalJoules(): number {
    return this.computation + this.storage + this.network;
  }
}
