import {
  AppConstants,
  debugLog,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';
import ejs from 'ejs';
import {
  Application,
  static as expressStatic,
  Request,
  Response,
} from 'express';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { IApplication } from '../interfaces/application';
import { handleError, sendApiMessageResponse } from '../utils';
import { ApiRouter } from './api';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function keepEJS() {
  ejs.compile(''); // Compile an empty string, doesn't generate anything meaningful
}

/**
 * Application router
 * Sets up the API and static file serving
 */
export class AppRouter {
  private readonly viewsPath: string;
  private readonly indexPath: string;
  private readonly assetsDir: string;

  private readonly apiRouter: ApiRouter;
  private readonly application: IApplication;

  constructor(apiRouter: ApiRouter) {
    this.application = apiRouter.application;
    this.apiRouter = apiRouter;
    this.viewsPath = join(this.application.environment.apiDistDir, 'views');
    this.indexPath = join(
      this.application.environment.reactDistDir,
      'index.html',
    );
    this.assetsDir = join(this.application.environment.reactDistDir, 'assets');
  }

  public getAssetFilename(
    assetDir: string,
    pattern: RegExp,
  ): string | undefined {
    try {
      const files = readdirSync(assetDir);
      return files.find((f) => pattern.test(f));
    } catch {
      return undefined;
    }
  }

  /**
   * Initialize the application router
   * @param app Express application
   * @param debugRoutes Whether to log routes
   */
  public init(app: Application) {
    if (
      !this.apiRouter.application.environment.reactDistDir.includes('/dist/')
    ) {
      throw new Error(
        `App does not appear to be running within dist: ${this.apiRouter.application.environment.reactDistDir}`,
      );
    }
    if (!existsSync(this.indexPath)) {
      throw new Error(`Index file not found: ${this.indexPath}`);
    }

    if (this.apiRouter.application.environment.debug) {
      app.use((req, res, next) => {
        const port =
          (req.socket.localPort === 443 && req.protocol === 'https') ||
          (req.socket.localPort === 80 && req.protocol === 'http')
            ? ''
            : `:${req.socket.localPort}`;
        console.log(
          `${translate(
            StringName.Admin_ServingRoute,
            undefined,
            undefined,
            'admin',
          )}: ${req.method} ${req.protocol}://${req.hostname}${port}${req.url}`,
        );
        next();
      });
    }

    app.use('/api', this.apiRouter.router);

    app.set('views', this.viewsPath);
    app.set('view engine', 'ejs');

    // Serve static files from the React app build directory
    // app.use(express.static(path.join(__dirname, '..', '..', '..', 'brightchain-react')));
    app.use('/assets', expressStatic(this.assetsDir));
    const serveStaticWithLogging = expressStatic(
      this.apiRouter.application.environment.reactDistDir,
    );
    app.use(
      '/static/js',
      expressStatic(this.apiRouter.application.environment.reactDistDir),
    );
    app.use((req, res, next) => {
      if (req.url === '/') {
        next();
        return;
      }
      debugLog(
        this.apiRouter.application.environment.debug,
        'log',
        `Trying to serve static for ${req.url}`,
      );
      if (req.url.endsWith('.js')) {
        res.type('application/javascript');
      }
      serveStaticWithLogging(req, res, (err) => {
        if (err) {
          debugLog(
            this.apiRouter.application.environment.debug,
            'error',
            'Error serving static file:',
            err,
          );
          handleError(err, res, sendApiMessageResponse, next);
          return;
        }
        next();
      });
    });

    // The "catchall" handler: for any request that doesn't
    // match one above, send back React's index.html file.
    // app.get('*', (req, res) => {
    //   res.sendFile(path.join(__dirname,'..', '..', '..', 'brightchain-react', 'index.html'));
    // });
    app.use((req: Request, res: Response) => {
      const cspNonce = res.locals['cspNonce'];
      if (req.url.endsWith('.js')) {
        res.type('application/javascript');
      }

      const isBurnbag = AppConstants.BurnbagHostnameRegex.test(req.hostname);
      const isCanary = AppConstants.CanaryHostnameRegex.test(req.hostname);
      const SiteName = isBurnbag
        ? translate(StringName.SiteBirdBagTemplate)
        : isCanary
          ? translate(StringName.SiteCanaryProtocolTemplate)
          : translate(StringName.SiteBirdBagTemplate);
      const hostname =
        isBurnbag || isCanary ? SiteName.toLowerCase() : req.hostname;
      const jsFile = this.getAssetFilename(this.assetsDir, /^index-.*\.js$/);
      const cssFile = this.getAssetFilename(this.assetsDir, /^index-.*\.css$/);
      const server =
        (req.socket.localPort === 443 && req.protocol === 'https') ||
        (req.socket.localPort === 80 && req.protocol === 'http')
          ? `${req.protocol}://${hostname}`
          : `${req.protocol}://${hostname}:${req.socket.localPort}`;

      res.render(
        'index',
        {
          cspNonce,
          isBurnbag: isBurnbag ? 'true' : 'false',
          isCanary: isCanary ? 'true' : 'false',
          title: SiteName,
          tagline: translate(StringName.SiteTagline),
          server: server,
          siteUrl: this.apiRouter.application.environment.serverUrl,
          baseHref: this.apiRouter.application.environment.basePath,
          fontawesomeKitId:
            this.apiRouter.application.environment.fontAwesomeKitId,
          hostname: hostname,
          siteTitle: SiteName,
          jsFile: jsFile ? `assets/${jsFile}` : undefined,
          cssFile: cssFile ? `assets/${cssFile}` : undefined,
        },
        (err, html) => {
          // Render 'index.ejs'
          if (err) {
            console.error('Error rendering:', err);
            if (!res.headersSent) {
              res.status(500).send('An error occurred'); // Send a generic error message or render a separate error view
            }
            return;
          }
          res.send(html);
        },
      );
    });
  }
}
