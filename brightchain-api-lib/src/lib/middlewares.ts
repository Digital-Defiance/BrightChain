import { AppConstants } from './appConstants';
import cors from 'cors';
import { randomBytes } from 'crypto';
import {
  Application,
  json,
  NextFunction,
  Request,
  Response,
  urlencoded,
} from 'express';
import helmet from 'helmet';
import { IncomingMessage, ServerResponse } from 'http';

export class Middlewares {
  /**
   * CORS whitelist
   */
  private static readonly corsWhitelist: (string | RegExp)[] = [
    'http://localhost:3000',
    'https://localhost:3000',
  ];

  /**
   * CORS options delegate
   * @param req - CORS request
   * @param callback - Callback function
   */
  private static readonly corsOptionsDelegate = (
    req: cors.CorsRequest,
    callback: (
      error: Error | null,
      options: cors.CorsOptions | undefined,
    ) => void,
  ) => {
    let corsOptions: cors.CorsOptions;
    const origin = req.headers.origin;
    if (
      origin &&
      Middlewares.corsWhitelist.find((w) => {
        if (w instanceof RegExp) {
          return w.test(origin);
        } else {
          return w === origin;
        }
      })
    ) {
      corsOptions = { origin: true };
    } else {
      corsOptions = { origin: false };
    }
    callback(null, corsOptions);
  };

  /**
   * Initialize the middleware
   * @param app - Express application
   */
  public static init(app: Application): void {
    // Helmet helps you secure your Express apps by setting various HTTP headers
    // CSP nonce
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.locals['cspNonce'] = randomBytes(32).toString('hex');
      next();
    });
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", 'https://flagcdn.com', 'data:', 'blob:'],
            connectSrc: [
              "'self'",
              'http://localhost:3000',
              'https://brightchain.org',
              'https://*.brightchain.org',
              'https://ka-p.fontawesome.com',
            ],
            scriptSrc: [
              "'self'",
              //"'unsafe-inline'",
              "'strict-dynamic'",
              'https://kit.fontawesome.com',
              (req: IncomingMessage, res: ServerResponse) =>
                `'nonce-${(res as Response).locals['cspNonce']}'`,
              `'sha256-6PKsc2tce3h07DOGUTGAjjPqKvoXMqTLynuHAwpWTL4='`, // fontawesome
            ],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              'https://fonts.googleapis.com',
            ],
            fontSrc: [
              "'self'",
              'https://fonts.gstatic.com',
              'https://ka-f.fontawesome.com',
            ],
            frameSrc: ["'self'"],
          },
        },
      }),
    );
    // Enable CORS
    app.use(cors(Middlewares.corsOptionsDelegate));
    // Parse incoming requests with JSON payloads
    app.use(json());
    // Parse incoming requests with urlencoded payloads
    app.use(urlencoded({ extended: true }));
  }
}
