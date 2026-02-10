/**
 * Property-based tests for Import Parser
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate universal properties of the import parser
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
 */

import fc from 'fast-check';
import {
  CreditCardEntry,
  IdentityEntry,
  LoginEntry,
  SecureNoteEntry,
  VaultEntry,
} from '../../interfaces/brightpass';
import { ImportParser } from './importParser';

/**
 * Helper to check if entry is a LoginEntry
 */
function isLoginEntry(entry: VaultEntry): entry is LoginEntry {
  return entry.type === 'login';
}

/**
 * Helper to check if entry is a CreditCardEntry
 */
function isCreditCardEntry(entry: VaultEntry): entry is CreditCardEntry {
  return entry.type === 'credit_card';
}

/**
 * Helper to check if entry is an IdentityEntry
 */
function isIdentityEntry(entry: VaultEntry): entry is IdentityEntry {
  return entry.type === 'identity';
}

/**
 * Helper to check if entry is a SecureNoteEntry
 */
function isSecureNoteEntry(entry: VaultEntry): entry is SecureNoteEntry {
  return entry.type === 'secure_note';
}

/**
 * Helper to validate VaultEntry has required base fields
 */
function isValidVaultEntry(entry: VaultEntry): boolean {
  return (
    typeof entry.id === 'string' &&
    entry.id.length > 0 &&
    typeof entry.title === 'string' &&
    ['login', 'secure_note', 'credit_card', 'identity'].includes(entry.type) &&
    entry.createdAt instanceof Date &&
    entry.updatedAt instanceof Date &&
    typeof entry.favorite === 'boolean'
  );
}

/**
 * Arbitrary for safe string values (no special chars that break CSV/JSON/XML)
 */
const safeStringArb = fc
  .array(
    fc.constantFrom(
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '.split(
        '',
      ),
    ),
    { minLength: 1, maxLength: 20 },
  )
  .map((chars) => chars.join(''));

/**
 * Arbitrary for URL-like strings
 */
const urlArb = fc
  .tuple(
    fc.constantFrom('https://', 'http://'),
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
      minLength: 3,
      maxLength: 15,
    }),
    fc.constantFrom('.com', '.org', '.net', '.io'),
  )
  .map(([protocol, domain, tld]) => `${protocol}${domain.join('')}${tld}`);

/**
 * Arbitrary for username strings
 */
const usernameArb = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
    minLength: 3,
    maxLength: 15,
  })
  .map((chars) => chars.join(''));

/**
 * Arbitrary for password strings
 */
const passwordArb = fc
  .array(
    fc.constantFrom(
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'.split(
        '',
      ),
    ),
    { minLength: 8, maxLength: 20 },
  )
  .map((chars) => chars.join(''));

/**
 * Arbitrary for credit card numbers (13-19 digits)
 */
const cardNumberArb = fc
  .array(fc.constantFrom(...'0123456789'.split('')), {
    minLength: 13,
    maxLength: 19,
  })
  .map((chars) => chars.join(''));

/**
 * Arbitrary for names (first/last)
 */
const nameArb = fc
  .array(
    fc.constantFrom(
      ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''),
    ),
    {
      minLength: 2,
      maxLength: 15,
    },
  )
  .map((chars) => chars.join(''));

/**
 * Arbitrary for email addresses
 */
const emailArb = fc
  .tuple(usernameArb, fc.constantFrom('example.com', 'test.org', 'mail.net'))
  .map(([user, domain]) => `${user}@${domain}`);

/**
 * Generate Chrome/Firefox CSV content with login data
 */
function generateBrowserCsv(
  records: Array<{
    name: string;
    url: string;
    username: string;
    password: string;
  }>,
): string {
  const header = 'name,url,username,password';
  const rows = records.map(
    (r) => `${r.name},${r.url},${r.username},${r.password}`,
  );
  return [header, ...rows].join('\n');
}

/**
 * Generate LastPass CSV content
 */
function generateLastPassCsv(
  records: Array<{
    name: string;
    url: string;
    username: string;
    password: string;
    extra?: string;
  }>,
): string {
  const header = 'url,username,password,extra,name,grouping,fav';
  const rows = records.map(
    (r) => `${r.url},${r.username},${r.password},${r.extra || ''},${r.name},,0`,
  );
  return [header, ...rows].join('\n');
}

