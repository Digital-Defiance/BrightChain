/* global jest */
/**
 * Minimal vscode module mock for unit tests.
 *
 * Only the APIs actually used by the code under test are stubbed here.
 * Extend as needed when new VS Code APIs are consumed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export class Uri {
  readonly scheme: string;
  readonly authority: string;
  readonly path: string;
  readonly query: string;
  readonly fragment: string;

  private constructor(
    scheme: string,
    authority: string,
    path: string,
    query: string,
    fragment: string,
  ) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
  }

  static parse(value: string): Uri {
    // Simple URL-based parser that mirrors vscode.Uri.parse behaviour
    // for the brightchain:// scheme.
    const url = new URL(value);
    return new Uri(
      url.protocol.replace(':', ''),
      url.hostname,
      url.pathname,
      url.search.replace('?', ''),
      url.hash.replace('#', ''),
    );
  }

  static from(components: {
    scheme: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri {
    return new Uri(
      components.scheme,
      components.authority ?? '',
      components.path ?? '',
      components.query ?? '',
      components.fragment ?? '',
    );
  }

  toString(): string {
    const auth = this.authority ? `//${this.authority}` : '';
    return `${this.scheme}:${auth}${this.path}`;
  }
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export enum FileChangeType {
  Changed = 1,
  Created = 2,
  Deleted = 3,
}

export interface FileChangeEvent {
  readonly type: FileChangeType;
  readonly uri: Uri;
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

/**
 * Minimal TreeItem mock matching vscode.TreeItem API.
 */
export class TreeItem {
  label?: string;
  collapsibleState?: TreeItemCollapsibleState;
  command?: { command: string; title: string; arguments?: any[] };
  contextValue?: string;
  iconPath?: any;
  description?: string;
  tooltip?: string;

  constructor(label: string, collapsibleState?: TreeItemCollapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

/**
 * Minimal EventEmitter mock matching vscode.EventEmitter API.
 */
export class EventEmitter<T> {
  private listeners: Array<(e: T) => any> = [];

  readonly event = (listener: (e: T) => any): Disposable => {
    this.listeners.push(listener);
    return new Disposable(() => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    });
  };

  fire(data: T): void {
    for (const l of this.listeners) {
      l(data);
    }
  }

  dispose(): void {
    this.listeners.length = 0;
  }
}

/**
 * Minimal Disposable mock matching vscode.Disposable API.
 */
export class Disposable {
  private callOnDispose: (() => any) | undefined;

  constructor(callOnDispose: () => any) {
    this.callOnDispose = callOnDispose;
  }

  static from(...disposables: { dispose(): any }[]): Disposable {
    return new Disposable(() => {
      for (const d of disposables) d.dispose();
    });
  }

  dispose(): void {
    this.callOnDispose?.();
    this.callOnDispose = undefined;
  }
}

/**
 * Stub configuration object returned by workspace.getConfiguration().
 * Tests can override _values to control what get() returns.
 */
export class WorkspaceConfiguration {
  _values: Record<string, any> = {};

  get<T>(key: string, defaultValue?: T): T {
    return key in this._values ? this._values[key] : (defaultValue as T);
  }

  async update(key: string, value: any, _configTarget?: any): Promise<void> {
    this._values[key] = value;
  }

  has(key: string): boolean {
    return key in this._values;
  }

  inspect(_key: string): any {
    return undefined;
  }
}

/** Singleton config store so tests can manipulate it. */
const _configSections: Record<string, WorkspaceConfiguration> = {};

function _getOrCreateConfig(section: string): WorkspaceConfiguration {
  if (!_configSections[section]) {
    _configSections[section] = new WorkspaceConfiguration();
  }
  return _configSections[section];
}

/** ConfigurationChangeEvent mock */
export interface ConfigurationChangeEvent {
  affectsConfiguration(section: string): boolean;
}

/** onDidChangeConfiguration listeners */
const _configChangeListeners: Array<(e: ConfigurationChangeEvent) => any> = [];

export const workspace = {
  getConfiguration(section?: string): WorkspaceConfiguration {
    return _getOrCreateConfig(section ?? '');
  },

  onDidChangeConfiguration(
    listener: (e: ConfigurationChangeEvent) => any,
  ): Disposable {
    _configChangeListeners.push(listener);
    return new Disposable(() => {
      const idx = _configChangeListeners.indexOf(listener);
      if (idx >= 0) _configChangeListeners.splice(idx, 1);
    });
  },

  /** Test helper: fire a config change event */
  _fireConfigChange(event: ConfigurationChangeEvent): void {
    for (const l of _configChangeListeners) {
      l(event);
    }
  },

  registerFileSystemProvider: jest.fn(
    (_scheme: string, _provider: any, _options?: any) =>
      new Disposable(() => {
        /* no-op */
      }),
  ),

  fs: {
    readFile: jest.fn(
      async (_uri: any): Promise<Uint8Array> => new Uint8Array(0),
    ),
    writeFile: jest.fn(
      async (_uri: any, _content: Uint8Array): Promise<void> => undefined,
    ),
  },

  /** Test helper: reset all config state */
  _reset(): void {
    for (const key of Object.keys(_configSections)) {
      delete _configSections[key];
    }
    _configChangeListeners.length = 0;
  },
};

/** Minimal StatusBarItem mock. */
export class StatusBarItemMock {
  text = '';
  tooltip: string | undefined = undefined;
  command: string | undefined = undefined;
  alignment: number;
  priority: number | undefined;
  visible = false;

