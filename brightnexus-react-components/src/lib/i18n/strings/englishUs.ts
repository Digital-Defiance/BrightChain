import { BrightNexusStrings } from '../../enumerations/brightNexusStrings';

export const brightNexusEnglishUs: Record<BrightNexusStrings, string> = {
  [BrightNexusStrings.Page_Title]: 'BrightNexus Geo Registry',
  [BrightNexusStrings.Page_Subtitle]:
    'Publish your IP → BrightSpacetime coordinates for sovereign light-floor lookups (BSLP DHT tier).',
  [BrightNexusStrings.Form_IpAddress]: 'Public IP address',
  [BrightNexusStrings.Form_Latitude]: 'Latitude',
  [BrightNexusStrings.Form_Longitude]: 'Longitude',
  [BrightNexusStrings.Form_Altitude]: 'Altitude (meters)',
  [BrightNexusStrings.Form_Epoch]: 'Epoch',
  [BrightNexusStrings.Form_HeisenbergMode]: 'Heisenberg privacy mode',
  [BrightNexusStrings.Form_InjectedDelayMd]: 'Injected delay (millidays)',
  [BrightNexusStrings.Form_FuzzRadiusKm]: 'Fuzz radius (km)',
  [BrightNexusStrings.Form_Publish]: 'Publish to registry',
  [BrightNexusStrings.Form_Refresh]: 'Refresh my entries',
  [BrightNexusStrings.List_Empty]: 'No location announcements yet.',
  [BrightNexusStrings.List_Revoke]: 'Revoke',
  [BrightNexusStrings.DnsTxt_Label]: 'DNS TXT (_bright)',
  [BrightNexusStrings.Error_PublishFailed]: 'Failed to publish location',
};