/**
 * Generate Bitwarden JSON content with login items
 */
function generateBitwardenJson(
  items: Array<{
    name: string;
    url: string;
    username: string;
    password: string;
  }>,
): string {
  const data = {
    items: items.map((item) => ({
      name: item.name,
      type: 1,
      login: {
        username: item.username,
        password: item.password,
        uris: [{ uri: item.url }],
      },
    })),
  };
  return JSON.stringify(data);
}

/**
 * Generate Bitwarden JSON with credit card items
 */
function generateBitwardenJsonWithCards(
  items: Array<{
    name: string;
    cardholderName: string;
    cardNumber: string;
    expMonth: string;
    expYear: string;
    cvv: string;
  }>,
): string {
  const data = {
    items: items.map((item) => ({
      name: item.name,
      type: 3,
      card: {
        cardholderName: item.cardholderName,
        number: item.cardNumber,
        expMonth: item.expMonth,
        expYear: item.expYear,
        code: item.cvv,
      },
    })),
  };
  return JSON.stringify(data);
}

/**
 * Generate Bitwarden JSON with identity items
 */
function generateBitwardenJsonWithIdentities(
  items: Array<{
    name: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  }>,
): string {
  const data = {
    items: items.map((item) => ({
      name: item.name,
      type: 4,
      identity: {
        firstName: item.firstName,
        lastName: item.lastName,
        email: item.email || '',
        phone: item.phone || '',
      },
    })),
  };
  return JSON.stringify(data);
}

/**
 * Generate Dashlane JSON content
 */
function generateDashlaneJson(
  items: Array<{
    title: string;
    domain: string;
    login: string;
    password: string;
  }>,
): string {
  const data = {
    AUTHENTIFIANT: items.map((item) => ({
      title: item.title,
      domain: item.domain,
      login: item.login,
      password: item.password,
    })),
  };
  return JSON.stringify(data);
}

/**
 * Generate 1Password 1PUX content
 */
function generate1Pux(
  items: Array<{
    title: string;
    url: string;
    username: string;
    password: string;
  }>,
): string {
  const data = {
    accounts: [
      {
        vaults: [
          {
            items: items.map((item) => ({
              overview: { title: item.title, url: item.url },
              details: {
                loginFields: [
                  { designation: 'username', value: item.username },
                  { designation: 'password', value: item.password },
                ],
              },
            })),
          },
        ],
      },
    ],
  };
  return JSON.stringify(data);
}

/**
 * Generate KeePass XML content
 */
function generateKeePassXml(
  items: Array<{
    title: string;
    url: string;
    username: string;
    password: string;
  }>,
): string {
  const entries = items
    .map(
      (item) => `
    <Entry>
      <String><Key>Title</Key><Value>${item.title}</Value></String>
      <String><Key>URL</Key><Value>${item.url}</Value></String>
      <String><Key>UserName</Key><Value>${item.username}</Value></String>
      <String><Key>Password</Key><Value>${item.password}</Value></String>
    </Entry>`,
    )
    .join('');
  return `<?xml version="1.0"?><KeePassFile><Root><Group>${entries}</Group></Root></KeePassFile>`;
}

/**
 * Arbitrary for login record data
 */
const loginRecordArb = fc.record({
  name: safeStringArb,
  url: urlArb,
  username: usernameArb,
  password: passwordArb,
});

/**
 * Arbitrary for credit card record data
 */
const creditCardRecordArb = fc.record({
  name: safeStringArb,
  cardholderName: nameArb,
  cardNumber: cardNumberArb,
  expMonth: fc
    .integer({ min: 1, max: 12 })
    .map((n) => n.toString().padStart(2, '0')),
  expYear: fc.integer({ min: 2024, max: 2035 }).map((n) => n.toString()),
  cvv: fc.integer({ min: 100, max: 9999 }).map((n) => n.toString()),
});

/**
 * Arbitrary for identity record data
 */
const identityRecordArb = fc.record({
  name: safeStringArb,
  firstName: nameArb,
  lastName: nameArb,
  email: fc.option(emailArb, { nil: undefined }),
  phone: fc.option(
    fc.integer({ min: 1000000000, max: 9999999999 }).map((n) => n.toString()),
    { nil: undefined },
  ),
});

