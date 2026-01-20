import { App, Environment } from '@brightchain/brightchain-api-lib';
import { resolve } from 'path';

async function bootstrap() {
  try {
    // Initialize environment
    const envPath = resolve(__dirname, '.env');
    const env = new Environment(envPath);

    // Create and start application
    const app = new App(env);
    await app.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
