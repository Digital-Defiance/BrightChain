export interface IDataKeyComponents {
  salt: Buffer;
  iterations: number;
  data: Buffer;
}
