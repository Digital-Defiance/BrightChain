export class MissingValidatedDataError extends Error {
  public readonly data?: string | string[];
  constructor(data?: string | string[]) {
    super(
      data
        ? Array.isArray(data)
          ? `Missing validated data: ${data.join(', ')}`
          : `Missing validated data: ${data}`
        : 'Missing validated data',
    );
    this.data = data;
    this.name = 'MissingValidatedDataError';
    Object.setPrototypeOf(this, MissingValidatedDataError.prototype);
  }
}
