import {
  CreditCardEntry,
  IdentityEntry,
  LoginEntry,
  SecureNoteEntry,
  VaultEntry,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import {
  BrightPassService,
  EmergencyAccessError,
  EntryNotFoundError,
  VaultAuthenticationError,
  VaultNotFoundError,
} from './brightpass';

// Feature: brightpass-password-manager
// Properties 1, 2, 4, 6, 7, 8, 9, 10, 13: Vault and Entry CRUD operations

// ─── Shared Arbitraries ─────────────────────────────────────────

const memberIdArb = fc.uuid();
const vaultNameArb = fc
  .string({ minLength: 1, maxLength: 64 })
  .filter((s) => s.trim().length > 0);
const masterPasswordArb = fc
  .string({ minLength: 4, maxLength: 128 })
  .filter((s) => s.trim().length > 0);

const arbitraryLoginEntry = (): fc.Arbitrary<LoginEntry> =>
  fc.record({
    id: fc.uuid(),
    type: fc.constant('login' as const),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    tags: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 }),
      { nil: undefined },
    ),
    createdAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    updatedAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    favorite: fc.boolean(),
    siteUrl: fc.webUrl(),
    username: fc.string({ minLength: 1, maxLength: 100 }),
    password: fc.string({ minLength: 8, maxLength: 128 }),
    totpSecret: fc.option(fc.base64String({ minLength: 16, maxLength: 32 }), {
      nil: undefined,
    }),
  });

const arbitrarySecureNoteEntry = (): fc.Arbitrary<SecureNoteEntry> =>
  fc.record({
    id: fc.uuid(),
    type: fc.constant('secure_note' as const),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    tags: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 }),
      { nil: undefined },
    ),
    createdAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    updatedAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    favorite: fc.boolean(),
    content: fc.string({ minLength: 1, maxLength: 500 }),
  });

const arbitraryCreditCardEntry = (): fc.Arbitrary<CreditCardEntry> =>
  fc.record({
    id: fc.uuid(),
    type: fc.constant('credit_card' as const),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    tags: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 }),
      { nil: undefined },
    ),
    createdAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    updatedAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    favorite: fc.boolean(),
    cardholderName: fc.string({ minLength: 1, maxLength: 100 }),
    cardNumber: fc.stringMatching(/^\d{13,19}$/),
    expirationDate: fc.stringMatching(/^(0[1-9]|1[0-2])\/\d{2}$/),
    cvv: fc.stringMatching(/^\d{3,4}$/),
  });

const arbitraryIdentityEntry = (): fc.Arbitrary<IdentityEntry> =>
  fc.record({
    id: fc.uuid(),
    type: fc.constant('identity' as const),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    tags: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 5 }),
      { nil: undefined },
    ),
    createdAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    updatedAt: fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-01-01'),
    }),
    favorite: fc.boolean(),
    firstName: fc.string({ minLength: 1, maxLength: 100 }),
    lastName: fc.string({ minLength: 1, maxLength: 100 }),
    email: fc.option(fc.emailAddress(), { nil: undefined }),
    phone: fc.option(fc.string({ minLength: 10, maxLength: 20 }), {
      nil: undefined,
    }),
    address: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
      nil: undefined,
    }),
  });

const arbitraryVaultEntry = (): fc.Arbitrary<VaultEntry> =>
  fc.oneof(
    arbitraryLoginEntry(),
    arbitrarySecureNoteEntry(),
    arbitraryCreditCardEntry(),
    arbitraryIdentityEntry(),
  );

/** Helper: create a service with a vault and return both */
async function createServiceWithVault() {
  const service = new BrightPassService();
  const memberId = 'test-member-' + Math.random().toString(36).slice(2);
  const password = 'test-password-123';
  const metadata = await service.createVault(memberId, 'TestVault', password);
  return { service, memberId, password, vaultId: metadata.id };
}

