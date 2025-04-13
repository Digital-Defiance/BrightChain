/* eslint-disable @nx/enforce-module-boundaries */
import { StringLanguage } from '@brightchain/brightchain-lib';
import {
  HandleableError,
  LanguageContextSpace,
} from '@digitaldefiance/i18n-lib';
import {
  getSuiteCoreTranslation,
  SuiteCoreStringKey,
} from '@digitaldefiance/suite-core-lib';

export class MissingValidatedDataError extends HandleableError {
  public readonly field?: string;
  public readonly fields?: string[];
  constructor(
    data?: string | string[],
    _language?: StringLanguage,
    _context?: LanguageContextSpace,
  ) {
    let message: string;
    let fields: string[] | undefined;
    let field: string | undefined;
    if (data && Array.isArray(data)) {
      message = `${getSuiteCoreTranslation(
        SuiteCoreStringKey.Validation_MissingValidatedData,
      )}: ${data.join(', ')}`;
      fields = data;
    } else if (data) {
      message = `${getSuiteCoreTranslation(
        SuiteCoreStringKey.Validation_MissingValidatedData,
      )}: ${String(data)}`;
      field = data as string;
    } else {
      message = getSuiteCoreTranslation(
        SuiteCoreStringKey.Validation_MissingValidatedData,
      );
    }
    super(new Error(message), {
      statusCode: 422,
    });
    this.field = field;
    this.fields = fields;
    this.name = 'MissingValidatedDataError';
    Object.setPrototypeOf(this, MissingValidatedDataError.prototype);
  }
}
