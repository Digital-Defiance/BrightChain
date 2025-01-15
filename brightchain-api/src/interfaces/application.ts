export interface IApplication {
  get ready(): boolean;
  start(): Promise<void>;
}
