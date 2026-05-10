import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  DigitalBurnbagStringKey,
  DigitalBurnbagStrings,
} from '../../enumerations/digitalburnbag-strings';
import { DigitalBurnbagAmericanEnglishStrings } from './englishUs';

export const DigitalBurnbagBritishEnglishStrings: ComponentStrings<DigitalBurnbagStringKey> =
  {
    ...DigitalBurnbagAmericanEnglishStrings,
    // authorize → authorise
    [DigitalBurnbagStrings.Wizard_Authorize]: 'Authorise',
    [DigitalBurnbagStrings.Wizard_AuthorizeDesc]:
      'Grant access to your account on this provider',
    [DigitalBurnbagStrings.OAuth_WaitingForAuth]:
      'Waiting for authorisation...',
    [DigitalBurnbagStrings.OAuth_Success]: 'Authorisation successful',
    [DigitalBurnbagStrings.OAuth_Failed]: 'Authorisation failed',
    [DigitalBurnbagStrings.OAuth_Cancelled]: 'Authorisation cancelled',
    // BiWeekly → Fortnightly
    [DigitalBurnbagStrings.ProviderInterval_BiWeekly]: 'Fortnightly',
  };
