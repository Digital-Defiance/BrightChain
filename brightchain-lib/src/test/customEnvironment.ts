import {
  EnvironmentContext,
  JestEnvironment,
  JestEnvironmentConfig,
} from '@jest/environment';
import NodeEnvironment from 'jest-environment-node';
import { ModuleMocker } from 'jest-mock';

// Add BigInt serialization support
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

interface CustomGlobal {
  messageParent?(message: unknown): void;
  BigInt: BigIntConstructor & {
    prototype: {
      toJSON(): string;
    };
  };
  JSON: {
    stringify: typeof JSON.stringify;
  };
}

class CustomEnvironment extends NodeEnvironment implements JestEnvironment {
  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context);

    // Add toJSON to BigInt prototype for JSON serialization
    this.global.BigInt.prototype.toJSON = function () {
      return this.toString();
    };

    // Handle BigInt serialization for Jest worker messages
    if (typeof this.global.BigInt !== 'undefined') {
      // Process values recursively to convert BigInts to strings
      const processValue = (value: unknown): unknown => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        if (Array.isArray(value)) {
          return value.map(processValue);
        }
        if (value && typeof value === 'object') {
          return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [
              k,
              processValue(v),
            ]),
          );
        }
        return value;
      };

      // Create a proxy for messageParent to handle BigInt serialization
      const customGlobal = this.global as unknown as CustomGlobal;
      const messageParentFn = customGlobal.messageParent;
      if (typeof messageParentFn === 'function') {
        customGlobal.messageParent = function (message: unknown): void {
          return messageParentFn.call(this, processValue(message));
        };
      }

      // Handle BigInt in JSON.stringify
      const originalStringify = this.global.JSON.stringify;
      const stringifyWrapper = function (
        this: typeof JSON,
        value: unknown,
        replacer?:
          | ((key: string, value: unknown) => unknown)
          | (string | number)[]
          | null,
        space?: string | number,
      ): string {
        const processedValue = processValue(value);
        // Cast replacer to expected type for originalStringify
        const safeReplacer =
          typeof replacer === 'function'
            ? null // Skip function replacers as they may contain BigInts
            : (replacer as (string | number)[] | null | undefined);
        return originalStringify.call(
          this,
          processedValue,
          safeReplacer,
          space,
        );
      };

      this.global.JSON.stringify = stringifyWrapper;
    }
  }

  override moduleMocker = new ModuleMocker(global);

  override getVmContext() {
    return super.getVmContext();
  }
}

export default CustomEnvironment;
