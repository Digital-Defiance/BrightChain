import { IEnvironment } from '@brightchain/brightchain-react-components';

export const environment: IEnvironment = {
  production: false,
  debugI18n: true,
  serverUrl: '',
  apiUrl: '/api',
  emailDomain: 'brightchain.org',
  enabledFeatures: [
    'BrightChat',
    'BrightHub',
    'BrightMail',
    'BrightPass',
    'DigitalBurnbag',
  ],
  gaForce: false,
  brightHubFontAwesomeMaxDisplay: 120,
  brightHubFontAwesomeIconGridSize: 40,
};