  constructor(alignment?: number, priority?: number) {
    this.alignment = alignment ?? StatusBarAlignment.Left;
    this.priority = priority;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  dispose(): void {
    this.visible = false;
  }
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}

/** Minimal CancellationTokenSource mock. */
export class CancellationTokenSource {
  private _isCancelled = false;
  readonly token = {
    isCancellationRequested: false,
    onCancellationRequested: (_listener: () => void) =>
      new Disposable(() => {
        /* no-op */
      }),
  };

  cancel(): void {
    this._isCancelled = true;
    this.token.isCancellationRequested = true;
  }

  dispose(): void {
    /* no-op */
  }
}

/** Minimal WebviewPanel mock. */
export class WebviewPanelMock {
  readonly viewType: string;
  title: string;
  readonly webview: {
    html: string;
    onDidReceiveMessage: (listener: (msg: any) => void) => Disposable;
    postMessage: jest.Mock;
    _listeners: Array<(msg: any) => void>;
    _fireMessage: (msg: any) => void;
  };
  readonly onDidDispose: (listener: () => void) => Disposable;
  private _disposeListeners: Array<() => void> = [];
  visible = true;

  constructor(viewType: string, title: string) {
    this.viewType = viewType;
    this.title = title;
    const listeners: Array<(msg: any) => void> = [];
    this.webview = {
      html: '',
      onDidReceiveMessage: (listener: (msg: any) => void) => {
        listeners.push(listener);
        return new Disposable(() => {
          const idx = listeners.indexOf(listener);
          if (idx >= 0) listeners.splice(idx, 1);
        });
      },
      postMessage: jest.fn(async () => true),
      _listeners: listeners,
      _fireMessage: (msg: any) => {
        for (const l of listeners) l(msg);
      },
    };
    this.onDidDispose = (listener: () => void) => {
      this._disposeListeners.push(listener);
      return new Disposable(() => {
        const idx = this._disposeListeners.indexOf(listener);
        if (idx >= 0) this._disposeListeners.splice(idx, 1);
      });
    };
  }

  dispose(): void {
    this.visible = false;
    for (const l of this._disposeListeners) l();
  }
}

export const window = {
  showWarningMessage: jest.fn(
    async (..._args: any[]): Promise<string | undefined> => undefined,
  ),

  showInformationMessage: jest.fn(
    async (..._args: any[]): Promise<string | undefined> => undefined,
  ),

  showErrorMessage: jest.fn(
    async (..._args: any[]): Promise<string | undefined> => undefined,
  ),

  createStatusBarItem: jest.fn(
    (alignment?: number, priority?: number) =>
      new StatusBarItemMock(alignment, priority),
  ),

  withProgress: jest.fn(
    async (
      _options: any,
      task: (
        progress: {
          report: (value: { increment?: number; message?: string }) => void;
        },
        token: { isCancellationRequested: boolean },
      ) => Promise<any>,
    ) => {
      const progress = { report: jest.fn() };
      const token = { isCancellationRequested: false };
      return task(progress, token);
    },
  ),

  createWebviewPanel: jest.fn(
    (viewType: string, title: string, _column?: any, _options?: any) =>
      new WebviewPanelMock(viewType, title),
  ),

  showQuickPick: jest.fn(
    async (_items: any[], _options?: any): Promise<any | undefined> =>
      undefined,
  ),

  showInputBox: jest.fn(
    async (_options?: any): Promise<string | undefined> => undefined,
  ),

  showOpenDialog: jest.fn(
    async (_options?: any): Promise<Uri[] | undefined> => undefined,
  ),

  showSaveDialog: jest.fn(
    async (_options?: any): Promise<Uri | undefined> => undefined,
  ),

  registerTreeDataProvider: jest.fn(
    (_viewId: string, _provider: any) =>
      new Disposable(() => {
        /* no-op */
      }),
  ),
};

/** Enum stub for ViewColumn */
export enum ViewColumn {
  One = 1,
  Two = 2,
  Three = 3,
}

/** Enum stub for ConfigurationTarget */
export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

/**
 * In-memory SecretStorage mock matching vscode.SecretStorage API.
 */
export class SecretStorage {
  private _data = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this._data.get(key);
  }

  async store(key: string, value: string): Promise<void> {
    this._data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this._data.delete(key);
  }
}

export const commands = {
  executeCommand: jest.fn(async (..._args: any[]): Promise<any> => undefined),
  registerCommand: jest.fn(
    (_command: string, _callback: (...args: any[]) => any) =>
      new Disposable(() => {
        /* no-op */
      }),
  ),
};

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
  alwaysShow?: boolean;
}
