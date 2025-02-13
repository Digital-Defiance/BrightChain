export class SerializableBuffer extends Buffer {
  public static readonly SerializationFormat: 'hex' | 'base64' = 'base64';

  public serialize(): string {
    return this.toString(SerializableBuffer.SerializationFormat);
  }

  public static hydrate(value: string): SerializableBuffer {
    return Buffer.from(
      value,
      SerializableBuffer.SerializationFormat,
    ) as SerializableBuffer;
  }
}
