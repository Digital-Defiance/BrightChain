import cors from 'cors';
import { Application, json, urlencoded } from 'express';
import helmet from 'helmet';

/**
 * Generic BrightDB middleware initialization.
 * Provides standard Express security middleware without domain-specific CSP.
 */
export class BrightDbMiddlewares {
  static init(app: Application): void {
    app.use(helmet());
    app.use(cors());
    app.use(json());
    app.use(urlencoded({ extended: true }));
  }
}
