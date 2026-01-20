import { ENERGY } from './energyConsts';
import { IEnergyAccount, IEnergyAccountDto } from './interfaces/energyAccount';
import { Checksum } from './types/checksum';

/**
 * Energy account for tracking member's Joule balance
 * Follows existing Member/Document patterns
 */
export class EnergyAccount implements IEnergyAccount {
  public balance: number;
  public earned: number;
  public spent: number;
  public reserved: number;
  public reputation: number;
  public lastUpdated: Date;

  constructor(
    public readonly memberId: Checksum,
    public readonly createdAt: Date = new Date(),
    balance: number = ENERGY.TRIAL_CREDITS,
    earned: number = 0,
    spent: number = 0,
    reserved: number = 0,
    reputation: number = 0.5, // New users start at neutral reputation
    lastUpdated?: Date,
  ) {
    this.balance = balance;
    this.earned = earned;
    this.spent = spent;
    this.reserved = reserved;
    this.reputation = reputation;
    this.lastUpdated = lastUpdated ?? createdAt;
  }

  /**
   * Create new account with trial credits
   */
  static createWithTrialCredits(memberId: Checksum): EnergyAccount {
    return new EnergyAccount(memberId);
  }

  /**
   * Get available balance (balance - reserved)
   */
  get availableBalance(): number {
    return Math.max(0, this.balance - this.reserved);
  }

  /**
   * Get net energy (earned - spent)
   */
  get netEnergy(): number {
    return this.earned - this.spent;
  }

  /**
   * Check if account can afford operation
   */
  canAfford(amount: number): boolean {
    return this.availableBalance >= amount;
  }

  /**
   * Reserve energy for operation
   */
  reserve(amount: number): void {
    if (!this.canAfford(amount)) {
      throw new Error(
        `Insufficient balance: need ${amount}J, have ${this.availableBalance}J`,
      );
    }
    this.reserved += amount;
    this.lastUpdated = new Date();
  }

  /**
   * Release reserved energy
   */
  release(amount: number): void {
    this.reserved = Math.max(0, this.reserved - amount);
    this.lastUpdated = new Date();
  }

  /**
   * Charge energy (deduct from balance)
   */
  charge(amount: number): void {
    if (amount > this.balance) {
      throw new Error(
        `Insufficient balance: need ${amount}J, have ${this.balance}J`,
      );
    }
    this.balance -= amount;
    this.spent += amount;
    this.lastUpdated = new Date();
  }

  /**
   * Credit energy (add to balance)
   */
  credit(amount: number): void {
    this.balance += amount;
    this.earned += amount;
    this.lastUpdated = new Date();
  }

  /**
   * Update reputation score
   */
  updateReputation(newReputation: number): void {
    this.reputation = Math.max(0, Math.min(1, newReputation));
    this.lastUpdated = new Date();
  }

  /**
   * Convert to DTO for serialization
   */
  toDto(): IEnergyAccountDto {
    return {
      memberId: this.memberId.toHex(),
      balance: this.balance,
      earned: this.earned,
      spent: this.spent,
      reserved: this.reserved,
      reputation: this.reputation,
      createdAt: this.createdAt.toISOString(),
      lastUpdated: this.lastUpdated.toISOString(),
    };
  }

  /**
   * Create from DTO
   */
  static fromDto(dto: IEnergyAccountDto): EnergyAccount {
    return new EnergyAccount(
      Checksum.fromHex(dto.memberId),
      new Date(dto.createdAt),
      dto.balance,
      dto.earned,
      dto.spent,
      dto.reserved,
      dto.reputation,
      new Date(dto.lastUpdated),
    );
  }

  /**
   * Convert to JSON
   */
  toJson(): string {
    return JSON.stringify(this.toDto());
  }

  /**
   * Create from JSON
   */
  static fromJson(json: string): EnergyAccount {
    return EnergyAccount.fromDto(JSON.parse(json));
  }
}
