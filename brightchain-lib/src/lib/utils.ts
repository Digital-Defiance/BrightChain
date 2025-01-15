/**
 * Optionally prints certain debug messages
 * @param debug Whether to print debug messages
 * @param type What type of message to print
 * @param args Any args to print
 */
export function debugLog(
  debug: boolean,
  type: 'error' | 'warn' | 'log',
  ...args: Array<unknown>
): void {
  if (debug && type === 'error') {
    console.error(...args);
  } else if (debug && type === 'warn') {
    console.warn(...args);
  } else if (debug && type === 'log') {
    console.log(...args);
  }
}
