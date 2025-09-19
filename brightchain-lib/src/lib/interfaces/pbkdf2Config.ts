export interface IPbkdf2Config {
  hashBytes: number;
  saltBytes: number;
  iterations: number;
  algorithm: string;
}
