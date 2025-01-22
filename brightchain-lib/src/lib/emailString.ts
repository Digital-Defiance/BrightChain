import validator from 'validator';

export class EmailString {
  public readonly email: string;

  constructor(email: string) {
    const trimmedEmail = email.trim();
    if (trimmedEmail.length == 0) {
      throw new Error('Email missing');
    }
    if (trimmedEmail.length != email.length) {
      throw new Error('Email has leading or trailing spaces');
    }
    if (!validator.isEmail(trimmedEmail)) {
      throw new Error('Email is invalid');
    }
    this.email = trimmedEmail;
  }
  public toString(): string {
    return this.email;
  }
  public equals(other: EmailString): boolean {
    return this.email === other.email;
  }
  public toJSON(): string {
    return this.email;
  }
  public static fromJSON(email: string): EmailString {
    return new EmailString(email);
  }
  public get length(): number {
    return this.email.length;
  }
}
