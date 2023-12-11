export interface IPbkdf2Result {
  salt: Buffer;
  hash: Buffer;
  iterations: number;
}