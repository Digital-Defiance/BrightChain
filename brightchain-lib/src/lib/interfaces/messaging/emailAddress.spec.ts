import { describe, expect, it } from '@jest/globals';
import {
  IAddress,
  IAddressGroup,
  IMailbox,
  createAddressGroup,
  createMailbox,
  formatAddress,
  formatAddressGroup,
  formatAddressList,
  formatMailbox,
  isAddressGroup,
  isMailbox,
} from './emailAddress';

describe('emailAddress interfaces and utilities', () => {
  // ─── createMailbox ──────────────────────────────────────────────────────

  describe('createMailbox', () => {
    it('should create a mailbox with localPart and domain', () => {
      const mailbox = createMailbox('john', 'example.com');
      expect(mailbox.localPart).toBe('john');
      expect(mailbox.domain).toBe('example.com');
      expect(mailbox.displayName).toBeUndefined();
    });

    it('should compute the address property as localPart@domain', () => {
      const mailbox = createMailbox('john', 'example.com');
      expect(mailbox.address).toBe('john@example.com');
    });

    it('should include displayName when provided', () => {
      const mailbox = createMailbox('john', 'example.com', 'John Doe');
      expect(mailbox.displayName).toBe('John Doe');
      expect(mailbox.address).toBe('john@example.com');
    });

    it('should handle quoted local-parts with special characters', () => {
      const mailbox = createMailbox('"john.doe+tag"', 'example.com');
      expect(mailbox.localPart).toBe('"john.doe+tag"');
      expect(mailbox.address).toBe('"john.doe+tag"@example.com');
    });

    it('should handle subdomains in domain', () => {
      const mailbox = createMailbox('user', 'mail.sub.example.com');
      expect(mailbox.domain).toBe('mail.sub.example.com');
      expect(mailbox.address).toBe('user@mail.sub.example.com');
    });

    it('should reflect changes if localPart or domain are mutated', () => {
      const mailbox = createMailbox('old', 'old.com');
      expect(mailbox.address).toBe('old@old.com');
      // The address getter reads from current localPart/domain
      mailbox.localPart = 'new';
      mailbox.domain = 'new.com';
      expect(mailbox.address).toBe('new@new.com');
    });
  });

  // ─── createAddressGroup ─────────────────────────────────────────────────

  describe('createAddressGroup', () => {
    it('should create a group with displayName and mailboxes', () => {
      const members = [
        createMailbox('alice', 'example.com'),
        createMailbox('bob', 'example.com'),
      ];
      const group = createAddressGroup('Team', members);
      expect(group.displayName).toBe('Team');
      expect(group.mailboxes).toHaveLength(2);
    });

    it('should default to empty mailboxes array when not provided', () => {
      const group = createAddressGroup('Undisclosed Recipients');
      expect(group.displayName).toBe('Undisclosed Recipients');
      expect(group.mailboxes).toHaveLength(0);
    });

    it('should support empty group (undisclosed recipients pattern)', () => {
      const group = createAddressGroup('undisclosed-recipients', []);
      expect(group.mailboxes).toEqual([]);
    });
  });

  // ─── isMailbox ──────────────────────────────────────────────────────────

  describe('isMailbox', () => {
    it('should return true for a mailbox', () => {
      const mailbox = createMailbox('user', 'example.com');
      expect(isMailbox(mailbox)).toBe(true);
    });

    it('should return true for a mailbox with displayName', () => {
      const mailbox = createMailbox('user', 'example.com', 'User Name');
      expect(isMailbox(mailbox)).toBe(true);
    });

    it('should return false for an address group', () => {
      const group = createAddressGroup('Team', []);
      expect(isMailbox(group)).toBe(false);
    });
  });

  // ─── isAddressGroup ─────────────────────────────────────────────────────

  describe('isAddressGroup', () => {
    it('should return true for an address group', () => {
      const group = createAddressGroup('Team', []);
      expect(isAddressGroup(group)).toBe(true);
    });

    it('should return true for a group with members', () => {
      const group = createAddressGroup('Team', [
        createMailbox('alice', 'example.com'),
      ]);
      expect(isAddressGroup(group)).toBe(true);
    });

    it('should return false for a mailbox', () => {
      const mailbox = createMailbox('user', 'example.com');
      expect(isAddressGroup(mailbox)).toBe(false);
    });
  });

  // ─── Type guard mutual exclusivity ──────────────────────────────────────

  describe('type guard mutual exclusivity', () => {
    it('should identify mailbox as mailbox and not group', () => {
      const addr: IAddress = createMailbox('user', 'example.com');
      expect(isMailbox(addr)).toBe(true);
      expect(isAddressGroup(addr)).toBe(false);
    });

    it('should identify group as group and not mailbox', () => {
      const addr: IAddress = createAddressGroup('Team', []);
      expect(isMailbox(addr)).toBe(false);
      expect(isAddressGroup(addr)).toBe(true);
    });
  });

  // ─── formatMailbox ──────────────────────────────────────────────────────

  describe('formatMailbox', () => {
    it('should format a simple mailbox as addr-spec', () => {
      const mailbox = createMailbox('user', 'example.com');
      expect(formatMailbox(mailbox)).toBe('user@example.com');
    });

    it('should format a mailbox with displayName as name-addr', () => {
      const mailbox = createMailbox('john', 'example.com', 'John Doe');
      expect(formatMailbox(mailbox)).toBe('"John Doe" <john@example.com>');
    });

    it('should handle displayName with special characters', () => {
      const mailbox = createMailbox('user', 'example.com', "O'Brien, James");
      expect(formatMailbox(mailbox)).toBe(
        '"O\'Brien, James" <user@example.com>',
      );
    });

    it('should handle empty string displayName as no display name', () => {
      const mailbox = createMailbox('user', 'example.com', '');
      // Empty string is falsy, so should format as addr-spec
      expect(formatMailbox(mailbox)).toBe('user@example.com');
    });
  });

  // ─── formatAddressGroup ─────────────────────────────────────────────────

  describe('formatAddressGroup', () => {
    it('should format an empty group', () => {
      const group = createAddressGroup('undisclosed-recipients');
      expect(formatAddressGroup(group)).toBe('undisclosed-recipients:;');
    });

    it('should format a group with one member', () => {
      const group = createAddressGroup('Team', [
        createMailbox('alice', 'example.com'),
      ]);
      expect(formatAddressGroup(group)).toBe('Team: alice@example.com;');
    });

    it('should format a group with multiple members', () => {
      const group = createAddressGroup('Team', [
        createMailbox('alice', 'example.com'),
        createMailbox('bob', 'example.com', 'Bob Smith'),
      ]);
      expect(formatAddressGroup(group)).toBe(
        'Team: alice@example.com, "Bob Smith" <bob@example.com>;',
      );
    });
  });

  // ─── formatAddress ──────────────────────────────────────────────────────

  describe('formatAddress', () => {
    it('should format a mailbox address', () => {
      const addr: IAddress = createMailbox('user', 'example.com');
      expect(formatAddress(addr)).toBe('user@example.com');
    });

    it('should format a group address', () => {
      const addr: IAddress = createAddressGroup('Team', [
        createMailbox('alice', 'example.com'),
      ]);
      expect(formatAddress(addr)).toBe('Team: alice@example.com;');
    });
  });

  // ─── formatAddressList ──────────────────────────────────────────────────

  describe('formatAddressList', () => {
    it('should format an empty list', () => {
      expect(formatAddressList([])).toBe('');
    });

    it('should format a single mailbox', () => {
      const list: IAddress[] = [createMailbox('user', 'example.com')];
      expect(formatAddressList(list)).toBe('user@example.com');
    });

    it('should format multiple mailboxes separated by commas', () => {
      const list: IAddress[] = [
        createMailbox('alice', 'example.com', 'Alice'),
        createMailbox('bob', 'example.com'),
      ];
      expect(formatAddressList(list)).toBe(
        '"Alice" <alice@example.com>, bob@example.com',
      );
    });

    it('should format a mixed list of mailboxes and groups', () => {
      const list: IAddress[] = [
        createMailbox('alice', 'example.com'),
        createAddressGroup('Team', [
          createMailbox('bob', 'example.com'),
          createMailbox('charlie', 'example.com'),
        ]),
      ];
      expect(formatAddressList(list)).toBe(
        'alice@example.com, Team: bob@example.com, charlie@example.com;',
      );
    });
  });

  // ─── IMailbox interface conformance ─────────────────────────────────────

  describe('IMailbox interface conformance', () => {
    it('should satisfy IMailbox with a plain object using getter', () => {
      const mailbox: IMailbox = {
        localPart: 'test',
        domain: 'example.com',
        get address(): string {
          return `${this.localPart}@${this.domain}`;
        },
      };
      expect(mailbox.address).toBe('test@example.com');
    });

    it('should allow displayName to be undefined', () => {
      const mailbox: IMailbox = {
        localPart: 'test',
        domain: 'example.com',
        get address(): string {
          return `${this.localPart}@${this.domain}`;
        },
      };
      expect(mailbox.displayName).toBeUndefined();
    });
  });

  // ─── IAddressGroup interface conformance ────────────────────────────────

  describe('IAddressGroup interface conformance', () => {
    it('should satisfy IAddressGroup with required fields', () => {
      const group: IAddressGroup = {
        displayName: 'My Group',
        mailboxes: [],
      };
      expect(group.displayName).toBe('My Group');
      expect(group.mailboxes).toEqual([]);
    });
  });
});
