import { CONSTANTS } from '@brightchain/brightchain-lib';
import { IEnvironment } from '@brightchain/brightchain-react-components';

const runtimeConfig =
  ((window as unknown as Record<string, unknown>).APP_CONFIG as Record<
    string,
    unknown
  >) || {};

export const environment: IEnvironment = {
  production: false,
  debugI18n: true,
  serverUrl: (runtimeConfig.serverUrl as string) || '',
  apiUrl: (runtimeConfig.apiUrl as string) || '/api',
  emailDomain: (runtimeConfig.emailDomain as string) || CONSTANTS.SITE.DOMAIN,
  enabledFeatures: (runtimeConfig.enabledFeatures as string[]) || [
    'BrightChat',
    'BrightHub',
    'BrightMail',
    'BrightPass',
    'BrightChart',
    'DigitalBurnbag',
  ],
  gtag: (runtimeConfig.gtag as string | undefined) || undefined,
  brightHubFontAwesomeMaxDisplay:
    (runtimeConfig.brightHubFontAwesomeMaxDisplay as number) ||
    CONSTANTS.BRIGHTHUB.FONTAWESOME_MAX_DISPLAY,
  brightHubFontAwesomeIconGridSize:
    (runtimeConfig.brightHubFontAwesomeIconGridSize as number) ||
    CONSTANTS.BRIGHTHUB.FONTAWESOME_ICON_GRID_SIZE,
  brightChatFontAwesomeMaxDisplay:
    (runtimeConfig.brightChatFontAwesomeMaxDisplay as number) ||
    CONSTANTS.BRIGHTCHAT.FONTAWESOME_MAX_DISPLAY,
  brightChatFontAwesomeIconGridSize:
    (runtimeConfig.brightChatFontAwesomeIconGridSize as number) ||
    CONSTANTS.BRIGHTCHAT.FONTAWESOME_ICON_GRID_SIZE,
};
