import {
  HandleableError,
  LanguageContext,
  StringLanguage,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';

export class MissingValidatedDataError extends HandleableError {
  public readonly field?: string;
  public readonly fields?: string[];
  constructor(
    data?: string | string[],
    language?: StringLanguage,
    context?: LanguageContext,
  ) {
    let message: string;
    let fields: string[] | undefined;
    let field: string | undefined;
    if (data && Array.isArray(data)) {
      message = `${translate(
        StringName.Validation_MissingValidatedDataForField,
        undefined,
        language,
        context,
      )}: ${data.join(', ')}`;
      fields = data;
    } else if (data) {
      message = `${translate(
        StringName.Validation_MissingValidatedDataForField,
        undefined,
        language,
        context,
      )}: ${String(data)}`;
      field = data as string;
    } else {
      message = translate(
        StringName.Validation_MissingValidatedData,
        undefined,
        language,
        context,
      );
    }
    super(message, {
      statusCode: 422,
    });
    this.field = field;
    this.fields = fields;
    this.name = 'MissingValidatedDataError';
    Object.setPrototypeOf(this, MissingValidatedDataError.prototype);
  }
}
