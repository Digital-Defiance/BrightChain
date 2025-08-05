import { Application } from 'express';
import { IApplication } from '../interfaces/application';
import { ApiRouter } from './api';
import { BaseRouter } from './base';

/**
 * Main application router
 */
export class AppRouter extends BaseRouter {
  private apiRouter: ApiRouter;

  constructor(apiRouter: ApiRouter) {
    super(apiRouter['application']); // Access the application from apiRouter
    this.apiRouter = apiRouter;
  }

  public init(app: Application): void {
    app.use('/api', this.apiRouter['router']);
    
    // Default route
    app.get('/', (req, res) => {
      res.json({ message: 'BrightChain API' });
    });
  }
}