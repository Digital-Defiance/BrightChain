import cors from 'cors';
import { randomBytes } from 'crypto';
import {
  Application,
  json,
  NextFunction,
  raw,
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
    // Configure trust proxy so that req.ip resolves the originating client IP
    // from the X-Forwarded-For header when running behind a reverse proxy.
    // Falls back to the TCP connection remote address when the header is absent.
    // @requirements 8.1, 8.2, 8.3, 2.3
    app.set('trust proxy', true);

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
            imgSrc: [
              "'self'",
              'https://flagcdn.com',
              'data:',
              'blob:',
              'https://raw.githubusercontent.com',
              // Google Analytics tracking pixels
              'https://www.google-analytics.com',
              'https://*.google-analytics.com',
              'https://www.googletagmanager.com',
            ],
            connectSrc: [
              "'self'",
              'http://localhost:3000',
              'https://brightchain.org',
              'https://*.brightchain.org',
              'https://ka-p.fontawesome.com',
              // Google Analytics (gtag.js) beacons
              'https://www.google-analytics.com',
              'https://*.google-analytics.com',
              'https://*.analytics.google.com',
              'https://www.googletagmanager.com',
            ],
            // --- Script CSP Strategy ---
            // 'strict-dynamic' propagates trust from nonce-bearing scripts
            // to scripts they create. This is required because the Font
            // Awesome kit script dynamically injects inline <script>
            // elements for its auto-replacement feature (used by BrightHub's
            // icon markup system with <i class="fa-..."> tags).
            //
            // The nonce on the Vite entry <script type="module"> plus
            // 'strict-dynamic' allows both the entry and its static ES
            // module imports to execute. Modern Chromium (89+) propagates
            // 'strict-dynamic' trust through the module import graph.
            //
            // 'self' and host allowlists are ignored when 'strict-dynamic'
            // is present per the CSP spec, but are kept as fallbacks for
            // browsers that don't support 'strict-dynamic'.
            scriptSrc: [
              "'self'",
              "'strict-dynamic'",
              "'unsafe-inline'", // fallback for browsers without strict-dynamic
              'https://kit.fontawesome.com',
              'https://ka-f.fontawesome.com',
              // Google Analytics (gtag.js)
              'https://www.googletagmanager.com',
              'https://*.googletagmanager.com',
              'https://www.google-analytics.com',
              (req: IncomingMessage, res: ServerResponse) =>
                `'nonce-${(res as Response).locals['cspNonce']}'`,
              `'sha256-6PKsc2tce3h07DOGUTGAjjPqKvoXMqTLynuHAwpWTL4='`, // fontawesome
              "'wasm-unsafe-eval'", // required for bzip2 WASM module
            ],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              'https://fonts.googleapis.com',
              'https://ka-f.fontawesome.com',
            ],
            fontSrc: [
              "'self'",
              'https://fonts.gstatic.com',
              'https://ka-f.fontawesome.com',
            ],
            frameSrc: ["'self'", 'blob:'],
          },
        },
      }),
    );
    // Enable CORS
    app.use(cors(Middlewares.corsOptionsDelegate));
    // Parse incoming requests with raw binary payloads (e.g. file upload chunks)
    app.use(raw({ type: 'application/octet-stream', limit: '50mb' }));
    // Parse incoming requests with JSON payloads
    app.use(json());
    // Parse incoming requests with urlencoded payloads
    app.use(urlencoded({ extended: true }));
  }
}
