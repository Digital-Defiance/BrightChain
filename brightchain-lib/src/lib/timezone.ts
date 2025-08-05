import { isValidTimezone } from './utils';

export class Timezone {
  private readonly _timezone: string;
  constructor(timezone: string) {
    if (!isValidTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
    this._timezone = timezone;
  }
  public get value(): string {
    return this._timezone;
  }
}
