export class DocumentFieldRequiredError extends HandleableError {
  constructor(key: string, language?: StringLanguages) {
    super(translate(StringNames.Error_DocumentFieldRequiredTemplate, language, {
      KEY: key
    }));
    this.name = 'DocumentFieldRequiredError';
  }
}
