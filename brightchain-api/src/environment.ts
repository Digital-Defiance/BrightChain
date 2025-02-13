import { constants } from '@BrightChain/brightchain-lib';
import { IEnvironment } from './interfaces/environment';

export const environment: IEnvironment = {
  jwtSecret: process.env.JWT_SECRET ?? '3?1g47(h@in!',
  fontawesomeKitId: process.env.FONTAWESOME_KIT_ID ?? '',
  sendgridKey: process.env.SENDGRID_API_KEY ?? '',
  emailSender: process.env.EMAIL_SENDER ?? constants.SITE.EMAIL_FROM,
  serverUrl: process.env.SERVER_URL ?? 'http://localhost:3000',
  developer: {
    debug: process.env.DEBUG === 'true',
    host: process.env.HOST ?? 'localhost',
    port: parseInt(process.env.PORT ?? '3000') ?? 3000,
    basePath: process.env.BASE_PATH ?? '/',
  },
};
