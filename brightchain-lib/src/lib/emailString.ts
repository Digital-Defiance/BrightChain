import { EmailString as EciesEmailString } from '@digitaldefiance/ecies-lib';

export class EmailString extends EciesEmailString {
  constructor(email: string) {
    super(email);
  }
}
