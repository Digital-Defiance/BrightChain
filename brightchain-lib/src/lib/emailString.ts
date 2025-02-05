import validator from 'validator';
import { InvalidEmailErrorType } from './enumerations/invalidEmailType';
import { InvalidEmailError } from './errors/invalidEmail';

/**
 * EmailString represents a validated email address.
 * It ensures that the email is not empty, does not have leading or trailing spaces,
 * and is a valid email format.
 */
export class EmailString {
  public readonly email: string;

  /**
   * Creates an instance of EmailString.
   * @param email - The email address to validate and store.
   * @throws Will throw an error if the email is invalid.
   */
  constructor(email: string) {
    const trimmedEmail = email.trim();
    if (trimmedEmail.length == 0) {
      throw new InvalidEmailError(InvalidEmailErrorType.Missing);
    }
    if (trimmedEmail.length != email.length) {
      throw new InvalidEmailError(InvalidEmailErrorType.Whitespace);
    }
    if (!validator.isEmail(trimmedEmail)) {
      throw new InvalidEmailError(InvalidEmailErrorType.Invalid);
    }
    this.email = trimmedEmail;
  }

  /**
   * Returns the email address as a string.
   * @returns The email address.
   */
  public toString(): string {
    return this.email;
  }

  /**
   * Checks if this email address is equal to another email address.
   * @param other - The other email address to compare.
   * @returns True if the email addresses are equal, false otherwise.
   */
  public equals(other: EmailString): boolean {
    return this.email === other.email;
  }

  /**
   * Converts the email address to a JSON string.
   * @returns The email address as a JSON string.
   */
  public toJSON(): string {
    return this.email;
  }

  /**
   * Creates an EmailString instance from a JSON string.
   * @param email - The JSON string representing the email address.
   * @returns The EmailString instance.
   */
  public static fromJSON(email: string): EmailString {
    return new EmailString(email);
  }

  /**
   * Gets the length of the email address.
   * @returns The length of the email address.
   */
  public get length(): number {
    return this.email.length;
  }
}
