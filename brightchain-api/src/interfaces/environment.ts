export interface IEnvironment {
  fontawesomeKitId: string;
  jwtSecret: string;
  sendgridKey: string;
  emailSender: string;
  serverUrl: string;
  developer: {
    debug: boolean;
    port: number;
    host: string;
    basePath: string;
  };
}
