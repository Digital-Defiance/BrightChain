export class DocumentInvalidValueError extends HandleableError {
  constructor(key: string, language?: StringLanguages) {
    super(translate(StringNames.Error_DocumentInvalidValueTemplate, language, {
      KEY: key
    }));
    this.name = 'DocumentInvalidValueError';
  }
}
