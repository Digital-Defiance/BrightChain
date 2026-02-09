/**
 * RFC 5322 Email Address Interfaces and Utilities
 *
 * Provides interfaces for representing email addresses per RFC 5322 Section 3.4,
 * including individual mailboxes (addr-spec and name-addr formats) and group
 * addresses. Also provides utility functions for creating, formatting, and
 * type-guarding address objects.
 *
 * @see RFC 5322 Section 3.4 - Address Specification
 * @see RFC 5321 - Address length limits
 * @see RFC 6532 - Internationalized Email Headers (UTF-8)
 *
 * @remarks
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

/**
 * RFC 5322 mailbox representation.
 * Supports both simple addr-spec and name-addr formats.
 *
 * A mailbox represents a single email address, optionally with a display name.
 * The addr-spec is composed of localPart@domain.
 *
 * Examples:
 * - Simple: `user@example.com` (no display name)
 * - Name-addr: `John Doe <john@example.com>`
 * - Quoted local-part: `"john.doe"@example.com`
 *
 * @see RFC 5322 Section 3.4
 * @see Requirement 2.1 - Parse mailbox addresses
 * @see Requirement 2.2 - Parse addr-spec as local-part@domain
 */
export interface IMailbox {
  /** Optional display name (e.g., "John Doe") */
  displayName?: string;

  /** Local part before @ (e.g., "john.doe" or quoted "john doe") */
  localPart: string;

  /** Domain after @ (e.g., "example.com") */
  domain: string;

  /** Full addr-spec: localPart@domain (computed/readonly) */
  readonly address: string;
}

/**
 * RFC 5322 group address representation.
 *
 * A group address has a display name followed by a colon, an optional
 * list of mailboxes, and a semicolon:
 *   display-name ":" [mailbox-list] ";"
 *
 * Example: `Team: alice@example.com, bob@example.com;`
 *
 * @see RFC 5322 Section 3.4
 * @see Requirement 2.4 - Support group addresses
 */
export interface IAddressGroup {
  /** Group display name (required for groups) */
  displayName: string;

  /** Group members (can be empty for undisclosed recipients) */
  mailboxes: IMailbox[];
}

/**
 * Union type representing either a single mailbox or a group address.
 *
 * @see RFC 5322 Section 3.4
 */
export type IAddress = IMailbox | IAddressGroup;

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Creates an IMailbox object with a computed `address` property.
 *
 * @param localPart - The local part of the email address (before @)
 * @param domain - The domain of the email address (after @)
 * @param displayName - Optional display name
 * @returns A fully constructed IMailbox with computed address getter
 *
 * @example
 * ```typescript
 * const mailbox = createMailbox('john', 'example.com', 'John Doe');
 * console.log(mailbox.address); // "john@example.com"
 * console.log(mailbox.displayName); // "John Doe"
 * ```
 */
export function createMailbox(
  localPart: string,
  domain: string,
  displayName?: string,
): IMailbox {
  return {
    localPart,
    domain,
    displayName,
    get address(): string {
      return `${this.localPart}@${this.domain}`;
    },
  };
}

/**
 * Creates an IAddressGroup object.
 *
 * @param displayName - The group display name
 * @param mailboxes - Array of mailboxes in the group (defaults to empty)
 * @returns A fully constructed IAddressGroup
 *
 * @example
 * ```typescript
 * const group = createAddressGroup('Team', [
 *   createMailbox('alice', 'example.com'),
 *   createMailbox('bob', 'example.com'),
 * ]);
 * ```
 */
export function createAddressGroup(
  displayName: string,
  mailboxes: IMailbox[] = [],
): IAddressGroup {
  return {
    displayName,
    mailboxes,
  };
}

/**
 * Type guard to check if an IAddress is an IMailbox.
 *
 * Distinguishes mailboxes from groups by checking for the presence of
 * `localPart` and `domain` properties (which are unique to IMailbox).
 *
 * @param address - The address to check
 * @returns true if the address is an IMailbox
 *
 * @example
 * ```typescript
 * const addr: IAddress = createMailbox('user', 'example.com');
 * if (isMailbox(addr)) {
 *   console.log(addr.address); // "user@example.com"
 * }
 * ```
 */
