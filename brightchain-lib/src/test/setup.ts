import '@jest/globals';
import './matchers/errorMatchers';

// Re-export the matcher to ensure it's loaded
export { toThrowType } from './matchers/errorMatchers';