describe('BrightPassService', () => {
  describe('Property 1: Vault create-open round-trip', () => {
    /**
     * For any valid vault name, master password, and Member,
     * creating a vault and then opening it with the same master password
     * should return a vault with matching metadata and an empty property record array.
     *
     * **Validates: Requirements 1.1, 1.2**
     */
    it('create then open returns matching metadata and empty entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          async (memberId, vaultName, masterPassword) => {
            const service = new BrightPassService();

            const metadata = await service.createVault(
              memberId,
              vaultName,
              masterPassword,
            );

            expect(metadata.name).toBe(vaultName);
            expect(metadata.ownerId).toBe(memberId);
            expect(metadata.entryCount).toBe(0);
            expect(metadata.sharedWith).toEqual([]);
            expect(metadata.id).toBeDefined();
            expect(metadata.createdAt).toBeInstanceOf(Date);
            expect(metadata.updatedAt).toBeInstanceOf(Date);

            const opened = await service.openVault(
              memberId,
              metadata.id,
              masterPassword,
            );

            expect(opened.metadata.name).toBe(vaultName);
            expect(opened.metadata.ownerId).toBe(memberId);
            expect(opened.metadata.id).toBe(metadata.id);
            expect(opened.metadata.entryCount).toBe(0);
            expect(opened.propertyRecords).toEqual([]);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 2: Wrong master password rejection', () => {
    /**
     * For any existing vault and any master password that differs from the one
     * used at creation, attempting to open the vault should fail with an
     * authentication error.
     *
     * **Validates: Requirements 1.3**
     */
    it('rejects open with wrong master password', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          masterPasswordArb,
          async (memberId, vaultName, correctPassword, wrongPassword) => {
            fc.pre(correctPassword !== wrongPassword);

            const service = new BrightPassService();
            const metadata = await service.createVault(
              memberId,
              vaultName,
              correctPassword,
            );

            await expect(
              service.openVault(memberId, metadata.id, wrongPassword),
            ).rejects.toThrow(VaultAuthenticationError);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 3: Vault listing returns metadata for all owned vaults', () => {
    /**
     * For any Member who has created N vaults, listing vaults should return
     * exactly N metadata entries, each containing the correct identifier,
     * name, creation date, and entry count.
     *
     * **Validates: Requirements 1.4**
     */
    it('listing returns exactly N vaults with correct metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          fc.array(vaultNameArb, { minLength: 1, maxLength: 5 }),
          masterPasswordArb,
          async (memberId, vaultNames, password) => {
            // Ensure unique vault names to avoid VaultConflictError
            const uniqueVaultNames = [...new Set(vaultNames)];
            fc.pre(uniqueVaultNames.length > 0);

            const service = new BrightPassService();

            // Create N vaults
            const createdMetadata = [];
            for (const name of uniqueVaultNames) {
              const meta = await service.createVault(memberId, name, password);
              createdMetadata.push(meta);
            }

            // List vaults
            const listed = await service.listVaults(memberId);

            // Exactly N vaults returned (using unique count)
            expect(listed.length).toBe(uniqueVaultNames.length);

            // Each created vault appears in the listing with correct metadata
            for (const created of createdMetadata) {
              const found = listed.find((v) => v.id === created.id);
              expect(found).toBeDefined();
              expect(found!.name).toBe(created.name);
              expect(found!.ownerId).toBe(memberId);
              expect(found!.entryCount).toBe(0);
              expect(found!.createdAt).toBeInstanceOf(Date);
              expect(found!.updatedAt).toBeInstanceOf(Date);
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    it('listing reflects entry count after adding entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          fc.array(arbitraryLoginEntry(), { minLength: 1, maxLength: 4 }),
          async (memberId, vaultName, password, entries) => {
            const service = new BrightPassService();
            const metadata = await service.createVault(
              memberId,
              vaultName,
              password,
            );

            for (const entry of entries) {
              await service.addEntry(metadata.id, entry);
            }

            const listed = await service.listVaults(memberId);
            const found = listed.find((v) => v.id === metadata.id);
            expect(found).toBeDefined();
            expect(found!.entryCount).toBe(entries.length);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('different members see only their own vaults', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          memberIdArb,
          vaultNameArb,
          vaultNameArb,
          masterPasswordArb,
          async (memberA, memberB, nameA, nameB, password) => {
            fc.pre(memberA !== memberB);

            const service = new BrightPassService();
            const vaultA = await service.createVault(memberA, nameA, password);
            const vaultB = await service.createVault(memberB, nameB, password);

            const listA = await service.listVaults(memberA);
            const listB = await service.listVaults(memberB);

            expect(listA.length).toBe(1);
            expect(listA[0].id).toBe(vaultA.id);
            expect(listA.some((v) => v.id === vaultB.id)).toBe(false);

            expect(listB.length).toBe(1);
            expect(listB[0].id).toBe(vaultB.id);
            expect(listB.some((v) => v.id === vaultA.id)).toBe(false);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 4: Vault deletion removes all access', () => {
    /**
     * For any vault, after deletion, attempting to open or list entries
     * for that vault should fail with a not-found error.
     *
     * **Validates: Requirements 1.5**
     */
    it('deleted vault cannot be opened or found in listing', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          async (memberId, vaultName, masterPassword) => {
            const service = new BrightPassService();

            const metadata = await service.createVault(
              memberId,
              vaultName,
              masterPassword,
            );

            // Verify vault exists
            const beforeList = await service.listVaults(memberId);
            expect(beforeList.some((v) => v.id === metadata.id)).toBe(true);

            // Delete vault
            await service.deleteVault(memberId, metadata.id, masterPassword);

            // Verify vault is gone from listing
            const afterList = await service.listVaults(memberId);
            expect(afterList.some((v) => v.id === metadata.id)).toBe(false);

            // Verify open fails
            await expect(
              service.openVault(memberId, metadata.id, masterPassword),
            ).rejects.toThrow(VaultAuthenticationError);

            // Verify audit log fails
            await expect(service.getAuditLog(metadata.id)).rejects.toThrow(
              VaultNotFoundError,
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // ─── Entry CRUD Properties ─────────────────────────────────────

  describe('Property 6: Entry add-retrieve round-trip', () => {
    /**
     * For any valid VaultEntry and any unlocked vault, adding the entry
     * and then retrieving it by ID should return an equivalent VaultEntry
     * with all fields preserved.
     *
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

          // Type-specific fields
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
     * For any existing VaultEntry and any valid update, after updating
     * the entry and retrieving it, the returned entry should reflect
     * the updated values and the property record should also reflect the update.
     *
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

            // Retrieve and verify persistence
            const retrieved = await service.getEntry(vaultId, added.id);
            expect(retrieved.title).toBe(newTitle);

            // Use searchEntries to verify property record
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
     * For any existing VaultEntry in a vault, after deleting the entry,
     * the vault's entry count should decrease by one, the entry should
     * no longer be retrievable, and both arrays should shrink by one.
     *
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

            // Verify 2 entries exist
            const beforeOpen = await service.openVault(
              memberId,
              vaultId,
              password,
            );
            expect(beforeOpen.metadata.entryCount).toBe(2);
            expect(beforeOpen.propertyRecords.length).toBe(2);

            // Delete first entry
            await service.deleteEntry(vaultId, added1.id);

            // Verify count decreased
            const afterOpen = await service.openVault(
              memberId,
              vaultId,
              password,
            );
            expect(afterOpen.metadata.entryCount).toBe(1);
            expect(afterOpen.propertyRecords.length).toBe(1);

            // Verify deleted entry is not retrievable
            await expect(service.getEntry(vaultId, added1.id)).rejects.toThrow(
              EntryNotFoundError,
            );

            // Verify remaining entry is still accessible
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
     * For any vault with entries and any EntrySearchQuery, the search results
     * should contain only matching records and should not include non-matching records.
     *
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

            // Search by the first entry's title
            const searchTitle = entries[0].title;
            const results = await service.searchEntries(vaultId, {
              text: searchTitle,
            });

            // All results must match the search text in title or siteUrl
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
     * For any VaultEntry, the corresponding EntryPropertyRecord should contain
     * entryType, title, tags, favorite, createdAt, updatedAt, and siteUrl fields.
     * Login entries should have siteUrl populated; non-login entries should have empty siteUrl.
     *
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

          // Login entries should have siteUrl populated
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
     * For any valid VaultEntry object, serializing then deserializing
     * (simulating encrypt/decrypt) should produce an equivalent VaultEntry.
     *
     * **Validates: Requirements 3.5**
     */
    it('serialize then deserialize preserves all entry data', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryVaultEntry(), async (entry) => {
          const { service, vaultId } = await createServiceWithVault();

          // Add entry (serializes internally)
          const added = await service.addEntry(vaultId, entry);
          // Retrieve entry (deserializes internally)
          const retrieved = await service.getEntry(vaultId, added.id);

          // Core fields preserved
          expect(retrieved.type).toBe(entry.type);
          expect(retrieved.title).toBe(entry.title);
          expect(retrieved.favorite).toBe(entry.favorite);
          expect(retrieved.notes).toBe(entry.notes);

          // Tags preserved (accounting for undefined → undefined)
          if (entry.tags) {
            expect(retrieved.tags).toEqual(entry.tags);
          }
        }),
        { numRuns: 50 },
      );
    });
  });

  // ─── Sharing & Password Change Properties ──────────────────────

  describe('Property 14: Shared vault recipient access', () => {
    /**
     * For any vault shared with a set of Members, each recipient should be able
     * to open the vault and see the same Entry_Property_Record array as the owner.
     * The VCBL vault header's shared Member ID list should contain all recipient IDs.
     *
     * **Validates: Requirements 4.1, 4.2**
     */
    it('shared recipients can open vault and see same property records', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          fc.array(memberIdArb, { minLength: 1, maxLength: 3 }),
          async (ownerId, vaultName, password, recipientIds) => {
            // Ensure recipients are distinct from owner
            const uniqueRecipients = [...new Set(recipientIds)].filter(
              (id) => id !== ownerId,
            );
            fc.pre(uniqueRecipients.length > 0);

            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );

            // Add an entry so there's something to verify
            const entry: LoginEntry = {
              id: 'test-entry-1',
              type: 'login',
              title: 'Test Login',
              siteUrl: 'https://example.com',
              username: 'user',
              password: 'pass1234',
              favorite: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await service.addEntry(metadata.id, entry);

            // Share vault
            await service.shareVault(metadata.id, uniqueRecipients);

            // Owner can still open
            const ownerView = await service.openVault(
              ownerId,
              metadata.id,
              password,
            );
            expect(ownerView.propertyRecords.length).toBe(1);

            // Each recipient can open and sees same records
            for (const recipientId of uniqueRecipients) {
              const recipientView = await service.openVault(
                recipientId,
                metadata.id,
                password,
              );
              expect(recipientView.propertyRecords.length).toBe(
                ownerView.propertyRecords.length,
              );
              expect(recipientView.metadata.sharedWith).toContain(recipientId);
            }

            // Verify listing includes vault for recipients
            for (const recipientId of uniqueRecipients) {
              const list = await service.listVaults(recipientId);
              expect(list.some((v) => v.id === metadata.id)).toBe(true);
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 15: Share revocation denies access', () => {
    /**
     * For any shared vault, after revoking a Member's access, that Member
     * should no longer be able to open the vault, while remaining authorized
     * Members should retain access.
     *
     * **Validates: Requirements 4.3**
     */
    it('revoked member cannot open vault, remaining members can', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          memberIdArb,
          memberIdArb,
          async (ownerId, vaultName, password, recipientA, recipientB) => {
            // Ensure all IDs are distinct
            fc.pre(
              ownerId !== recipientA &&
                ownerId !== recipientB &&
                recipientA !== recipientB,
            );

            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );

            // Share with both
            await service.shareVault(metadata.id, [recipientA, recipientB]);

            // Both can open
            await service.openVault(recipientA, metadata.id, password);
            await service.openVault(recipientB, metadata.id, password);

            // Revoke recipientA
            await service.revokeShare(metadata.id, recipientA);

            // recipientA can no longer open
            await expect(
              service.openVault(recipientA, metadata.id, password),
            ).rejects.toThrow(VaultAuthenticationError);

            // recipientA no longer in listing
            const listA = await service.listVaults(recipientA);
            expect(listA.some((v) => v.id === metadata.id)).toBe(false);

            // recipientB still has access
            const viewB = await service.openVault(
              recipientB,
              metadata.id,
              password,
            );
            expect(viewB.metadata.sharedWith).not.toContain(recipientA);
            expect(viewB.metadata.sharedWith).toContain(recipientB);

            // Owner still has access
            await service.openVault(ownerId, metadata.id, password);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 16: Quorum threshold enforcement', () => {
    /**
     * For any Quorum-governed shared vault with threshold T, access should
     * be granted when T or more Members approve and denied when fewer than
     * T Members approve.
     *
     * **Validates: Requirements 4.4**
     */
    it('access denied when fewer than T approvals, granted when T or more', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          fc.array(memberIdArb, { minLength: 2, maxLength: 4 }),
          async (ownerId, vaultName, password, recipientIds) => {
            const uniqueRecipients = [...new Set(recipientIds)].filter(
              (id) => id !== ownerId,
            );
            fc.pre(uniqueRecipients.length >= 2);

            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );

            // Share with recipients
            await service.shareVault(metadata.id, uniqueRecipients);

            // Configure quorum with threshold = 2
            const threshold = 2;
            await service.configureQuorumGovernance(metadata.id, threshold);

            // No approvals — open should fail
            await expect(
              service.openVault(ownerId, metadata.id, password),
            ).rejects.toThrow(VaultAuthenticationError);

            // One approval (below threshold) — still fails
            service.approveQuorumAccess(metadata.id, ownerId);
            await expect(
              service.openVault(ownerId, metadata.id, password),
            ).rejects.toThrow(VaultAuthenticationError);

            // Second approval (meets threshold) — succeeds
            service.approveQuorumAccess(metadata.id, uniqueRecipients[0]);
            const opened = await service.openVault(
              ownerId,
              metadata.id,
              password,
            );
            expect(opened.metadata.id).toBe(metadata.id);

            // Reset and verify access is denied again
            service.resetQuorumApprovals(metadata.id);
            await expect(
              service.openVault(ownerId, metadata.id, password),
            ).rejects.toThrow(VaultAuthenticationError);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('non-member cannot approve quorum access', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          async (ownerId, nonMemberId, vaultName, password) => {
            fc.pre(ownerId !== nonMemberId);

            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );
            await service.configureQuorumGovernance(metadata.id, 1);

            expect(() =>
              service.approveQuorumAccess(metadata.id, nonMemberId),
            ).toThrow(VaultAuthenticationError);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('vault without quorum governance opens normally', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          async (memberId, vaultName, password) => {
            const service = new BrightPassService();
            const metadata = await service.createVault(
              memberId,
              vaultName,
              password,
            );

            // No quorum configured — should open without approvals
            const opened = await service.openVault(
              memberId,
              metadata.id,
              password,
            );
            expect(opened.metadata.id).toBe(metadata.id);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 12: Master password change re-keys vault', () => {
    /**
     * For any vault with entries, after changing the master password,
     * the vault should be openable with the new password and should not
     * be openable with the old password, and all entries should be preserved.
     *
     * **Validates: Requirements 3.4**
     */
    it('new password works, old password rejected, entries preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          masterPasswordArb,
          arbitraryLoginEntry(),
          async (memberId, vaultName, oldPassword, newPassword, entry) => {
            fc.pre(oldPassword !== newPassword);

            const service = new BrightPassService();
            const metadata = await service.createVault(
              memberId,
              vaultName,
              oldPassword,
            );

            // Add an entry
            const added = await service.addEntry(metadata.id, entry);

            // Change password
            await service.changeMasterPassword(
              memberId,
              metadata.id,
              oldPassword,
              newPassword,
            );

            // Old password fails
            await expect(
              service.openVault(memberId, metadata.id, oldPassword),
            ).rejects.toThrow(VaultAuthenticationError);

            // New password works
            const opened = await service.openVault(
              memberId,
              metadata.id,
              newPassword,
            );
            expect(opened.metadata.entryCount).toBe(1);
            expect(opened.propertyRecords.length).toBe(1);

            // Entry is preserved
            const retrieved = await service.getEntry(metadata.id, added.id);
            expect(retrieved.title).toBe(entry.title);
            expect(retrieved.type).toBe(entry.type);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  // ─── Emergency Access Properties ───────────────────────────────

  describe('Property 24: Shamir split-reconstruct round-trip', () => {
    /**
     * For any vault with emergency access configured with threshold T and N trustees,
     * providing T or more valid shares (obtained via getEmergencyShares) should
     * successfully recover the vault with all metadata and property records intact.
     *
     * **Validates: Requirements 10.1, 10.2, 10.3**
     */
    it('configure then recover with threshold shares succeeds', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          fc.array(memberIdArb, { minLength: 2, maxLength: 5 }),
          async (ownerId, vaultName, password, trusteeIds) => {
            const uniqueTrustees = [...new Set(trusteeIds)].filter(
              (id) => id !== ownerId,
            );
            fc.pre(uniqueTrustees.length >= 2);

            const threshold = Math.min(2, uniqueTrustees.length);
            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );

            // Add an entry so we can verify data survives recovery
            const entry: LoginEntry = {
              id: 'emergency-test-entry',
              type: 'login',
              title: 'Emergency Test',
              siteUrl: 'https://emergency.example.com',
              username: 'user',
              password: 'pass1234',
              favorite: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await service.addEntry(metadata.id, entry);

            // Configure emergency access
            const config = await service.configureEmergencyAccess(
              metadata.id,
              threshold,
              uniqueTrustees,
            );

            expect(config.threshold).toBe(threshold);
            expect(config.totalShares).toBe(uniqueTrustees.length);
            expect(config.trustees).toEqual(uniqueTrustees);

            // Get actual shares via public API
            const allShares = service.getEmergencyShares(metadata.id);
            expect(allShares.length).toBe(uniqueTrustees.length);

            // Use exactly threshold shares for recovery
            const thresholdShares = allShares.slice(0, threshold);
            const recovered = await service.recoverWithShares(
              metadata.id,
              thresholdShares,
            );

            // Verify metadata is intact
            expect(recovered.metadata.id).toBe(metadata.id);
            expect(recovered.metadata.name).toBe(vaultName);
            expect(recovered.metadata.ownerId).toBe(ownerId);

            // Verify property records are intact
            expect(recovered.propertyRecords.length).toBe(1);
            expect(recovered.propertyRecords[0].title).toBe('Emergency Test');
            expect(recovered.propertyRecords[0].entryType).toBe('login');
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 25: Sub-threshold reconstruction rejection', () => {
    /**
     * For any vault with emergency access configured with threshold T,
     * providing fewer than T valid shares should fail with an error.
     *
     * **Validates: Requirements 10.4**
     */
    it('fewer than threshold shares are rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          async (ownerId, vaultName, password) => {
            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );

            const trustees = ['trustee-1', 'trustee-2', 'trustee-3'];
            const threshold = 2;

            await service.configureEmergencyAccess(
              metadata.id,
              threshold,
              trustees,
            );

            // Get real shares
            const allShares = service.getEmergencyShares(metadata.id);

            // Zero shares should fail
            await expect(
              service.recoverWithShares(metadata.id, []),
            ).rejects.toThrow(EmergencyAccessError);

            // One share (below threshold of 2) should fail
            await expect(
              service.recoverWithShares(metadata.id, allShares.slice(0, 1)),
            ).rejects.toThrow(EmergencyAccessError);

            // Threshold shares should succeed (sanity check)
            const recovered = await service.recoverWithShares(
              metadata.id,
              allShares.slice(0, threshold),
            );
            expect(recovered.metadata.id).toBe(metadata.id);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 26: Emergency access revocation invalidates shares', () => {
    /**
     * For any vault with emergency access configured, after revoking
     * emergency access, attempting to recover with previously valid
     * shares should fail.
     *
     * **Validates: Requirements 10.5**
     */
    it('revoked emergency access rejects recovery attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          async (ownerId, vaultName, password) => {
            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );

            const trustees = ['trustee-a', 'trustee-b'];
            const threshold = 2;
            await service.configureEmergencyAccess(
              metadata.id,
              threshold,
              trustees,
            );

            // Get valid shares before revocation
            const validShares = service.getEmergencyShares(metadata.id);

            // Verify shares work before revocation
            const beforeRevoke = await service.recoverWithShares(
              metadata.id,
              validShares,
            );
            expect(beforeRevoke.metadata.id).toBe(metadata.id);

            // Revoke emergency access
            await service.revokeEmergencyAccess(metadata.id);

            // Recovery with previously valid shares should now fail
            await expect(
              service.recoverWithShares(metadata.id, validShares),
            ).rejects.toThrow(EmergencyAccessError);

            // getEmergencyShares should also fail
            expect(() => service.getEmergencyShares(metadata.id)).toThrow(
              EmergencyAccessError,
            );
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