export function isMailbox(address: IAddress): address is IMailbox {
  return (
    'localPart' in address &&
    'domain' in address &&
    typeof (address as IMailbox).localPart === 'string' &&
    typeof (address as IMailbox).domain === 'string'
  );
}

/**
 * Type guard to check if an IAddress is an IAddressGroup.
 *
 * Distinguishes groups from mailboxes by checking for the presence of
 * the `mailboxes` array property (which is unique to IAddressGroup).
 *
 * @param address - The address to check
 * @returns true if the address is an IAddressGroup
 *
 * @example
 * ```typescript
 * const addr: IAddress = createAddressGroup('Team', []);
 * if (isAddressGroup(addr)) {
 *   console.log(addr.displayName); // "Team"
 * }
 * ```
 */
export function isAddressGroup(address: IAddress): address is IAddressGroup {
  return (
    'mailboxes' in address &&
    Array.isArray((address as IAddressGroup).mailboxes) &&
    !('localPart' in address)
  );
}

/**
 * Formats an IMailbox as an RFC 5322 compliant string.
 *
 * If a display name is present, formats as name-addr: `"Display Name" <local@domain>`
 * Otherwise, formats as addr-spec: `local@domain`
 *
 * @param mailbox - The mailbox to format
 * @returns RFC 5322 formatted mailbox string
 *
 * @see RFC 5322 Section 3.4
 * @see Requirement 2.1
 *
 * @example
 * ```typescript
 * formatMailbox(createMailbox('john', 'example.com', 'John Doe'));
 * // => '"John Doe" <john@example.com>'
 *
 * formatMailbox(createMailbox('john', 'example.com'));
 * // => 'john@example.com'
 * ```
 */
export function formatMailbox(mailbox: IMailbox): string {
  if (mailbox.displayName) {
    // Use quoted-string for display name to handle special characters
    return `"${mailbox.displayName}" <${mailbox.address}>`;
  }
  return mailbox.address;
}

/**
 * Formats an IAddressGroup as an RFC 5322 compliant string.
 *
 * Formats as: `display-name: mailbox-list;`
 * For empty groups: `display-name:;`
 *
 * @param group - The address group to format
 * @returns RFC 5322 formatted group address string
 *
 * @see RFC 5322 Section 3.4
 * @see Requirement 2.4
 *
 * @example
 * ```typescript
 * formatAddressGroup(createAddressGroup('Team', [
 *   createMailbox('alice', 'example.com'),
 *   createMailbox('bob', 'example.com'),
 * ]));
 * // => 'Team: alice@example.com, bob@example.com;'
 * ```
 */
export function formatAddressGroup(group: IAddressGroup): string {
  if (group.mailboxes.length === 0) {
    return `${group.displayName}:;`;
  }
  const mailboxList = group.mailboxes.map(formatMailbox).join(', ');
  return `${group.displayName}: ${mailboxList};`;
}

/**
 * Formats an IAddress (either mailbox or group) as an RFC 5322 compliant string.
 *
 * @param address - The address to format
 * @returns RFC 5322 formatted address string
 *
 * @example
 * ```typescript
 * formatAddress(createMailbox('user', 'example.com'));
 * // => 'user@example.com'
 *
 * formatAddress(createAddressGroup('Team', []));
 * // => 'Team:;'
 * ```
 */
export function formatAddress(address: IAddress): string {
  if (isMailbox(address)) {
    return formatMailbox(address);
  }
  return formatAddressGroup(address as IAddressGroup);
}

/**
 * Formats an array of IAddress objects as a comma-separated RFC 5322 address list.
 *
 * @param addresses - Array of addresses to format
 * @returns Comma-separated RFC 5322 formatted address list string
 *
 * @example
 * ```typescript
 * formatAddressList([
 *   createMailbox('alice', 'example.com', 'Alice'),
 *   createMailbox('bob', 'example.com'),
 * ]);
 * // => '"Alice" <alice@example.com>, bob@example.com'
 * ```
 */
export function formatAddressList(addresses: IAddress[]): string {
  return addresses.map(formatAddress).join(', ');
}
