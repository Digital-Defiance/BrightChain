import type { Config } from '@jest/types';
import { getJestProjectsAsync } from '@nx/jest';

const config: Config.InitialOptions = {
  projects: await getJestProjectsAsync(),
};

export default config;