/**
 * Property 7: Import Parser Format Coverage
 *
 * For any valid password export in CSV, JSON, XML, or 1PUX format from supported sources,
 * parsing SHALL produce a non-empty entries array with valid VaultEntry objects.
 *
 * **Validates: Requirements 4.1, 4.2**
 */
describe('Feature: api-lib-to-lib-migration, Property 7: Import Parser Format Coverage', () => {
  /**
   * Property 7a: Chrome CSV parsing produces valid VaultEntry objects
   */
  it('Property 7a: Chrome CSV parsing produces valid VaultEntry objects', () => {
    fc.assert(
      fc.property(
        fc.array(loginRecordArb, { minLength: 1, maxLength: 10 }),
        (records) => {
          const csv = generateBrowserCsv(records);
          const result = ImportParser.parse('chrome_csv', csv);

          expect(result.entries.length).toBe(records.length);
          expect(result.errors.length).toBe(0);
          result.entries.forEach((entry) => {
            expect(isValidVaultEntry(entry)).toBe(true);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7b: Firefox CSV parsing produces valid VaultEntry objects
   */
  it('Property 7b: Firefox CSV parsing produces valid VaultEntry objects', () => {
    fc.assert(
      fc.property(
        fc.array(loginRecordArb, { minLength: 1, maxLength: 10 }),
        (records) => {
          const csv = generateBrowserCsv(records);
          const result = ImportParser.parse('firefox_csv', csv);

          expect(result.entries.length).toBe(records.length);
          expect(result.errors.length).toBe(0);
          result.entries.forEach((entry) => {
            expect(isValidVaultEntry(entry)).toBe(true);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7c: LastPass CSV parsing produces valid VaultEntry objects
   */
  it('Property 7c: LastPass CSV parsing produces valid VaultEntry objects', () => {
    fc.assert(
      fc.property(
        fc.array(loginRecordArb, { minLength: 1, maxLength: 10 }),
        (records) => {
          const csv = generateLastPassCsv(records);
          const result = ImportParser.parse('lastpass_csv', csv);

          expect(result.entries.length).toBe(records.length);
          expect(result.errors.length).toBe(0);
          result.entries.forEach((entry) => {
            expect(isValidVaultEntry(entry)).toBe(true);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7d: Bitwarden JSON parsing produces valid VaultEntry objects
   */
  it('Property 7d: Bitwarden JSON parsing produces valid VaultEntry objects', () => {
    fc.assert(
      fc.property(
        fc.array(loginRecordArb, { minLength: 1, maxLength: 10 }),
        (records) => {
          const json = generateBitwardenJson(records);
          const result = ImportParser.parse('bitwarden_json', json);

          expect(result.entries.length).toBe(records.length);
          expect(result.errors.length).toBe(0);
          result.entries.forEach((entry) => {
            expect(isValidVaultEntry(entry)).toBe(true);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7e: Dashlane JSON parsing produces valid VaultEntry objects
   */
  it('Property 7e: Dashlane JSON parsing produces valid VaultEntry objects', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            title: safeStringArb,
            domain: urlArb,
            login: usernameArb,
            password: passwordArb,
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (records) => {
          const json = generateDashlaneJson(records);
          const result = ImportParser.parse('dashlane_json', json);

          expect(result.entries.length).toBe(records.length);
          expect(result.errors.length).toBe(0);
          result.entries.forEach((entry) => {
            expect(isValidVaultEntry(entry)).toBe(true);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7f: 1Password 1PUX parsing produces valid VaultEntry objects
   */
  it('Property 7f: 1Password 1PUX parsing produces valid VaultEntry objects', () => {
    fc.assert(
      fc.property(
        fc.array(loginRecordArb, { minLength: 1, maxLength: 10 }),
        (records) => {
          const pux = generate1Pux(
            records.map((r) => ({
              title: r.name,
              url: r.url,
              username: r.username,
              password: r.password,
            })),
          );
          const result = ImportParser.parse('1password_1pux', pux);

          expect(result.entries.length).toBe(records.length);
          expect(result.errors.length).toBe(0);
          result.entries.forEach((entry) => {
            expect(isValidVaultEntry(entry)).toBe(true);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7g: KeePass XML parsing produces valid VaultEntry objects
   */
  it('Property 7g: KeePass XML parsing produces valid VaultEntry objects', () => {
    fc.assert(
      fc.property(
        fc.array(loginRecordArb, { minLength: 1, maxLength: 10 }),
        (records) => {
          const xml = generateKeePassXml(
            records.map((r) => ({
              title: r.name,
              url: r.url,
              username: r.username,
              password: r.password,
            })),
          );
          const result = ImportParser.parse('keepass_xml', xml);

          expect(result.entries.length).toBe(records.length);
          expect(result.errors.length).toBe(0);
          result.entries.forEach((entry) => {
            expect(isValidVaultEntry(entry)).toBe(true);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7h: All parsed entries have unique IDs
   */
  it('Property 7h: All parsed entries have unique IDs', () => {
    fc.assert(
      fc.property(
        fc.array(loginRecordArb, { minLength: 2, maxLength: 10 }),
        (records) => {
          const csv = generateBrowserCsv(records);
          const result = ImportParser.parse('chrome_csv', csv);

          const ids = result.entries.map((e) => e.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7i: Parsed entries preserve original data
   */
  it('Property 7i: Parsed entries preserve original data', () => {
    fc.assert(
      fc.property(
        fc.array(loginRecordArb, { minLength: 1, maxLength: 5 }),
        (records) => {
          const json = generateBitwardenJson(records);
          const result = ImportParser.parse('bitwarden_json', json);

          expect(result.entries.length).toBe(records.length);
          for (let i = 0; i < records.length; i++) {
            const entry = result.entries[i];
            const original = records[i];
            if (isLoginEntry(entry)) {
              expect(entry.title).toBe(original.name);
              expect(entry.siteUrl).toBe(original.url);
              expect(entry.username).toBe(original.username);
              expect(entry.password).toBe(original.password);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 8: Import Parser Type Mapping
 *
 * For any imported record with URL/username/password fields, the result SHALL be a LoginEntry;
 * for records with card number, a CreditCardEntry; for records with firstName/lastName without
 * credentials, an IdentityEntry; otherwise a SecureNoteEntry.
 *
 * **Validates: Requirements 4.3, 4.4**
 */
describe('Feature: api-lib-to-lib-migration, Property 8: Import Parser Type Mapping', () => {
  /**
   * Property 8a: Records with URL/username/password map to LoginEntry
   */
  it('Property 8a: Records with URL/username/password map to LoginEntry', () => {
    fc.assert(
      fc.property(loginRecordArb, (record) => {
        const csv = generateBrowserCsv([record]);
        const result = ImportParser.parse('chrome_csv', csv);

        expect(result.entries.length).toBe(1);
        const entry = result.entries[0];
        expect(isLoginEntry(entry)).toBe(true);
        expect(entry.type).toBe('login');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8b: Records with card number (13+ digits) map to CreditCardEntry
   */
  it('Property 8b: Records with card number map to CreditCardEntry', () => {
    fc.assert(
      fc.property(creditCardRecordArb, (record) => {
        const json = generateBitwardenJsonWithCards([record]);
        const result = ImportParser.parse('bitwarden_json', json);

        expect(result.entries.length).toBe(1);
        const entry = result.entries[0];
        expect(isCreditCardEntry(entry)).toBe(true);
        expect(entry.type).toBe('credit_card');
        if (isCreditCardEntry(entry)) {
          expect(entry.cardNumber).toBe(record.cardNumber);
          expect(entry.cardholderName).toBe(record.cardholderName);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8c: Records with firstName/lastName without credentials map to IdentityEntry
   */
  it('Property 8c: Records with firstName/lastName without credentials map to IdentityEntry', () => {
    fc.assert(
      fc.property(identityRecordArb, (record) => {
        const json = generateBitwardenJsonWithIdentities([record]);
        const result = ImportParser.parse('bitwarden_json', json);

        expect(result.entries.length).toBe(1);
        const entry = result.entries[0];
        expect(isIdentityEntry(entry)).toBe(true);
        expect(entry.type).toBe('identity');
        if (isIdentityEntry(entry)) {
          expect(entry.firstName).toBe(record.firstName);
          expect(entry.lastName).toBe(record.lastName);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8d: Records without URL/username/password/card/identity fields map to SecureNoteEntry
   */
  it('Property 8d: Records without specific fields map to SecureNoteEntry', () => {
    fc.assert(
      fc.property(safeStringArb, (title) => {
        // Create a minimal record with only a title (no URL, username, password, card, or identity)
        const json = JSON.stringify({
          items: [
            {
              name: title,
              type: 2, // Bitwarden secure note type
              notes: 'Some secure note content',
            },
          ],
        });
        const result = ImportParser.parse('bitwarden_json', json);

        expect(result.entries.length).toBe(1);
        const entry = result.entries[0];
        expect(isSecureNoteEntry(entry)).toBe(true);
        expect(entry.type).toBe('secure_note');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8e: LoginEntry contains all required login fields
   */
  it('Property 8e: LoginEntry contains all required login fields', () => {
    fc.assert(
      fc.property(loginRecordArb, (record) => {
        const csv = generateBrowserCsv([record]);
        const result = ImportParser.parse('chrome_csv', csv);

        expect(result.entries.length).toBe(1);
        const entry = result.entries[0];
        if (isLoginEntry(entry)) {
          expect(typeof entry.siteUrl).toBe('string');
          expect(typeof entry.username).toBe('string');
          expect(typeof entry.password).toBe('string');
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8f: CreditCardEntry contains all required card fields
   */
  it('Property 8f: CreditCardEntry contains all required card fields', () => {
    fc.assert(
      fc.property(creditCardRecordArb, (record) => {
        const json = generateBitwardenJsonWithCards([record]);
        const result = ImportParser.parse('bitwarden_json', json);

        expect(result.entries.length).toBe(1);
        const entry = result.entries[0];
        if (isCreditCardEntry(entry)) {
          expect(typeof entry.cardholderName).toBe('string');
          expect(typeof entry.cardNumber).toBe('string');
          expect(typeof entry.expirationDate).toBe('string');
          expect(typeof entry.cvv).toBe('string');
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8g: IdentityEntry contains all required identity fields
   */
  it('Property 8g: IdentityEntry contains all required identity fields', () => {
    fc.assert(
      fc.property(identityRecordArb, (record) => {
        const json = generateBitwardenJsonWithIdentities([record]);
        const result = ImportParser.parse('bitwarden_json', json);

        expect(result.entries.length).toBe(1);
        const entry = result.entries[0];
        if (isIdentityEntry(entry)) {
          expect(typeof entry.firstName).toBe('string');
          expect(typeof entry.lastName).toBe('string');
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8h: SecureNoteEntry contains content field
   */
  it('Property 8h: SecureNoteEntry contains content field', () => {
    fc.assert(
      fc.property(safeStringArb, (title) => {
        const json = JSON.stringify({
          items: [
            {
              name: title,
              type: 2,
              notes: 'Test note content',
            },
          ],
        });
        const result = ImportParser.parse('bitwarden_json', json);

        expect(result.entries.length).toBe(1);
        const entry = result.entries[0];
        if (isSecureNoteEntry(entry)) {
          expect(typeof entry.content).toBe('string');
        }
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 9: Import Parser CSV Handling
 *
 * For any CSV content with quoted fields containing commas, parsing SHALL preserve
 * the complete field value without splitting on embedded commas.
 *
 * **Validates: Requirements 4.6**
 */
describe('Feature: api-lib-to-lib-migration, Property 9: Import Parser CSV Handling', () => {
  /**
   * Property 9a: Quoted fields with commas are preserved
   */
  it('Property 9a: Quoted fields with commas are preserved', () => {
    fc.assert(
      fc.property(
        safeStringArb,
        safeStringArb,
        urlArb,
        usernameArb,
        passwordArb,
        (part1, part2, url, username, password) => {
          // Create a name with a comma inside
          const nameWithComma = `${part1}, ${part2}`;
          // CSV with quoted field containing comma
          const csv = `name,url,username,password\n"${nameWithComma}",${url},${username},${password}`;
          const result = ImportParser.parse('chrome_csv', csv);

          expect(result.entries.length).toBe(1);
          expect(result.entries[0].title).toBe(nameWithComma);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9b: Multiple quoted fields with commas are all preserved
   */
  it('Property 9b: Multiple quoted fields with commas are all preserved', () => {
    fc.assert(
      fc.property(
        safeStringArb,
        safeStringArb,
        safeStringArb,
        safeStringArb,
        (part1, part2, part3, part4) => {
          const nameWithComma = `${part1}, ${part2}`;
          const notesWithComma = `${part3}, ${part4}`;
          // LastPass CSV with quoted fields
          const csv = `url,username,password,extra,name,grouping,fav\nhttps://test.com,user,pass,"${notesWithComma}","${nameWithComma}",,0`;
          const result = ImportParser.parse('lastpass_csv', csv);

          expect(result.entries.length).toBe(1);
          expect(result.entries[0].title).toBe(nameWithComma);
          if (isLoginEntry(result.entries[0])) {
            // Notes should be preserved with comma
            expect(result.entries[0].notes).toContain(part3);
            expect(result.entries[0].notes).toContain(part4);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9c: Escaped quotes inside quoted fields are handled
   */
  it('Property 9c: Escaped quotes inside quoted fields are handled', () => {
    fc.assert(
      fc.property(
        urlArb,
        usernameArb,
        passwordArb,
        (url, username, password) => {
          // Create a name with escaped quotes (double quotes inside quoted field)
          const nameWithQuote = `Test ""quoted"" text`;
          const csv = `name,url,username,password\n"${nameWithQuote}",${url},${username},${password}`;
          const result = ImportParser.parse('chrome_csv', csv);

          expect(result.entries.length).toBe(1);
          // The escaped quotes should be converted to single quotes
          // "Test ""quoted"" text" becomes "Test "quoted" text"
          expect(result.entries[0].title).toBe('Test "quoted" text');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9d: Empty quoted fields are handled correctly
   */
  it('Property 9d: Empty quoted fields are handled correctly', () => {
    fc.assert(
      fc.property(safeStringArb, urlArb, usernameArb, (name, url, username) => {
        // CSV with empty password field (quoted empty string)
        const csv = `name,url,username,password\n${name},${url},${username},""`;
        const result = ImportParser.parse('chrome_csv', csv);

        expect(result.entries.length).toBe(1);
        if (isLoginEntry(result.entries[0])) {
          expect(result.entries[0].password).toBe('');
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9e: Fields with only commas inside quotes are preserved
   */
  it('Property 9e: Fields with only commas inside quotes are preserved', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        urlArb,
        usernameArb,
        passwordArb,
        (commaCount, url, username, password) => {
          // Create a name that is just commas
          const nameWithCommas = ','.repeat(commaCount);
          const csv = `name,url,username,password\n"${nameWithCommas}",${url},${username},${password}`;
          const result = ImportParser.parse('chrome_csv', csv);

          expect(result.entries.length).toBe(1);
          expect(result.entries[0].title).toBe(nameWithCommas);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9f: Mixed quoted and unquoted fields parse correctly
   */
  it('Property 9f: Mixed quoted and unquoted fields parse correctly', () => {
    fc.assert(
      fc.property(
        safeStringArb,
        safeStringArb,
        usernameArb,
        passwordArb,
        (part1, part2, username, password) => {
          const nameWithComma = `${part1}, ${part2}`;
          // Mix of quoted (name) and unquoted (url, username, password) fields
          const csv = `name,url,username,password\n"${nameWithComma}",https://example.com,${username},${password}`;
          const result = ImportParser.parse('chrome_csv', csv);

          expect(result.entries.length).toBe(1);
          expect(result.entries[0].title).toBe(nameWithComma);
          if (isLoginEntry(result.entries[0])) {
            expect(result.entries[0].siteUrl).toBe('https://example.com');
            expect(result.entries[0].username).toBe(username);
            expect(result.entries[0].password).toBe(password);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9g: Multiple rows with quoted fields all parse correctly
   */
  it('Property 9g: Multiple rows with quoted fields all parse correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            safeStringArb,
            safeStringArb,
            urlArb,
            usernameArb,
            passwordArb,
          ),
          { minLength: 2, maxLength: 5 },
        ),
        (records) => {
          const rows = records.map(([p1, p2, url, user, pass]) => {
            const nameWithComma = `${p1}, ${p2}`;
            return `"${nameWithComma}",${url},${user},${pass}`;
          });
          const csv = `name,url,username,password\n${rows.join('\n')}`;
          const result = ImportParser.parse('chrome_csv', csv);

          expect(result.entries.length).toBe(records.length);
          for (let i = 0; i < records.length; i++) {
            const [p1, p2] = records[i];
            const expectedName = `${p1}, ${p2}`;
            expect(result.entries[i].title).toBe(expectedName);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
