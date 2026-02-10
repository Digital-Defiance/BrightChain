export type ImportFormat =
  | '1password_1pux'
  | '1password_csv'
  | 'lastpass_csv'
  | 'bitwarden_json'
  | 'bitwarden_csv'
  | 'chrome_csv'
  | 'firefox_csv'
  | 'keepass_xml'
  | 'dashlane_json';

export interface ImportResult {
  totalRecords: number;
  successfulImports: number;
  errors: Array<{ recordIndex: number; error: string }>;
}
