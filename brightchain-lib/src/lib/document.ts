export type SchemaType = StringConstructor | NumberConstructor | BooleanConstructor | ObjectConstructor | ArrayConstructor | DateConstructor | ((value: any) => boolean);

export type SchemaTypeOptions<T> = {
  type: SchemaType;
  required?: boolean;
  default?: T;
  serialize?: (value: T) => any;
  hydrate?: (value: any) => T;
};

export type SchemaDefinition<T> = {
  [K in keyof T]: SchemaTypeOptions<T[K]> | SchemaTypeOptions<T[K]>[] | SchemaDefinition<T[K]>;
};

export type InstanceMethods<T> = {
  [key: string]: (this: Document<T>, ...args: any[]) => any;
};

export type StaticMethods<T> = {
  [key: string]: (this: typeof Document, ...args: any[]) => any;
};

export class Document<T> {
  private data: T;
  private schema?: SchemaDefinition<T>;
  private instanceMethods: InstanceMethods<T>;
  private staticMethods: StaticMethods<T>;

  constructor(data: Partial<T>, schema?: SchemaDefinition<T>, instanceMethods: InstanceMethods<T> = {}, staticMethods: StaticMethods<T> = {}) {
    this.schema = schema;
    this.data = schema ? this.applyDefaults(data) : (data as T);
    if (schema) {
      this.validateSchema(this.data);
    }
    this.instanceMethods = instanceMethods;
    Object.assign(this, instanceMethods);
    Object.assign(Document, staticMethods);
  }

  private applyDefaults(data: Partial<T>): T {
    const defaults: Partial<T> = {};
    for (const key in this.schema) {
      const schemaDef = this.schema[key];
      if (typeof schemaDef === 'object' && 'default' in schemaDef) {
        defaults[key] = data[key] === undefined ? schemaDef.default : data[key];
      } else {
        defaults[key] = data[key];
      }
    }
    return defaults as T;
  }

  private validateType(value: any, type: SchemaType): boolean {
    if (type === String) return typeof value === 'string';
    if (type === Number) return typeof value === 'number';
    if (type === Boolean) return typeof value === 'boolean';
    if (type === Object) return typeof value === 'object' && !Array.isArray(value);
    if (type === Array) return Array.isArray(value);
    if (type === Date) return value instanceof Date;
    if (typeof type === 'function') return type(value);
    return false;
  }

  private validateSchema(data: Partial<T>): void {
    for (const key in this.schema) {
      const schemaDef = this.schema[key];
      const value = data[key];
      if (Array.isArray(schemaDef)) {
        if (!Array.isArray(value)) {
          throw new Error(`Field ${key} should be an array.`);
        }
        for (const item of value) {
          if (!this.validateType(item, schemaDef[0].type)) {
            throw new Error(`Invalid value in array for ${key}`);
          }
        }
      } else if (typeof schemaDef === 'object' && 'type' in schemaDef) {
        if (schemaDef.required && value === undefined) {
          throw new Error(`Field ${key} is required.`);
        }
        if (value !== undefined && !this.validateType(value, schemaDef.type)) {
          throw new Error(`Field ${key} is invalid.`);
        }
      } else if (typeof schemaDef === 'object') {
        this.validateSchema(value as any);
      }
    }
  }

  private hydrateData(data: Partial<T>): void {
    for (const key in this.schema) {
      const schemaDef = this.schema[key];
      const value = data[key];
      if (schemaDef && typeof schemaDef === 'object' && 'hydrate' in schemaDef) {
        this.data[key] = schemaDef.hydrate(value);
      } else if (Array.isArray(schemaDef)) {
        this.data[key] = value.map(item => schemaDef[0].hydrate ? schemaDef[0].hydrate(item) : item);
      } else {
        this.data[key] = value;
      }
    }
  }

  static fromJson<U>(json: string, schema?: SchemaDefinition<U>, instanceMethods: InstanceMethods<U> = {}, staticMethods: StaticMethods<U> = {}): Document<U> {
    const data = JSON.parse(json);
    const document = new Document<U>(data, schema, instanceMethods, staticMethods);
    if (schema) {
      document.hydrateData(data);
    }
    return document;
  }

  toJson(): string {
    const serializedData: Partial<T> = {};
    for (const key in this.data) {
      const value = this.data[key];
      const schemaDef = this.schema?.[key];
      if (schemaDef && typeof schemaDef === 'object' && 'serialize' in schemaDef) {
        serializedData[key] = schemaDef.serialize(value);
      } else if (value && typeof value === 'object' && 'toJson' in value) {
        serializedData[key] = (value as any).toJson();
      } else {
        serializedData[key] = value;
      }
    }
    return JSON.stringify(serializedData);
  }

  static new<U>(data: Partial<U>, schema?: SchemaDefinition<U>, instanceMethods: InstanceMethods<U> = {}, staticMethods: StaticMethods<U> = {}): Document<U> {
    return new Document<U>(data, schema, instanceMethods, staticMethods);
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.data[key];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    if (this.schema) {
      const schemaDef = this.schema[key];
      if (Array.isArray(schemaDef)) {
        if (!Array.isArray(value) || !value.every(item => this.validateType(item, schemaDef[0].type))) {
          throw new Error(`Invalid value for ${String(key)}`);
        }
      } else if (typeof schemaDef === 'object' && 'type' in schemaDef) {
        if (!this.validateType(value, schemaDef.type)) {
          throw new Error(`Invalid value for ${String(key)}`);
        }
        if (schemaDef.required && value === undefined) {
          throw new Error(`Field ${String(key)} is required.`);
        }
      } else if (typeof schemaDef === 'object') {
        this.validateSchema(value as any);
      }
    }
    this.data[key] = value;
  }
}
