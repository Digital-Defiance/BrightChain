import { StringsCollection } from '@digitaldefiance/i18n-lib';
import { AmericanEnglishStrings } from './englishUs';
import { BrightChainStrings } from '../../enumerations';

export const BritishEnglishStrings: StringsCollection<BrightChainStrings> = {
    ...AmericanEnglishStrings,
    // override any differences here
};