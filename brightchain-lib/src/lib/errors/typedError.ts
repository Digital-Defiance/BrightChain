import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export abstract class TypedError<
  T extends string | number,
> extends HandleableError {
  public readonly type: T;
  protected abstract get reasonMap(): Record<T, StringNames>;

  constructor(
    type: T,
    language?: StringLanguages,
    otherVars?: Record<string, string | number>,
  ) {
    // Get the reasonMap from the prototype
    const reasonMap = (new.target as typeof TypedError).prototype.reasonMap;

    // Call super with the translated message
    super(translate(reasonMap[type], language, otherVars));

    // Set properties
    this.type = type;
    this.name = this.constructor.name;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
