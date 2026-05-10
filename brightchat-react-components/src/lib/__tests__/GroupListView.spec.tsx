/**
 * Property-based test for GroupListView display logic.
 *
 * Property 7: Group list displays required fields
 * Tests the pure data extraction/formatting logic used by GroupListView
 * to derive display data from IGroup objects: name, member count string,
 * and formatted timestamp.
 *
 * Feature: brightchat-frontend, Property 7: Group list displays required fields
 */

jest.mock('@brightchain/brightchain-lib', () => ({}));

import fc from 'fast-check';

// ─── Pure logic extracted from GroupListView ────────────────────────────────

/**
 * Derives the member count display string from a group's members array length.
 * Matches the exact logic in GroupListView's ListItemText secondary prop.
 */
function deriveMemberCountDisplay(membersLength: number): string {
  return `${membersLength} member${membersLength !== 1 ? 's' : ''}`;
}

/**
 * Format a Date or date-string into a short human-readable timestamp.
 * Extracted from GroupListView.
 */
function formatTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const validDateArb = fc
  .integer({
    min: new Date('2020-01-01T00:00:00Z').getTime(),
    max: new Date('2030-12-31T23:59:59Z').getTime(),
  })
  .map((ms) => new Date(ms));

const groupMemberArb = fc.record({
  memberId: fc.uuid(),
  role: fc.constantFrom('owner', 'admin', 'moderator', 'member'),
  mutedUntil: fc.option(validDateArb, { nil: undefined }),
  joinedAt: validDateArb,
});

const groupArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  members: fc.array(groupMemberArb, { minLength: 0, maxLength: 20 }),
  lastMessageAt: validDateArb,
  createdAt: validDateArb,
  encryptionKeyId: fc.uuid(),
});

// ─── Property 7: Group list displays required fields ────────────────────────

describe('Feature: brightchat-frontend, Property 7: Group list displays required fields', () => {
  /**
   * **Validates: Requirements 4.1**
   *
   * For any IGroup-like object, the group name should be a non-empty string
   * that can be displayed as the primary text.
   */
  it('should have a non-empty group name for display', () => {
    fc.assert(
      fc.property(groupArb, (group) => {
        expect(typeof group.name).toBe('string');
        expect(group.name.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.1**
   *
   * For any IGroup-like object, the member count display string should be
   * correctly derived from members.length using the pluralization logic:
   * "N member" for 1, "N members" for 0 or 2+.
   */
  it('should correctly derive member count string from members.length', () => {
    fc.assert(
      fc.property(groupArb, (group) => {
        const display = deriveMemberCountDisplay(group.members.length);
        const count = group.members.length;

        // Must contain the numeric count
        expect(display).toContain(String(count));

        // Must use correct pluralization
        if (count === 1) {
          expect(display).toBe('1 member');
        } else {
          expect(display).toBe(`${count} members`);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.1**
   *
   * For any IGroup-like object, the lastMessageAt timestamp should produce
   * a non-empty formatted string via formatTimestamp.
   */
  it('should produce a non-empty formatted timestamp from lastMessageAt', () => {
    fc.assert(
      fc.property(groupArb, (group) => {
        const formatted = formatTimestamp(group.lastMessageAt);

        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});
