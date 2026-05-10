/**
 * Holiday feed entry DTO — a single record in the Holiday Catalog
 * containing a display name, description, region/category tag, and ICS feed URL.
 * @see Requirements 10.1
 */
export interface IHolidayFeedEntry {
  id: string;
  displayName: string;
  description: string;
  region: string;
  category: string;
  icsUrl: string;
}
