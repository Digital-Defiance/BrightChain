/**
 * Holiday Catalog Seed Data
 *
 * Static array of pre-configured holiday ICS feed entries covering major
 * world regions, religious calendars, and cultural observances.
 * Served by HolidayCatalogController at GET /api/cal/holiday-catalog.
 *
 * Sources:
 * - Google Calendar public holiday feeds (free, maintained, standard ICS)
 *   URL pattern: https://calendar.google.com/calendar/ical/{encoded_id}/public/basic.ics
 *   Full list: https://gist.github.com/dhoeric/76bd1c15168ee0ee61ad3bf1730dcb65
 *
 * - Hebcal.com (comprehensive Jewish calendar data, CC-BY license)
 *   https://www.hebcal.com/ical/
 *
 * @see Requirements 10.1, 10.3, 10.4, 5.2
 */

import type { IHolidayFeedEntry } from '@brightchain/brightcal-lib';

/** Helper to build a Google Calendar public holiday ICS URL from a calendar ID */
function gcalUrl(calendarId: string): string {
  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
}

export const holidayCatalogData: readonly IHolidayFeedEntry[] = [
  // ─── Religious Calendars ─────────────────────────────────────────────

  {
    id: 'religious-jewish-google',
    displayName: 'Jewish Holidays',
    description: 'Major Jewish holidays and observances (Google Calendar)',
    region: 'International',
    category: 'Religious Holidays',
    icsUrl: gcalUrl('en.judaism#holiday@group.v.calendar.google.com'),
  },
  {
    id: 'religious-jewish-hebcal-major',
    displayName: 'Jewish Holidays — Major (Hebcal)',
    description:
      'Rosh Hashana, Yom Kippur, Passover, Sukkot, Hanukkah and more (~40 events/year, 10-year feed via Hebcal)',
    region: 'International',
    category: 'Religious Holidays',
    icsUrl:
      'https://www.hebcal.com/hebcal?v=1&cfg=ics&maj=on&ss=on&mf=on&c=off',
  },
  {
    id: 'religious-jewish-hebcal-all',
    displayName: 'Jewish Holidays — Comprehensive (Hebcal)',
    description:
      'Major, minor, modern Israeli holidays, fast days, Rosh Chodesh, Special Shabbatot (~95 events/year via Hebcal)',
    region: 'International',
    category: 'Religious Holidays',
    icsUrl:
      'https://www.hebcal.com/hebcal?v=1&cfg=ics&maj=on&min=on&mod=on&nx=on&ss=on&mf=on&c=off',
  },
  {
    id: 'religious-jewish-torah',
    displayName: 'Torah Portions — Parashat ha-Shavua (Hebcal)',
    description:
      'Weekly Torah readings (Diaspora schedule, ~50 events/year via Hebcal)',
    region: 'International',
    category: 'Religious Holidays',
    icsUrl: 'https://www.hebcal.com/hebcal?v=1&cfg=ics&s=on&c=off',
  },
  {
    id: 'religious-jewish-omer',
    displayName: 'Counting of the Omer (Hebcal)',
    description:
      "Sefirat Ha'omer — 49 days between Passover and Shavuot (~49 events/year via Hebcal)",
    region: 'International',
    category: 'Religious Holidays',
    icsUrl: 'https://www.hebcal.com/hebcal?v=1&cfg=ics&o=on&c=off',
  },
  {
    id: 'religious-jewish-hebrew-dates',
    displayName: 'Hebrew Calendar Dates (Hebcal)',
    description:
      'Daily Hebrew date display (e.g. 18th of Tevet) — 365 events/year via Hebcal',
    region: 'International',
    category: 'Religious Holidays',
    icsUrl: 'https://www.hebcal.com/hebcal?v=1&cfg=ics&d=on&c=off',
  },
  {
    id: 'religious-islamic',
    displayName: 'Islamic Holidays',
    description:
      'Major Islamic holidays — Ramadan, Eid al-Fitr, Eid al-Adha, Mawlid, and more',
    region: 'International',
    category: 'Religious Holidays',
    icsUrl: gcalUrl('en.islamic#holiday@group.v.calendar.google.com'),
  },
  {
    id: 'religious-christian',
    displayName: 'Christian Holidays',
    description:
      'Major Christian observances — Easter, Christmas, Lent, Pentecost, and more',
    region: 'International',
    category: 'Religious Holidays',
    icsUrl: gcalUrl('en.christian#holiday@group.v.calendar.google.com'),
  },
  {
    id: 'religious-orthodox',
    displayName: 'Orthodox Christian Holidays',
    description:
      'Eastern Orthodox observances — Orthodox Easter, Christmas (Jan 7), Theophany, and more',
    region: 'International',
    category: 'Religious Holidays',
    icsUrl: gcalUrl(
      'en.orthodox_christianity#holiday@group.v.calendar.google.com',
    ),
  },
  {
    id: 'religious-hindu',
    displayName: 'Hindu Holidays',
    description:
      'Major Hindu holidays and festivals — Diwali, Holi, Navratri, Ganesh Chaturthi, and more',
    region: 'International',
    category: 'Religious Holidays',
    icsUrl: gcalUrl('en.hinduism#holiday@group.v.calendar.google.com'),
  },

  // ─── North America ───────────────────────────────────────────────────

  {
    id: 'national-us',
    displayName: 'US Holidays',
    description: 'Federal and widely observed holidays in the United States',
    region: 'United States',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.usa%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-ca',
    displayName: 'Canadian Holidays',
    description: 'Federal and provincial holidays in Canada',
    region: 'Canada',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.canadian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-mx',
    displayName: 'Mexican Holidays',
    description:
      'Public holidays in Mexico — Día de los Muertos, Cinco de Mayo, and more',
    region: 'Mexico',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.mexican%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-pr',
    displayName: 'Puerto Rico Holidays',
    description: 'Public holidays in Puerto Rico',
    region: 'Puerto Rico',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.pr%23holiday@group.v.calendar.google.com'),
  },

  // ─── South America ───────────────────────────────────────────────────

  {
    id: 'national-br',
    displayName: 'Brazilian Holidays',
    description:
      'Public holidays in Brazil — Carnival, Independence Day, and more',
    region: 'Brazil',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.brazilian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-ar',
    displayName: 'Argentine Holidays',
    description: 'Public holidays in Argentina',
    region: 'Argentina',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.ar%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-co',
    displayName: 'Colombian Holidays',
    description: 'Public holidays in Colombia',
    region: 'Colombia',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.co%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-cl',
    displayName: 'Chilean Holidays',
    description: 'Public holidays in Chile',
    region: 'Chile',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.cl%23holiday@group.v.calendar.google.com'),
  },

  // ─── Europe ──────────────────────────────────────────────────────────

  {
    id: 'national-uk',
    displayName: 'UK Holidays',
    description: 'Bank holidays and public holidays in the United Kingdom',
    region: 'United Kingdom',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.uk%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-ie',
    displayName: 'Irish Holidays',
    description: 'Public holidays in Ireland',
    region: 'Ireland',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.irish%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-de',
    displayName: 'German Holidays',
    description: 'Public holidays in Germany',
    region: 'Germany',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.german%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-fr',
    displayName: 'French Holidays',
    description: 'Public holidays in France',
    region: 'France',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.french%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-it',
    displayName: 'Italian Holidays',
    description: 'Public holidays in Italy',
    region: 'Italy',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.italian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-es',
    displayName: 'Spanish Holidays',
    description: 'Public holidays in Spain',
    region: 'Spain',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.spain%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-pt',
    displayName: 'Portuguese Holidays',
    description: 'Public holidays in Portugal',
    region: 'Portugal',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.portuguese%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-nl',
    displayName: 'Dutch Holidays',
    description: 'Public holidays in the Netherlands',
    region: 'Netherlands',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.dutch%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-be',
    displayName: 'Belgian Holidays',
    description: 'Public holidays in Belgium',
    region: 'Belgium',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.be%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-ch',
    displayName: 'Swiss Holidays',
    description: 'Public holidays in Switzerland',
    region: 'Switzerland',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.ch%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-at',
    displayName: 'Austrian Holidays',
    description: 'Public holidays in Austria',
    region: 'Austria',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.austrian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-pl',
    displayName: 'Polish Holidays',
    description: 'Public holidays in Poland',
    region: 'Poland',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.polish%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-cz',
    displayName: 'Czech Holidays',
    description: 'Public holidays in Czechia',
    region: 'Czechia',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.czech%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-se',
    displayName: 'Swedish Holidays',
    description: 'Public holidays in Sweden',
    region: 'Sweden',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.swedish%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-no',
    displayName: 'Norwegian Holidays',
    description: 'Public holidays in Norway',
    region: 'Norway',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.norwegian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-dk',
    displayName: 'Danish Holidays',
    description: 'Public holidays in Denmark',
    region: 'Denmark',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.danish%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-fi',
    displayName: 'Finnish Holidays',
    description: 'Public holidays in Finland',
    region: 'Finland',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.finnish%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-gr',
    displayName: 'Greek Holidays',
    description: 'Public holidays in Greece',
    region: 'Greece',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.greek%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-ro',
    displayName: 'Romanian Holidays',
    description: 'Public holidays in Romania',
    region: 'Romania',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.romanian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-hu',
    displayName: 'Hungarian Holidays',
    description: 'Public holidays in Hungary',
    region: 'Hungary',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.hungarian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-ua',
    displayName: 'Ukrainian Holidays',
    description: 'Public holidays in Ukraine',
    region: 'Ukraine',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.ukrainian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-ru',
    displayName: 'Russian Holidays',
    description: 'Public holidays in Russia',
    region: 'Russia',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.russian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-tr',
    displayName: 'Turkish Holidays',
    description: 'Public holidays in Turkey',
    region: 'Turkey',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.turkish%23holiday@group.v.calendar.google.com'),
  },

  // ─── Middle East ─────────────────────────────────────────────────────

  {
    id: 'national-il',
    displayName: 'Israeli Holidays',
    description:
      "National holidays in Israel — Yom Ha'atzmaut, Yom HaZikaron, and more",
    region: 'Israel',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.jewish%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-sa',
    displayName: 'Saudi Arabian Holidays',
    description: 'Public holidays in Saudi Arabia',
    region: 'Saudi Arabia',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.saudiarabian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-ae',
    displayName: 'UAE Holidays',
    description: 'Public holidays in the United Arab Emirates',
    region: 'United Arab Emirates',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.ae%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-eg',
    displayName: 'Egyptian Holidays',
    description: 'Public holidays in Egypt',
    region: 'Egypt',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.eg%23holiday@group.v.calendar.google.com'),
  },

  // ─── Asia ────────────────────────────────────────────────────────────

  {
    id: 'national-cn',
    displayName: 'Chinese Holidays',
    description:
      'Public holidays and traditional festivals in China — Lunar New Year, Mid-Autumn, and more',
    region: 'China',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.china%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-jp',
    displayName: 'Japanese Holidays',
    description: 'National holidays in Japan',
    region: 'Japan',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.japanese%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-kr',
    displayName: 'South Korean Holidays',
    description: 'Public holidays in South Korea — Chuseok, Seollal, and more',
    region: 'South Korea',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.south_korea%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-in',
    displayName: 'Indian Holidays',
    description:
      'Public holidays in India — Republic Day, Independence Day, Diwali, and more',
    region: 'India',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.indian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-id',
    displayName: 'Indonesian Holidays',
    description: 'Public holidays in Indonesia',
    region: 'Indonesia',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.indonesian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-th',
    displayName: 'Thai Holidays',
    description: 'Public holidays in Thailand',
    region: 'Thailand',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.th%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-vn',
    displayName: 'Vietnamese Holidays',
    description: 'Public holidays in Vietnam',
    region: 'Vietnam',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.vietnamese%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-ph',
    displayName: 'Philippine Holidays',
    description: 'Public holidays in the Philippines',
    region: 'Philippines',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.philippines%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-my',
    displayName: 'Malaysian Holidays',
    description: 'Public holidays in Malaysia',
    region: 'Malaysia',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.malaysia%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-sg',
    displayName: 'Singaporean Holidays',
    description: 'Public holidays in Singapore',
    region: 'Singapore',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.singapore%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-pk',
    displayName: 'Pakistani Holidays',
    description: 'Public holidays in Pakistan',
    region: 'Pakistan',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.pk%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-bd',
    displayName: 'Bangladeshi Holidays',
    description: 'Public holidays in Bangladesh',
    region: 'Bangladesh',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.bd%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-tw',
    displayName: 'Taiwanese Holidays',
    description: 'Public holidays in Taiwan',
    region: 'Taiwan',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.taiwan%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-hk',
    displayName: 'Hong Kong Holidays',
    description: 'Public holidays in Hong Kong',
    region: 'Hong Kong',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.hong_kong%23holiday@group.v.calendar.google.com'),
  },

  // ─── Oceania ─────────────────────────────────────────────────────────

  {
    id: 'national-au',
    displayName: 'Australian Holidays',
    description: 'National and state holidays in Australia',
    region: 'Australia',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.australian%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-nz',
    displayName: 'New Zealand Holidays',
    description: 'Public holidays in New Zealand',
    region: 'New Zealand',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.new_zealand%23holiday@group.v.calendar.google.com'),
  },

  // ─── Africa ──────────────────────────────────────────────────────────

  {
    id: 'national-za',
    displayName: 'South African Holidays',
    description: 'Public holidays in South Africa',
    region: 'South Africa',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.sa%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-ng',
    displayName: 'Nigerian Holidays',
    description: 'Public holidays in Nigeria',
    region: 'Nigeria',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.ng%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-ke',
    displayName: 'Kenyan Holidays',
    description: 'Public holidays in Kenya',
    region: 'Kenya',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.ke%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-gh',
    displayName: 'Ghanaian Holidays',
    description: 'Public holidays in Ghana',
    region: 'Ghana',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.gh%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-et',
    displayName: 'Ethiopian Holidays',
    description: 'Public holidays in Ethiopia',
    region: 'Ethiopia',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.et%23holiday@group.v.calendar.google.com'),
  },
  {
    id: 'national-ma',
    displayName: 'Moroccan Holidays',
    description: 'Public holidays in Morocco',
    region: 'Morocco',
    category: 'National Holidays',
    icsUrl: gcalUrl('en.ma%23holiday@group.v.calendar.google.com'),
  },
] as const;
