/**
 * @fileoverview BrightDbApplication — generic BrightDB-backed application base class.
 *
 * Extends the upstream Application with:
 * - HTTP server capture during start()
 *
 * Domain-specific service wiring stays in the consuming library's App subclass.
 *
 * @module application
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  AppRouter,
  Application as UpstreamApplication,
  type IConstants,
} from '@digitaldefiance/node-express-suite';
import type { Server } from 'http';
import type { BrightDbEnvironment } from './environment';

/**
 * Generic BrightDB-backed application base class.
 *
 * Extends the upstream Application with:
 * - HTTP server capture during start()
 *
 * Domain-specific service wiring stays in the consuming library's App subclass.
 */
export class BrightDbApplication<
  TID extends PlatformID,
  TEnvironment extends BrightDbEnvironment<TID> = BrightDbEnvironment<TID>,
  TConstants extends IConstants = IConstants,
  TAppRouter extends AppRouter<TID> = AppRouter<TID>,
> extends UpstreamApplication<TID, TEnvironment, TConstants, TAppRouter> {
  /**
   * Captured HTTP server reference.
   * The upstream Application stores the server as a private field,
   * so subclasses intercept expressApp.listen() to capture it here.
   */
  protected _httpServer: Server | null = null;

  /**
   * Get the HTTP server instance (available after start()).
   */
  public get httpServer(): Server | null {
    return this._httpServer;
  }
}
