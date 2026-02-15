/**
 * BrightPass Entry CRUD property tests (Properties 6-10, 13).
 * Split from brightpass.property.spec.ts to avoid ts-jest compilation hang.
 *
 * Feature: brightpass-password-manager
 */
import {
  CreditCardEntry,
  IdentityEntry,
  LoginEntry,
  SecureNoteEntry,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { EntryNotFoundError } from './brightpass';
import {
  arbitraryCreditCardEntry,
  arbitraryLoginEntry,
  arbitrarySecureNoteEntry,
  arbitraryVaultEntry,
  createServiceWithVault,
} from './brightpass.property.helpers';

describe('BrightPassService – Entry CRUD', () => {
  describe('Property 6: Entry add-retrieve round-trip', () => {
    /**
     * **Validates: Requirements 2.1, 2.2**
     */
    it('add then get returns equivalent entry', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryVaultEntry(), async (entry) => {
          const { service, vaultId } = await createServiceWithVault();

          const added = await service.addEntry(vaultId, entry);
          const retrieved = await service.getEntry(vaultId, added.id);

          expect(retrieved.id).toBe(added.id);
          expect(retrieved.type).toBe(entry.type);
          expect(retrieved.title).toBe(entry.title);
          expect(retrieved.favorite).toBe(entry.favorite);
          expect(retrieved.notes).toBe(entry.notes);

          if (entry.type === 'login') {
            const r = retrieved as LoginEntry;
            const e = entry as LoginEntry;
            expect(r.siteUrl).toBe(e.siteUrl);
            expect(r.username).toBe(e.username);
            expect(r.password).toBe(e.password);
          }
          if (entry.type === 'credit_card') {
            const r = retrieved as CreditCardEntry;
            const e = entry as CreditCardEntry;
            expect(r.cardholderName).toBe(e.cardholderName);
            expect(r.cardNumber).toBe(e.cardNumber);
            expect(r.expirationDate).toBe(e.expirationDate);
            expect(r.cvv).toBe(e.cvv);
          }
          if (entry.type === 'secure_note') {
            const r = retrieved as SecureNoteEntry;
            const e = entry as SecureNoteEntry;
            expect(r.content).toBe(e.content);
          }
          if (entry.type === 'identity') {
            const r = retrieved as IdentityEntry;
            const e = entry as IdentityEntry;
            expect(r.firstName).toBe(e.firstName);
            expect(r.lastName).toBe(e.lastName);
          }
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 7: Entry update persistence', () => {
    /**
     * **Validates: Requirements 2.3**
     */
    it('update persists new title and the property record reflects it', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryLoginEntry(),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (entry, newTitle) => {
            const { service, vaultId } = await createServiceWithVault();

            const added = await service.addEntry(vaultId, entry);
            const updated = await service.updateEntry(vaultId, added.id, {
              title: newTitle,
            });

            expect(updated.title).toBe(newTitle);
            expect(updated.id).toBe(added.id);
            expect(updated.type).toBe(entry.type);

            const retrieved = await service.getEntry(vaultId, added.id);
            expect(retrieved.title).toBe(newTitle);

            const results = await service.searchEntries(vaultId, {
              text: newTitle,
            });
            expect(results.some((r) => r.title === newTitle)).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 8: Entry deletion removes entry and shrinks arrays', () => {
    /**
     * **Validates: Requirements 2.4**
     */
    it('delete removes entry and decreases count', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryVaultEntry(),
          arbitraryVaultEntry(),
          async (entry1, entry2) => {
            const { service, vaultId, memberId, password } =
              await createServiceWithVault();

            const added1 = await service.addEntry(vaultId, entry1);
            const added2 = await service.addEntry(vaultId, entry2);

            const beforeOpen = await service.openVault(
              memberId,
              vaultId,
              password,
            );
            expect(beforeOpen.metadata.entryCount).toBe(2);
            expect(beforeOpen.propertyRecords.length).toBe(2);

            await service.deleteEntry(vaultId, added1.id);

            const afterOpen = await service.openVault(
              memberId,
              vaultId,
              password,
            );
            expect(afterOpen.metadata.entryCount).toBe(1);
            expect(afterOpen.propertyRecords.length).toBe(1);

            await expect(service.getEntry(vaultId, added1.id)).rejects.toThrow(
              EntryNotFoundError,
            );

            const remaining = await service.getEntry(vaultId, added2.id);
            expect(remaining.id).toBe(added2.id);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 10: Search returns only matching property records', () => {
    /**
     * **Validates: Requirements 2.9**
     */
    it('text search returns only records matching title or siteUrl', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbitraryLoginEntry(), { minLength: 2, maxLength: 5 }),
          async (entries) => {
            const { service, vaultId } = await createServiceWithVault();

            for (const entry of entries) {
              await service.addEntry(vaultId, entry);
            }

            const searchTitle = entries[0].title;
            const results = await service.searchEntries(vaultId, {
              text: searchTitle,
            });

            for (const record of results) {
              const titleMatch = record.title
                .toLowerCase()
                .includes(searchTitle.toLowerCase());
              const urlMatch = record.siteUrl
                .toLowerCase()
                .includes(searchTitle.toLowerCase());
              expect(titleMatch || urlMatch).toBe(true);
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    it('type filter returns only records of that type', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryLoginEntry(),
          arbitrarySecureNoteEntry(),
          async (loginEntry, noteEntry) => {
            const { service, vaultId } = await createServiceWithVault();

            await service.addEntry(vaultId, loginEntry);
            await service.addEntry(vaultId, noteEntry);

            const loginResults = await service.searchEntries(vaultId, {
              type: 'login',
            });
            expect(loginResults.every((r) => r.entryType === 'login')).toBe(
              true,
            );
            expect(loginResults.length).toBeGreaterThanOrEqual(1);

            const noteResults = await service.searchEntries(vaultId, {
              type: 'secure_note',
            });
            expect(
              noteResults.every((r) => r.entryType === 'secure_note'),
            ).toBe(true);
            expect(noteResults.length).toBeGreaterThanOrEqual(1);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('favorite filter returns only favorites', async () => {
      const { service, vaultId } = await createServiceWithVault();

      const favEntry: LoginEntry = {
        id: 'fav-1',
        type: 'login',
        title: 'Favorite Site',
        siteUrl: 'https://fav.example.com',
        username: 'user',
        password: 'pass1234',
        favorite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const nonFavEntry: LoginEntry = {
        id: 'nonfav-1',
        type: 'login',
        title: 'Non-Favorite Site',
        siteUrl: 'https://nonfav.example.com',
        username: 'user2',
        password: 'pass5678',
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await service.addEntry(vaultId, favEntry);
      await service.addEntry(vaultId, nonFavEntry);

      const favResults = await service.searchEntries(vaultId, {
        favorite: true,
      });
      expect(favResults.every((r) => r.favorite === true)).toBe(true);
      expect(favResults.length).toBe(1);
    });
  });

  describe('Property 9: Required fields preserved per entry type', () => {
    /**
     * **Validates: Requirements 2.6, 2.7, 13.5, 13.6**
     */
    it('property records contain all required fields for any entry type', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryVaultEntry(), async (entry) => {
          const { service, vaultId, memberId, password } =
            await createServiceWithVault();

          await service.addEntry(vaultId, entry);

          const opened = await service.openVault(memberId, vaultId, password);
          expect(opened.propertyRecords.length).toBe(1);

          const record = opened.propertyRecords[0];
          expect(record.entryType).toBe(entry.type);
          expect(record.title).toBe(entry.title);
          expect(Array.isArray(record.tags)).toBe(true);
          expect(typeof record.favorite).toBe('boolean');
          expect(record.createdAt).toBeInstanceOf(Date);
          expect(record.updatedAt).toBeInstanceOf(Date);
          expect(typeof record.siteUrl).toBe('string');

          if (entry.type === 'login') {
            expect(record.siteUrl).toBe((entry as LoginEntry).siteUrl);
          } else {
            expect(record.siteUrl).toBe('');
          }
        }),
        { numRuns: 50 },
      );
    });

    it('login entries preserve siteUrl, username, password', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryLoginEntry(), async (entry) => {
          const { service, vaultId } = await createServiceWithVault();

          const added = await service.addEntry(vaultId, entry);
          const retrieved = (await service.getEntry(
            vaultId,
            added.id,
          )) as LoginEntry;

          expect(retrieved.siteUrl).toBe(entry.siteUrl);
          expect(retrieved.username).toBe(entry.username);
          expect(retrieved.password).toBe(entry.password);
        }),
        { numRuns: 30 },
      );
    });

    it('credit card entries preserve card fields', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryCreditCardEntry(), async (entry) => {
          const { service, vaultId } = await createServiceWithVault();

          const added = await service.addEntry(vaultId, entry);
          const retrieved = (await service.getEntry(
            vaultId,
            added.id,
          )) as CreditCardEntry;

          expect(retrieved.cardholderName).toBe(entry.cardholderName);
          expect(retrieved.cardNumber).toBe(entry.cardNumber);
          expect(retrieved.expirationDate).toBe(entry.expirationDate);
          expect(retrieved.cvv).toBe(entry.cvv);
        }),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 13: Vault entry encryption round-trip', () => {
    /**
     * **Validates: Requirements 3.5**
     */
    it('serialize then deserialize preserves all entry data', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryVaultEntry(), async (entry) => {
          const { service, vaultId } = await createServiceWithVault();

          const added = await service.addEntry(vaultId, entry);
          const retrieved = await service.getEntry(vaultId, added.id);

          expect(retrieved.type).toBe(entry.type);
          expect(retrieved.title).toBe(entry.title);
          expect(retrieved.favorite).toBe(entry.favorite);
          expect(retrieved.notes).toBe(entry.notes);

          if (entry.tags) {
            expect(retrieved.tags).toEqual(entry.tags);
          }
        }),
        { numRuns: 50 },
      );
    });
  });
});
