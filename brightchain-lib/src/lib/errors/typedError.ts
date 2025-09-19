import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableErrorOptions } from '../interfaces/handleableErrorOptions';
import { HandleableError } from './handleable';

export abstract class TypedError<
  T extends string | number,
> extends HandleableError {
  protected abstract get reasonMap(): Record<T, StringNames>;

  constructor(
    public readonly type: T,
    public readonly language?: StringLanguages,
    public readonly otherVars?: Record<string, string | number>,
    public readonly options?: HandleableErrorOptions,
  ) {
    // Get the reasonMap from the prototype
    const reasonMap = (new.target as typeof TypedError).prototype.reasonMap;

    // Call super with the translated message
    super(translate(reasonMap[type], otherVars, language), options);

    // Set properties
    this.type = type;
    this.name = this.constructor.name;
  }
}
