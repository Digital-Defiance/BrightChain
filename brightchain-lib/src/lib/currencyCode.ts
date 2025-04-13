import { codes } from 'currency-codes';
import { DefaultCurrencyCode } from './sharedTypes';

export class CurrencyCode {
  private _value: string = DefaultCurrencyCode;
  public get value(): string {
    return this._value;
  }
  public set value(value: string) {
    if (!CurrencyCode.values.includes(value)) {
      throw new Error('Invalid currency code');
    }
    this._value = value;
  }

  public static get values(): string[] {
    return codes();
  }

  constructor(value: string = DefaultCurrencyCode) {
    this.value = value;
  }
}
