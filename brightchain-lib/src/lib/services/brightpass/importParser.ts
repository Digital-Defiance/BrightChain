/**
 * ImportParser — parses password manager export files into VaultEntry arrays.
 *
 * Supports CSV, JSON, XML, and 1PUX formats from major password managers.
 * Maps source fields to VaultEntry types with fallback to secure_note.
 *
 * Browser-compatible: uses ArrayBuffer | string input and TextDecoder.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CreditCardEntry,
  IdentityEntry,
  ImportFormat,
  LoginEntry,
  SecureNoteEntry,
  VaultEntry,
} from '../../interfaces/brightpass';

/** Raw parsed record before type mapping */
interface RawRecord {
  name?: string;
  title?: string;
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
  type?: string;
  // Credit card fields
  cardholderName?: string;
  cardNumber?: string;
  expirationDate?: string;
  cvv?: string;
  // Identity fields
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  // Extra fields
  totp?: string;
  favorite?: string | boolean;
  folder?: string;
  tags?: string;
  [key: string]: string | boolean | undefined;
}

export class ImportParser {
  /**
   * Convert ArrayBuffer or string content to text string.
   * Uses TextDecoder for browser compatibility.
   */
  private static contentToText(content: ArrayBuffer | string): string {
    if (typeof content === 'string') {
      return content;
    }
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(content);
  }

  /**
   * Parse a file content into VaultEntry array based on format.
   * Accepts ArrayBuffer (from FileReader) or string for browser compatibility.
   */
  static parse(
    format: ImportFormat,
    content: ArrayBuffer | string,
  ): {
    entries: VaultEntry[];
    errors: Array<{ recordIndex: number; error: string }>;
  } {
    const text = this.contentToText(content);
    let rawRecords: RawRecord[];

    switch (format) {
      case 'chrome_csv':
      case 'firefox_csv':
        rawRecords = this.parseBrowserCsv(text, format);
        break;
      case 'lastpass_csv':
        rawRecords = this.parseLastPassCsv(text);
        break;
      case '1password_csv':
      case 'bitwarden_csv':
        rawRecords = this.parseGenericCsv(text);
        break;
      case 'bitwarden_json':
        rawRecords = this.parseBitwardenJson(text);
        break;
      case 'dashlane_json':
        rawRecords = this.parseDashlaneJson(text);
        break;
      case '1password_1pux':
        rawRecords = this.parse1Pux(text);
        break;
      case 'keepass_xml':
        rawRecords = this.parseKeePassXml(text);
        break;
      default:
        rawRecords = this.parseGenericCsv(text);
    }

    return this.mapToEntries(rawRecords);
  }

