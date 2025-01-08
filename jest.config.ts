import type { Config } from '@jest/types';
import { getJestProjects } from '@nx/jest';

const config: Config.InitialOptions = {
  projects: getJestProjects(),
};

export default config;
