import { resolve } from 'path';
import { App } from './application';
import { Environment } from './environment';

async function bootstrap() {
  try {
    // Initialize environment
    const envPath = resolve(__dirname, '.env');
    new Environment(envPath);
    
    // Create and start application
    const app = App.getInstance();
    await app.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
