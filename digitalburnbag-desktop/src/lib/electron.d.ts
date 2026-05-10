declare module 'electron' {
  export const app: {
    requestSingleInstanceLock(): boolean;
    whenReady(): Promise<void>;
    quit(): void;
    exit(code?: number): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
  };
  export class BrowserWindow {
    constructor(options: Record<string, unknown>);
    loadFile(path: string): Promise<void>;
    loadURL(url: string): Promise<void>;
    show(): void;
    hide(): void;
    focus(): void;
    isMinimized(): boolean;
    restore(): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
    webContents: { send(channel: string, ...args: unknown[]): void };
  }
  export class Tray {
    constructor(icon: NativeImage);
    setToolTip(tooltip: string): void;
    setContextMenu(menu: Menu): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
  }
  export const Menu: {
    buildFromTemplate(template: Record<string, unknown>[]): Menu;
  };
  export const nativeImage: {
    createEmpty(): NativeImage;
  };
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface NativeImage {
    // Opaque handle
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Menu {
    // Opaque handle
  }
  export const ipcMain: {
    handle(channel: string, handler: (...args: unknown[]) => unknown): void;
    on(channel: string, handler: (...args: unknown[]) => void): void;
  };
  export const ipcRenderer: {
    invoke(channel: string, ...args: unknown[]): Promise<unknown>;
    send(channel: string, ...args: unknown[]): void;
    on(channel: string, handler: (...args: unknown[]) => void): void;
  };
  export const contextBridge: {
    exposeInMainWorld(apiKey: string, api: Record<string, unknown>): void;
  };
}

declare module 'electron-store' {
  export default class Store {
    constructor(options?: Record<string, unknown>);
    get(key: string): unknown;
    set(key: string, value: unknown): void;
  }
}
