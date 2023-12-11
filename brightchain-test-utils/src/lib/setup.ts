import '@jest/globals';
import './matchers/error-matchers';

// Re-export the matcher to ensure it's loaded
export { toThrowType } from './matchers/error-matchers';