  /**
   * Parse CSV text into rows. Handles quoted fields with commas (Req 4.6).
   * Quoted fields preserve their exact content including whitespace.
   * Unquoted fields are trimmed.
   */
  private static parseCsvRows(text: string): string[][] {
    const lines = text.trim().split('\n');
    const rows: string[][] = [];

    for (const line of lines) {
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      let wasQuoted = false;

      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
            // Escaped quote inside quoted field
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
            if (inQuotes) {
              wasQuoted = true;
            }
          }
        } else if (ch === ',' && !inQuotes) {
          // Only trim unquoted fields; preserve quoted field content exactly
          row.push(wasQuoted ? current : current.trim());
          current = '';
          wasQuoted = false;
        } else {
          current += ch;
        }
      }
      // Push the last field
      row.push(wasQuoted ? current : current.trim());
      rows.push(row);
    }

    return rows;
  }

  /**
   * Convert CSV rows to RawRecord array using header row.
   */
  private static csvToRecords(text: string): RawRecord[] {
    const rows = this.parseCsvRows(text);
    if (rows.length < 2) return [];

    const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    const records: RawRecord[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

      const record: RawRecord = {};
      for (let j = 0; j < headers.length && j < row.length; j++) {
        record[headers[j]] = row[j];
      }
      records.push(record);
    }

    return records;
  }

  /**
   * Parse Chrome/Firefox CSV exports (Req 4.2).
   */
  private static parseBrowserCsv(
    text: string,
    _format: ImportFormat,
  ): RawRecord[] {
    const records = this.csvToRecords(text);
    return records.map((r) => ({
      title: (r['name'] as string) || (r['title'] as string) || '',
      url: (r['url'] as string) || (r['origin_url'] as string) || '',
      username: (r['username'] as string) || '',
      password: (r['password'] as string) || '',
      notes: (r['note'] as string) || (r['notes'] as string) || '',
    }));
  }

  /**
   * Parse LastPass CSV exports (Req 4.2).
   */
  private static parseLastPassCsv(text: string): RawRecord[] {
    const records = this.csvToRecords(text);
    return records.map((r) => ({
      title: (r['name'] as string) || '',
      url: (r['url'] as string) || '',
      username: (r['username'] as string) || '',
      password: (r['password'] as string) || '',
      notes: (r['extra'] as string) || (r['notes'] as string) || '',
      folder: (r['grouping'] as string) || (r['folder'] as string) || '',
      favorite: (r['fav'] as string) || '0',
      totp: (r['totp'] as string) || '',
    }));
  }

  /**
   * Parse generic CSV format (1Password CSV, Bitwarden CSV).
   */
  private static parseGenericCsv(text: string): RawRecord[] {
    return this.csvToRecords(text);
  }

  /**
   * Parse Bitwarden JSON exports (Req 4.1, 4.2).
   */
  private static parseBitwardenJson(text: string): RawRecord[] {
    const data = JSON.parse(text);
    const items = data['items'] || data['encrypted'] || [];
    return items.map((item: Record<string, unknown>) => {
      const login = (item['login'] || {}) as Record<string, unknown>;
      const card = (item['card'] || {}) as Record<string, unknown>;
      const identity = (item['identity'] || {}) as Record<string, unknown>;
      const uris = login['uris'] as Array<Record<string, string>> | undefined;
      return {
        title: (item['name'] as string) || '',
        type: String(item['type'] ?? ''),
        url: uris?.[0]?.['uri'] || '',
        username: (login['username'] as string) || '',
        password: (login['password'] as string) || '',
        notes: (item['notes'] as string) || '',
        totp: (login['totp'] as string) || '',
        favorite: (item['favorite'] as boolean) || false,
        folder: (item['folderId'] as string) || '',
        cardholderName: (card['cardholderName'] as string) || '',
        cardNumber: (card['number'] as string) || '',
        expirationDate:
          card['expMonth'] && card['expYear']
            ? `${String(card['expMonth']).padStart(2, '0')}/${String(card['expYear']).slice(-2)}`
            : '',
        cvv: (card['code'] as string) || '',
        firstName: (identity['firstName'] as string) || '',
        lastName: (identity['lastName'] as string) || '',
        email: (identity['email'] as string) || '',
        phone: (identity['phone'] as string) || '',
        address: (identity['address1'] as string) || '',
      };
    });
  }

  /**
   * Parse Dashlane JSON exports (Req 4.2).
   */
  private static parseDashlaneJson(text: string): RawRecord[] {
    const data = JSON.parse(text);
    const items =
      data['AUTHENTIFIANT'] || data['credentials'] || data['items'] || [];
    return items.map((item: Record<string, unknown>) => ({
      title: (item['title'] as string) || (item['domain'] as string) || '',
      url: (item['domain'] as string) || (item['url'] as string) || '',
      username:
        (item['login'] as string) ||
        (item['username'] as string) ||
        (item['email'] as string) ||
        '',
      password:
        (item['password'] as string) ||
        (item['secondaryLogin'] as string) ||
        '',
      notes: (item['note'] as string) || (item['notes'] as string) || '',
    }));
  }

  /**
   * Parse 1Password 1PUX exports (Req 4.1, 4.2).
   */
  private static parse1Pux(text: string): RawRecord[] {
    const data = JSON.parse(text);
    const records: RawRecord[] = [];
    const accounts = data['accounts'] || [data];
    for (const account of accounts) {
      const vaults = account['vaults'] || [account];
      for (const vault of vaults) {
        const items = vault['items'] || [];
        for (const item of items) {
          const overview = item['overview'] || {};
          const details = item['details'] || {};
          const fields = details['loginFields'] || details['fields'] || [];
          const usernameField = fields.find(
            (f: Record<string, unknown>) =>
              f['designation'] === 'username' || f['name'] === 'username',
          );
          const passwordField = fields.find(
            (f: Record<string, unknown>) =>
              f['designation'] === 'password' || f['name'] === 'password',
          );
          records.push({
            title: (overview['title'] as string) || '',
            url: (overview['url'] as string) || '',
            username: (usernameField?.['value'] as string) || '',
            password: (passwordField?.['value'] as string) || '',
            notes: (details['notesPlain'] as string) || '',
            tags: overview['tags']?.join(',') || '',
          });
        }
      }
    }
    return records;
  }

  /**
   * Parse KeePass XML exports (Req 4.1, 4.2).
   */
  private static parseKeePassXml(text: string): RawRecord[] {
    const records: RawRecord[] = [];
    const entryRegex = /<Entry>([\s\S]*?)<\/Entry>/g;
    const stringRegex =
      /<String>\s*<Key>(.*?)<\/Key>\s*<Value[^>]*>(.*?)<\/Value>\s*<\/String>/g;

    let entryMatch: RegExpExecArray | null;
    while ((entryMatch = entryRegex.exec(text)) !== null) {
      const entryXml = entryMatch[1];
      const record: RawRecord = {};

      let stringMatch: RegExpExecArray | null;
      const localRegex = new RegExp(stringRegex.source, 'g');
      while ((stringMatch = localRegex.exec(entryXml)) !== null) {
        const key = stringMatch[1].toLowerCase();
        const value = stringMatch[2];
        switch (key) {
          case 'title':
            record.title = value;
            break;
          case 'url':
            record.url = value;
            break;
          case 'username':
            record.username = value;
            break;
          case 'password':
            record.password = value;
            break;
          case 'notes':
            record.notes = value;
            break;
        }
      }
      if (record.title || record.username || record.password) {
        records.push(record);
      }
    }
    return records;
  }

  /**
   * Map raw records to typed VaultEntry objects.
   * Determines type based on available fields, falls back to secure_note (Req 4.3, 4.4).
   * Returns both entries and errors for failed records (Req 4.5).
   */
  static mapToEntries(rawRecords: RawRecord[]): {
    entries: VaultEntry[];
    errors: Array<{ recordIndex: number; error: string }>;
  } {
    const entries: VaultEntry[] = [];
    const errors: Array<{ recordIndex: number; error: string }> = [];
    const now = new Date();

    for (let i = 0; i < rawRecords.length; i++) {
      try {
        const raw = rawRecords[i];
        const title = raw.title || raw.name || `Imported Entry ${i + 1}`;
        const isFavorite =
          raw.favorite === true ||
          raw.favorite === '1' ||
          raw.favorite === 'true';
        const tags = raw.folder ? [raw.folder] : undefined;

        const base = {
          id: uuidv4(),
          title,
          notes: raw.notes || undefined,
          tags,
          createdAt: now,
          updatedAt: now,
          favorite: isFavorite,
        };

        // Determine entry type based on available fields (Req 4.3)
        if (raw.cardNumber && raw.cardNumber.length >= 13) {
          // Credit card
          const entry: CreditCardEntry = {
            ...base,
            type: 'credit_card',
            cardholderName: raw.cardholderName || '',
            cardNumber: raw.cardNumber,
            expirationDate: raw.expirationDate || '',
            cvv: raw.cvv || '',
          };
          entries.push(entry);
        } else if (raw.firstName && raw.lastName && !raw.password && !raw.url) {
          // Identity
          const entry: IdentityEntry = {
            ...base,
            type: 'identity',
            firstName: raw.firstName,
            lastName: raw.lastName,
            email: raw.email || undefined,
            phone: raw.phone || undefined,
            address: raw.address || undefined,
          };
          entries.push(entry);
        } else if (raw.url || raw.username || raw.password) {
          // Login
          const entry: LoginEntry = {
            ...base,
            type: 'login',
            siteUrl: raw.url || '',
            username: raw.username || '',
            password: raw.password || '',
            totpSecret: raw.totp || undefined,
          };
          entries.push(entry);
        } else {
          // Fallback to secure note (Req 4.4)
          const content =
            [
              raw.notes,
              raw.username ? `Username: ${raw.username}` : '',
              raw.password ? `Password: ${raw.password}` : '',
            ]
              .filter(Boolean)
              .join('\n') || 'Imported entry';

          const entry: SecureNoteEntry = {
            ...base,
            type: 'secure_note',
            content,
          };
          entries.push(entry);
        }
      } catch (err) {
        // Capture errors for failed records (Req 4.5)
        errors.push({
          recordIndex: i,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { entries, errors };
  }
}
