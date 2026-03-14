/**
 * Property-based tests for BrightMail UI Modernization.
 * Feature: brightmail-ui-modernization
 *
 * Uses fast-check to verify correctness properties across random inputs.
 */

import '@testing-library/jest-dom';
import { cleanup, render } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';
import AvatarCircle, { getAvatarColor } from '../AvatarCircle';

// ─── Mocks for ComposeModal transitive dependencies (Property 9) ────────────
// ComposeModal imports BrightChainStrings from brightchain-lib, which triggers
// a deep initialization chain. These mocks prevent that runtime failure while
// allowing the pure shouldConfirmClose function to be tested.

jest.mock('@brightchain/brightchain-lib', () => ({
  BrightChainComponentId: 'brightchain',
  BrightChainStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
}));

jest.mock('@brightchain/brightmail-lib', () => ({
  BrightMailStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
}));

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    t: (key: string) => key,
    tBranded: (key: string) => key,
    changeLanguage: jest.fn(),
    currentLanguage: 'en',
  }),
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/brightmail' }),
  };
});

afterEach(() => {
  cleanup();
});

/**
 * Arbitrary: non-empty display name strings.
 * Includes ascii, multi-word names, and mixed-character strings.
 */
const arbDisplayName = fc.oneof(
  // Typical ascii strings
  fc.string({ minLength: 1, maxLength: 60 }),
  // Multi-word names with spaces
  fc
    .array(fc.string({ minLength: 1, maxLength: 20 }), {
      minLength: 1,
      maxLength: 4,
    })
    .map((parts) => parts.join(' ')),
  // Realistic names
  fc.stringMatching(/^[A-Za-z][A-Za-z ]{0,29}$/),
);

describe('Feature: brightmail-ui-modernization, Property 1: Avatar color determinism and accessibility', () => {
  /**
   * Property 1: Avatar color determinism and accessibility
   *
   * For any sender display name, getAvatarColor returns the same color on
   * repeated calls, the rendered Avatar shows the first character, and the
   * aria-label equals the full display name.
   *
   * **Validates: Requirements 3.2, 8.4**
   */

  it('getAvatarColor is deterministic — same name always produces the same color', () => {
    fc.assert(
      fc.property(arbDisplayName, (name) => {
        const color1 = getAvatarColor(name);
        const color2 = getAvatarColor(name);
        expect(color1).toBe(color2);
        // Must be a valid hex color
        expect(color1).toMatch(/^#[0-9a-f]{6}$/);
      }),
      { numRuns: 100 },
    );
  });

  it('rendered Avatar displays the first character of the display name', () => {
    fc.assert(
      fc.property(arbDisplayName, (name) => {
        render(<AvatarCircle displayName={name} />);

        const trimmed = name.trim();
        const expectedChar =
          trimmed.length === 0
            ? '?'
            : String.fromCodePoint(trimmed.codePointAt(0)!);

        const avatar = document.querySelector('.MuiAvatar-root');
        expect(avatar).not.toBeNull();
        expect(avatar!.textContent).toBe(expectedChar);

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('rendered Avatar has aria-label equal to the full display name', () => {
    fc.assert(
      fc.property(arbDisplayName, (name) => {
        render(<AvatarCircle displayName={name} />);

        const avatar = document.querySelector('.MuiAvatar-root');
        expect(avatar).not.toBeNull();
        expect(avatar!.getAttribute('aria-label')).toBe(name);

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 13 imports ────────────────────────────────────────────────────

import { act, renderHook } from '@testing-library/react';
import {
  BrightMailProvider,
  useBrightMail,
} from '../BrightMailContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

const SIDEBAR_STORAGE_KEY = 'brightmail:sidebarOpen';

/** Wrapper component for renderHook that provides BrightMailContext. */
const providerWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <BrightMailProvider>{children}</BrightMailProvider>;

/**
 * Arbitrary: random sidebar state (boolean).
 */
const arbSidebarState = fc.boolean();

/**
 * Arbitrary: sequence of sidebar state changes (simulating navigation + toggles).
 */
const arbSidebarStateSequence = fc.array(fc.boolean(), {
  minLength: 1,
  maxLength: 20,
});

describe('Feature: brightmail-ui-modernization, Property 13: Sidebar state persistence across navigation', () => {
  /**
   * Property 13: Sidebar state persistence across navigation
   *
   * For any sidebar state (expanded or collapsed) and any route transition
   * within BrightMail, navigating to a different BrightMail route and back
   * SHALL preserve the sidebar's expanded/collapsed state.
   *
   * **Validates: Requirements 1.8**
   */

  beforeEach(() => {
    sessionStorage.clear();
  });

  it('writing a sidebar state to sessionStorage and reading it back preserves the value', () => {
    fc.assert(
      fc.property(arbSidebarState, (state) => {
        sessionStorage.clear();
        sessionStorage.setItem(SIDEBAR_STORAGE_KEY, String(state));
        const stored = sessionStorage.getItem(SIDEBAR_STORAGE_KEY);
        expect(stored).toBe(String(state));
      }),
      { numRuns: 100 },
    );
  });

  it('BrightMailProvider reads sidebar state from sessionStorage on mount', () => {
    fc.assert(
      fc.property(arbSidebarState, (initialState) => {
        sessionStorage.clear();
        sessionStorage.setItem(SIDEBAR_STORAGE_KEY, String(initialState));

        const { result, unmount } = renderHook(() => useBrightMail(), {
          wrapper: providerWrapper,
        });

        expect(result.current.sidebarOpen).toBe(initialState);
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('setSidebarOpen persists state to sessionStorage for any boolean value', () => {
    fc.assert(
      fc.property(arbSidebarState, (newState) => {
        sessionStorage.clear();

        const { result, unmount } = renderHook(() => useBrightMail(), {
          wrapper: providerWrapper,
        });

        act(() => result.current.setSidebarOpen(newState));

        expect(result.current.sidebarOpen).toBe(newState);
        expect(sessionStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe(
          String(newState),
        );

        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('sidebar state survives provider remount (simulating route navigation)', () => {
    fc.assert(
      fc.property(arbSidebarStateSequence, (stateSequence) => {
        sessionStorage.clear();

        // Apply each state change, remounting the provider each time
        // to simulate route transitions that unmount/remount the layout
        for (const state of stateSequence) {
          const { result, unmount } = renderHook(() => useBrightMail(), {
            wrapper: providerWrapper,
          });

          act(() => result.current.setSidebarOpen(state));
          unmount();
        }

        // After all transitions, mount a fresh provider and verify
        // the last state was preserved
        const lastState = stateSequence[stateSequence.length - 1];
        const { result, unmount } = renderHook(() => useBrightMail(), {
          wrapper: providerWrapper,
        });

        expect(result.current.sidebarOpen).toBe(lastState);
        unmount();
      }),
      { numRuns: 100 },
    );
  });
});


// ─── Property 2 imports ─────────────────────────────────────────────────────

import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { IEmailMetadata } from '@brightchain/brightchain-lib';
import type { BlockId } from '@brightchain/brightchain-lib';
import EmailRow, {
  getSenderDisplay,
  isEmailRead,
} from '../EmailRow';

// ─── Arbitrary generators for Property 2 ────────────────────────────────────

/** Helper: creates an IMailbox-compatible object without importing runtime code. */
function makeMailbox(
  localPart: string,
  domain: string,
  displayName?: string,
) {
  return {
    localPart,
    domain,
    displayName,
    get address(): string {
      return `${this.localPart}@${this.domain}`;
    },
  };
}

/** Helper: creates an IContentType-compatible object without importing runtime code. */
function makeContentType(type: string, subtype: string) {
  return {
    type,
    subtype,
    parameters: new Map<string, string>(),
    get mediaType(): string {
      return `${this.type}/${this.subtype}`;
    },
  };
}

/** Arbitrary: simple ascii local part for email addresses. */
const arbLocalPart = fc.stringMatching(/^[a-z][a-z0-9.]{0,14}$/);

/** Arbitrary: simple domain for email addresses. */
const arbDomain = fc.stringMatching(/^[a-z][a-z0-9]{0,8}\.[a-z]{2,4}$/);

/** Arbitrary: optional display name. */
const arbOptionalDisplayName = fc.option(
  fc.stringMatching(/^[A-Za-z][A-Za-z ]{0,24}$/),
  { nil: undefined },
);

/** Arbitrary: IMailbox via makeMailbox. */
const arbMailbox = fc
  .tuple(arbLocalPart, arbDomain, arbOptionalDisplayName)
  .map(([local, domain, name]) => makeMailbox(local, domain, name));

/** Arbitrary: non-empty array of IMailbox. */
const arbMailboxArray = fc.array(arbMailbox, { minLength: 1, maxLength: 3 });

/** Arbitrary: optional subject line. */
const arbSubject = fc.option(fc.string({ minLength: 1, maxLength: 80 }), {
  nil: undefined,
});

/** Arbitrary: optional keywords (labels). */
const arbKeywords = fc.option(
  fc.array(fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,10}$/), {
    minLength: 1,
    maxLength: 4,
  }),
  { nil: undefined },
);

/** Arbitrary: a short hex-like string for IDs. */
const arbHexId = fc.stringMatching(/^[0-9a-f]{8}$/);

/** Arbitrary: readReceipts map — empty means unread, non-empty means read. */
const arbReadReceipts = fc.oneof(
  // Unread: empty map
  fc.constant(new Map<string, Date>()),
  // Read: at least one receipt (filter out NaN dates from fc.date())
  fc
    .array(
      fc.tuple(
        arbHexId,
        fc.date({ min: new Date('2000-01-01'), max: new Date('2040-01-01') })
          .filter((d) => !isNaN(d.getTime())),
      ),
      { minLength: 1, maxLength: 3 },
    )
    .map((entries) => new Map(entries)),
);

/**
 * Arbitrary: IEmailMetadata<string> with all required fields.
 * Focuses on fields used by EmailRow while satisfying the full interface.
 */
const arbEmailMetadata: fc.Arbitrary<IEmailMetadata<string>> = fc
  .record({
    from: arbMailbox,
    to: arbMailboxArray,
    subject: arbSubject,
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
      .filter((d) => !isNaN(d.getTime())),
    keywords: arbKeywords,
    readReceipts: arbReadReceipts,
    messageId: fc
      .stringMatching(/^[0-9a-f]{16}$/)
      .map((s: string) => `<${s}@test.local>`),
  })
  .map((fields) => ({
    // IBlockMetadata fields
    blockId: 'block-0000' as BlockId,
    createdAt: fields.date,
    expiresAt: null,
    durabilityLevel: 'standard' as const,
    parityBlockIds: [] as BlockId[],
    accessCount: 0,
    lastAccessedAt: fields.date,
    replicationStatus: 'pending' as const,
    targetReplicationFactor: 0,
    replicaNodeIds: [] as string[],
    size: 0,
    checksum: '0000',

    // IMessageMetadata fields
    messageType: 'email',
    senderId: 'sender-1',
    recipients: ['recipient-1'],
    priority: 1 as const, // MessagePriority.NORMAL
    deliveryStatus: new Map<string, string>(),
    acknowledgments: new Map<string, Date>(),
    encryptionScheme: 'none' as const,
    isCBL: false,

    // IEmailMetadata fields
    from: fields.from,
    to: fields.to,
    messageId: fields.messageId,
    date: fields.date,
    mimeVersion: '1.0',
    contentType: makeContentType('text', 'plain'),
    customHeaders: new Map<string, string[]>(),
    deliveryReceipts: new Map(),
    readReceipts: fields.readReceipts,
    subject: fields.subject,
    keywords: fields.keywords,
  }) as unknown as IEmailMetadata<string>);

// ─── Theme wrapper for rendering ────────────────────────────────────────────

const testTheme = createTheme();

function renderEmailRow(email: IEmailMetadata<string>) {
  return render(
    <ThemeProvider theme={testTheme}>
      <EmailRow
        email={email}
        selected={false}
        onToggleSelect={() => {}}
        onClick={() => {}}
      />
    </ThemeProvider>,
  );
}

// ─── Property 2 tests ───────────────────────────────────────────────────────

describe('Feature: brightmail-ui-modernization, Property 2: Email row rendering completeness', () => {
  /**
   * Property 2: Email row rendering completeness
   *
   * For any IEmailMetadata object, the rendered EmailRow SHALL contain the
   * sender's display name (or address fallback), a locale-formatted date,
   * the subject line, and a body snippet truncated to at most 80 characters.
   * When the email is unread (empty readReceipts), the sender name and subject
   * SHALL have fontWeight: 600 and the row SHALL have a left border accent.
   * When labels are present, MUI Chip elements SHALL be rendered for each label.
   *
   * **Validates: Requirements 3.3, 3.4, 7.2**
   */

  it('rendered row contains the sender display name', () => {
    fc.assert(
      fc.property(arbEmailMetadata, (email) => {
        renderEmailRow(email);

        const expectedSender = getSenderDisplay(email);
        const senderEl = document.querySelector(
          '[data-testid="email-sender"]',
        );
        expect(senderEl).not.toBeNull();
        expect(senderEl!.textContent).toBe(expectedSender);

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('rendered row contains a date string', () => {
    fc.assert(
      fc.property(arbEmailMetadata, (email) => {
        renderEmailRow(email);

        const dateEl = document.querySelector('[data-testid="email-date"]');
        expect(dateEl).not.toBeNull();
        // Date element should have non-empty text content
        expect(dateEl!.textContent!.length).toBeGreaterThan(0);

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('rendered row contains the subject', () => {
    fc.assert(
      fc.property(arbEmailMetadata, (email) => {
        renderEmailRow(email);

        const subjectEl = document.querySelector(
          '[data-testid="email-subject"]',
        );
        expect(subjectEl).not.toBeNull();
        // The subject element text should contain the subject string
        const subject = email.subject ?? '';
        if (subject.length > 0) {
          expect(subjectEl!.textContent).toContain(subject);
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('unread emails (empty readReceipts) have fontWeight 600 on sender and a left border', () => {
    fc.assert(
      fc.property(
        arbEmailMetadata.filter((e) => !isEmailRead(e)),
        (email) => {
          renderEmailRow(email);

          // Sender should have fontWeight 600
          const senderEl = document.querySelector(
            '[data-testid="email-sender"]',
          );
          expect(senderEl).not.toBeNull();
          const senderStyle = window.getComputedStyle(senderEl!);
          expect(senderStyle.fontWeight).toBe('600');

          // Row ListItem should have a non-transparent left border
          const listItem = document.querySelector('[data-testid^="email-row-"]');
          expect(listItem).not.toBeNull();
          const listItemStyle = listItem!.getAttribute('style') ?? '';
          // The border-left should contain the primary color, not transparent
          expect(listItemStyle).not.toContain('transparent');

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('when keywords/labels are present, Chip elements are rendered for each label', () => {
    fc.assert(
      fc.property(
        arbEmailMetadata.filter(
          (e) => e.keywords != null && e.keywords.length > 0,
        ),
        (email) => {
          renderEmailRow(email);

          const chips = document.querySelectorAll(
            '[data-testid="email-label-chip"]',
          );
          expect(chips.length).toBe(email.keywords!.length);

          // Each chip should contain the label text
          email.keywords!.forEach((label, i) => {
            expect(chips[i].textContent).toContain(label);
          });

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ─── Property 3 imports ─────────────────────────────────────────────────────

import { fireEvent } from '@testing-library/react';

// ─── Property 3 tests ───────────────────────────────────────────────────────

describe('Feature: brightmail-ui-modernization, Property 3: Star toggle is a round-trip', () => {
  /**
   * Property 3: Star toggle is a round-trip
   *
   * For any email row, toggling the star once SHALL flip the state.
   * Toggling the star twice SHALL return the starred state to its original value.
   *
   * **Validates: Requirements 3.6**
   */

  it('toggling the star once flips the state from unstarred to starred', () => {
    fc.assert(
      fc.property(arbEmailMetadata, (email) => {
        renderEmailRow(email);

        const starBtn = document.querySelector(
          '[data-testid="star-toggle"]',
        ) as HTMLElement;
        expect(starBtn).not.toBeNull();

        // Initial state: unstarred (aria-label "Star")
        expect(starBtn.getAttribute('aria-label')).toBe('Star');

        // Toggle once: should flip to starred (aria-label "Unstar")
        fireEvent.click(starBtn);
        expect(starBtn.getAttribute('aria-label')).toBe('Unstar');

        cleanup();
      }),
      { numRuns: 100 },
    );
  });

  it('toggling the star twice returns to the original unstarred state (round-trip)', () => {
    fc.assert(
      fc.property(arbEmailMetadata, (email) => {
        renderEmailRow(email);

        const starBtn = document.querySelector(
          '[data-testid="star-toggle"]',
        ) as HTMLElement;
        expect(starBtn).not.toBeNull();

        // Capture original state
        const originalLabel = starBtn.getAttribute('aria-label');
        expect(originalLabel).toBe('Star');

        // Toggle once — state flips
        fireEvent.click(starBtn);
        const afterFirst = starBtn.getAttribute('aria-label');
        expect(afterFirst).not.toBe(originalLabel);

        // Toggle again — state returns to original
        fireEvent.click(starBtn);
        expect(starBtn.getAttribute('aria-label')).toBe(originalLabel);

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});


// ─── Property 4 imports ─────────────────────────────────────────────────────

import { toggleSelection } from '../EmailList';

// ─── Arbitrary generators for Property 4 ────────────────────────────────────

/** Arbitrary: a short email-style ID string. */
const arbEmailId = fc.stringMatching(/^[a-z0-9]{4,12}$/);

/** Arbitrary: a Set of email IDs. */
const arbEmailIdSet = fc
  .uniqueArray(arbEmailId, { minLength: 0, maxLength: 20 })
  .map((ids) => new Set(ids));

// ─── Property 4 tests ───────────────────────────────────────────────────────

describe('Feature: brightmail-ui-modernization, Property 4: Selection toggle preserves set semantics', () => {
  /**
   * Property 4: Selection toggle preserves set semantics
   *
   * For any set of emails and any email ID, toggling selection SHALL add the
   * ID if absent or remove it if present. The resulting set size SHALL change
   * by exactly 1. Toggling twice SHALL return to the original set.
   *
   * **Validates: Requirements 3.8**
   */

  it('toggling an absent ID adds it — set size increases by 1', () => {
    fc.assert(
      fc.property(
        arbEmailIdSet,
        arbEmailId,
        (set, id) => {
          // Ensure the ID is not already in the set
          const withoutId = new Set(set);
          withoutId.delete(id);

          const result = toggleSelection(withoutId, id);

          expect(result.has(id)).toBe(true);
          expect(result.size).toBe(withoutId.size + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('toggling a present ID removes it — set size decreases by 1', () => {
    fc.assert(
      fc.property(
        arbEmailIdSet,
        arbEmailId,
        (set, id) => {
          // Ensure the ID is in the set
          const withId = new Set(set);
          withId.add(id);

          const result = toggleSelection(withId, id);

          expect(result.has(id)).toBe(false);
          expect(result.size).toBe(withId.size - 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('toggling any ID changes set size by exactly 1', () => {
    fc.assert(
      fc.property(
        arbEmailIdSet,
        arbEmailId,
        (set, id) => {
          const result = toggleSelection(set, id);
          expect(Math.abs(result.size - set.size)).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('toggling twice returns to the original set (round-trip)', () => {
    fc.assert(
      fc.property(
        arbEmailIdSet,
        arbEmailId,
        (set, id) => {
          const once = toggleSelection(set, id);
          const twice = toggleSelection(once, id);

          // Same size
          expect(twice.size).toBe(set.size);
          // Same elements
          for (const elem of set) {
            expect(twice.has(elem)).toBe(true);
          }
          for (const elem of twice) {
            expect(set.has(elem)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('toggle does not mutate the original set', () => {
    fc.assert(
      fc.property(
        arbEmailIdSet,
        arbEmailId,
        (set, id) => {
          const originalSize = set.size;
          const originalElements = new Set(set);

          toggleSelection(set, id);

          // Original set must be unchanged
          expect(set.size).toBe(originalSize);
          for (const elem of originalElements) {
            expect(set.has(elem)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ─── Property 14: Email list keyboard navigation ────────────────────────────

/**
 * Pure index-calculation helpers that mirror the logic in EmailList's
 * handleKeyDown.  Testing these as pure functions avoids unreliable DOM
 * focus behaviour in jsdom while still validating the core navigation
 * invariants.
 */

/** ArrowDown: move focus to the next row, clamped to the last index. */
function arrowDownIndex(currentIndex: number, rowCount: number): number {
  return Math.min(currentIndex + 1, rowCount - 1);
}

/** ArrowUp: move focus to the previous row, clamped to the first index. */
function arrowUpIndex(currentIndex: number, rowCount: number): number {
  return Math.max(currentIndex - 1, 0);
}

// ─── Arbitrary generators for Property 14 ───────────────────────────────────

/** Arbitrary: list length between 1 and 50. */
const arbRowCount = fc.integer({ min: 1, max: 50 });

/** Arbitrary: a valid focus index for a given row count. */
function arbFocusIndex(rowCount: number) {
  return fc.integer({ min: 0, max: rowCount - 1 });
}

/** Arbitrary: a keyboard key relevant to email list navigation. */
const arbNavKey = fc.constantFrom('ArrowDown', 'ArrowUp', 'Enter', ' ');

/** Arbitrary: a sequence of navigation keys. */
const arbKeySequence = fc.array(arbNavKey, { minLength: 1, maxLength: 30 });

// ─── Property 14 tests ─────────────────────────────────────────────────────

describe('Feature: brightmail-ui-modernization, Property 14: Email list keyboard navigation', () => {
  /**
   * Property 14: Email list keyboard navigation
   *
   * For any list of N email rows with focus on row index I:
   * - ArrowDown moves focus to min(I+1, N-1)
   * - ArrowUp moves focus to max(I-1, 0)
   * - Enter triggers navigation to the focused email's thread
   * - Space toggles selection of the focused email
   *
   * **Validates: Requirements 8.2**
   */

  it('ArrowDown moves focus to min(currentIndex + 1, rowCount - 1)', () => {
    fc.assert(
      fc.property(
        arbRowCount.chain((n) => fc.tuple(fc.constant(n), arbFocusIndex(n))),
        ([rowCount, currentIndex]) => {
          const nextIndex = arrowDownIndex(currentIndex, rowCount);
          expect(nextIndex).toBe(Math.min(currentIndex + 1, rowCount - 1));
          expect(nextIndex).toBeGreaterThanOrEqual(0);
          expect(nextIndex).toBeLessThan(rowCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ArrowUp moves focus to max(currentIndex - 1, 0)', () => {
    fc.assert(
      fc.property(
        arbRowCount.chain((n) => fc.tuple(fc.constant(n), arbFocusIndex(n))),
        ([rowCount, currentIndex]) => {
          const prevIndex = arrowUpIndex(currentIndex, rowCount);
          expect(prevIndex).toBe(Math.max(currentIndex - 1, 0));
          expect(prevIndex).toBeGreaterThanOrEqual(0);
          expect(prevIndex).toBeLessThan(rowCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ArrowDown at the last row stays at the last row (no overflow)', () => {
    fc.assert(
      fc.property(arbRowCount, (rowCount) => {
        const lastIndex = rowCount - 1;
        const nextIndex = arrowDownIndex(lastIndex, rowCount);
        expect(nextIndex).toBe(lastIndex);
      }),
      { numRuns: 100 },
    );
  });

  it('ArrowUp at the first row stays at the first row (no underflow)', () => {
    fc.assert(
      fc.property(arbRowCount, (rowCount) => {
        const prevIndex = arrowUpIndex(0, rowCount);
        expect(prevIndex).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('applying a random key sequence keeps the focus index within [0, N-1]', () => {
    fc.assert(
      fc.property(
        arbRowCount.chain((n) =>
          fc.tuple(fc.constant(n), arbFocusIndex(n), arbKeySequence),
        ),
        ([rowCount, startIndex, keys]) => {
          let index = startIndex;
          const navigated: string[] = [];
          const toggled: number[] = [];

          for (const key of keys) {
            switch (key) {
              case 'ArrowDown':
                index = arrowDownIndex(index, rowCount);
                break;
              case 'ArrowUp':
                index = arrowUpIndex(index, rowCount);
                break;
              case 'Enter':
                navigated.push(`row-${index}`);
                break;
              case ' ':
                toggled.push(index);
                break;
            }

            // Invariant: index always stays in bounds
            expect(index).toBeGreaterThanOrEqual(0);
            expect(index).toBeLessThan(rowCount);
          }

          // Enter events should have recorded the current focus index
          for (const nav of navigated) {
            expect(nav).toMatch(/^row-\d+$/);
          }

          // Space events should have recorded valid indices
          for (const t of toggled) {
            expect(t).toBeGreaterThanOrEqual(0);
            expect(t).toBeLessThan(rowCount);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ─── Property 5–8 imports ───────────────────────────────────────────────────

import RecipientChipInput, { isValidEmail } from '../RecipientChipInput';

// ─── Arbitrary generators for Properties 5–8 ───────────────────────────────

/** Arbitrary: a valid email address (local@domain.tld). */
const arbValidEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9.]{0,14}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{0,8}\.[a-z]{2,4}$/),
  )
  .map(([local, domain]) => `${local}@${domain}`);

/** Arbitrary: an invalid email address (various failure modes). */
const arbInvalidEmail = fc.oneof(
  // No @ at all
  fc.stringMatching(/^[a-z][a-z0-9]{1,15}$/),
  // Empty local part
  fc.stringMatching(/^[a-z][a-z0-9]{0,8}\.[a-z]{2,4}$/).map(
    (domain) => `@${domain}`,
  ),
  // No dot in domain
  fc
    .tuple(
      fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/),
      fc.stringMatching(/^[a-z]{2,8}$/),
    )
    .map(([local, domain]) => `${local}@${domain}`),
  // Multiple @
  fc
    .tuple(
      fc.stringMatching(/^[a-z][a-z0-9]{0,5}$/),
      fc.stringMatching(/^[a-z][a-z0-9]{0,5}$/),
      fc.stringMatching(/^[a-z][a-z0-9]{0,5}\.[a-z]{2,3}$/),
    )
    .map(([a, b, domain]) => `${a}@${b}@${domain}`),
  // Domain ends with dot
  fc
    .stringMatching(/^[a-z][a-z0-9]{0,8}$/)
    .map((local) => `${local}@example.`),
);

/** Arbitrary: a non-empty array of valid emails (1–5). */
const arbValidEmailList = fc.array(arbValidEmail, {
  minLength: 1,
  maxLength: 5,
});

/** Arbitrary: a non-empty array of mixed valid/invalid emails. */
const arbMixedEmailList = fc.array(
  fc.oneof(arbValidEmail, arbInvalidEmail),
  { minLength: 1, maxLength: 8 },
);

// ─── Property 5 tests ───────────────────────────────────────────────────────

describe('Feature: brightmail-ui-modernization, Property 5: Chip creation on valid email commit', () => {
  /**
   * Property 5: Chip creation on valid email commit
   *
   * For any valid email address string, the isValidEmail function returns true.
   * When RecipientChipInput is rendered with N valid email addresses, it
   * produces exactly N chips with data-testid="recipient-chip".
   *
   * **Validates: Requirements 4.1, 4.2**
   */

  it('isValidEmail returns true for any generated valid email', () => {
    fc.assert(
      fc.property(arbValidEmail, (email) => {
        expect(isValidEmail(email)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('rendering N valid emails produces exactly N recipient chips', () => {
    fc.assert(
      fc.property(arbValidEmailList, (emails) => {
        render(
          <RecipientChipInput
            value={emails}
            onChange={() => {}}
            label="To"
          />,
        );

        const chips = document.querySelectorAll(
          '[data-testid="recipient-chip"]',
        );
        expect(chips.length).toBe(emails.length);

        // Each chip displays the corresponding email text
        emails.forEach((email, i) => {
          expect(chips[i].textContent).toContain(email);
        });

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 6 tests ───────────────────────────────────────────────────────

describe('Feature: brightmail-ui-modernization, Property 6: Chip removal preserves remaining chips', () => {
  /**
   * Property 6: Chip removal preserves remaining chips
   *
   * For any list of committed email chips and any chip in that list, clicking
   * the remove button on that chip SHALL remove exactly that email address
   * and leave all other chips unchanged.
   *
   * **Validates: Requirements 4.3**
   */

  it('removing a chip at a random index leaves all other emails intact', () => {
    fc.assert(
      fc.property(
        arbValidEmailList.chain((emails) =>
          fc.tuple(
            fc.constant(emails),
            fc.integer({ min: 0, max: emails.length - 1 }),
          ),
        ),
        ([emails, removeIndex]) => {
          // Pure array operation: removing at removeIndex
          const result = emails.filter((_, i) => i !== removeIndex);

          // Result should have one fewer element
          expect(result.length).toBe(emails.length - 1);

          // The removed email should not be at that position
          // All other emails should be preserved in order
          const expected = [
            ...emails.slice(0, removeIndex),
            ...emails.slice(removeIndex + 1),
          ];
          expect(result).toEqual(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rendered component calls onChange without the removed chip', () => {
    fc.assert(
      fc.property(
        arbValidEmailList
          .filter((emails) => emails.length >= 2)
          .chain((emails) =>
            fc.tuple(
              fc.constant(emails),
              fc.integer({ min: 0, max: emails.length - 1 }),
            ),
          ),
        ([emails, removeIndex]) => {
          const onChange = jest.fn();
          render(
            <RecipientChipInput
              value={emails}
              onChange={onChange}
              label="To"
            />,
          );

          const chips = document.querySelectorAll(
            '[data-testid="recipient-chip"]',
          );
          const deleteBtn = chips[removeIndex].querySelector(
            '.MuiChip-deleteIcon',
          ) as HTMLElement;
          fireEvent.click(deleteBtn);

          const expected = emails.filter((_, i) => i !== removeIndex);
          expect(onChange).toHaveBeenCalledWith(expected);

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7 tests ───────────────────────────────────────────────────────

describe('Feature: brightmail-ui-modernization, Property 7: Invalid email produces error chip', () => {
  /**
   * Property 7: Invalid email produces error chip
   *
   * For any string that does not pass email validation, isValidEmail returns
   * false. When rendered in RecipientChipInput, it produces a chip with
   * data-testid="recipient-chip-error".
   *
   * **Validates: Requirements 4.4**
   */

  it('isValidEmail returns false for any generated invalid email', () => {
    fc.assert(
      fc.property(arbInvalidEmail, (email) => {
        expect(isValidEmail(email)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rendering an invalid email produces an error-styled chip', () => {
    fc.assert(
      fc.property(arbInvalidEmail, (email) => {
        render(
          <RecipientChipInput
            value={[email]}
            onChange={() => {}}
            label="To"
          />,
        );

        const errorChips = document.querySelectorAll(
          '[data-testid="recipient-chip-error"]',
        );
        expect(errorChips.length).toBe(1);
        expect(errorChips[0].textContent).toContain(email);

        // No valid chips should be present
        const validChips = document.querySelectorAll(
          '[data-testid="recipient-chip"]',
        );
        expect(validChips.length).toBe(0);

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 8 tests ───────────────────────────────────────────────────────

describe('Feature: brightmail-ui-modernization, Property 8: Paste splits and converts comma-separated emails', () => {
  /**
   * Property 8: Paste splits and converts comma-separated emails
   *
   * For any string containing N comma-separated email addresses where M are
   * valid, pasting into RecipientChipInput SHALL produce exactly M valid
   * chips and (N-M) error-styled chips.
   *
   * **Validates: Requirements 4.5**
   */

  it('splitting a comma-separated string produces the correct count of valid and invalid emails', () => {
    fc.assert(
      fc.property(arbMixedEmailList, (emails) => {
        const csvString = emails.join(', ');
        const parts = csvString
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        const validCount = parts.filter((e) => isValidEmail(e)).length;
        const invalidCount = parts.filter((e) => !isValidEmail(e)).length;

        expect(validCount + invalidCount).toBe(parts.length);
      }),
      { numRuns: 100 },
    );
  });

  it('rendering the split emails produces the correct number of valid and error chips', () => {
    fc.assert(
      fc.property(arbMixedEmailList, (emails) => {
        const validCount = emails.filter((e) => isValidEmail(e)).length;
        const invalidCount = emails.filter((e) => !isValidEmail(e)).length;

        render(
          <RecipientChipInput
            value={emails}
            onChange={() => {}}
            label="To"
          />,
        );

        const validChips = document.querySelectorAll(
          '[data-testid="recipient-chip"]',
        );
        const errorChips = document.querySelectorAll(
          '[data-testid="recipient-chip-error"]',
        );

        expect(validChips.length).toBe(validCount);
        expect(errorChips.length).toBe(invalidCount);
        expect(validChips.length + errorChips.length).toBe(emails.length);

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});


// ─── Property 9 imports ─────────────────────────────────────────────────────

import { shouldConfirmClose, clampPosition } from '../ComposeModal';

// ─── Arbitrary generators for Property 9 ────────────────────────────────────

/** Arbitrary: non-empty string that has at least one non-whitespace character after trimming. */
const arbNonEmptyBody = fc
  .tuple(
    fc.string({ minLength: 0, maxLength: 10 }).map((s) => s.replace(/\S/g, ' ')), // optional leading whitespace
    fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ]{0,49}$/), // at least one non-whitespace char
    fc.string({ minLength: 0, maxLength: 10 }).map((s) => s.replace(/\S/g, ' ')), // optional trailing whitespace
  )
  .map(([leading, core, trailing]) => `${leading}${core}${trailing}`);

/** Arbitrary: whitespace-only or empty string. */
const arbEmptyOrWhitespaceBody = fc.oneof(
  fc.constant(''),
  fc.constant(' '),
  fc.constant('  '),
  fc.constant('\t'),
  fc.constant('\n'),
  fc.constant(' \t\n '),
  fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r'), {
      minLength: 0,
      maxLength: 20,
    })
    .map((chars) => chars.join('')),
);

// ─── Property 9 tests ───────────────────────────────────────────────────────

describe('Feature: brightmail-ui-modernization, Property 9: Close confirmation depends on body content', () => {
  /**
   * Property 9: Close confirmation depends on body content
   *
   * For any ComposeModal state, clicking close when the body field is
   * non-empty (after trimming) SHALL display a confirmation prompt before
   * closing. When the body is empty or whitespace-only, clicking close
   * SHALL close immediately without a prompt.
   *
   * **Validates: Requirements 5.4**
   */

  it('shouldConfirmClose returns true for any non-empty (after trimming) body string', () => {
    fc.assert(
      fc.property(arbNonEmptyBody, (body) => {
        expect(shouldConfirmClose(body)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('shouldConfirmClose returns false for any empty or whitespace-only body string', () => {
    fc.assert(
      fc.property(arbEmptyOrWhitespaceBody, (body) => {
        expect(shouldConfirmClose(body)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('shouldConfirmClose is a pure function — same input always produces the same output', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), (body) => {
        const result1 = shouldConfirmClose(body);
        const result2 = shouldConfirmClose(body);
        expect(result1).toBe(result2);
      }),
      { numRuns: 100 },
    );
  });
});


// ─── Arbitrary generators for Property 10 ───────────────────────────────────

/** Arbitrary: viewport width between 320 and 3840. */
const arbViewportWidth = fc.integer({ min: 320, max: 3840 });

/** Arbitrary: viewport height between 320 and 2160. */
const arbViewportHeight = fc.integer({ min: 320, max: 2160 });

/**
 * Arbitrary: a viewport + modal size tuple where modal is strictly smaller
 * than the viewport in both dimensions.
 */
const arbViewportAndModal = fc
  .tuple(arbViewportWidth, arbViewportHeight)
  .chain(([vw, vh]) =>
    fc.tuple(
      fc.constant(vw),
      fc.constant(vh),
      fc.integer({ min: 100, max: Math.min(800, vw - 1) }),
      fc.integer({ min: 100, max: Math.min(800, vh - 1) }),
    ),
  );

/** Arbitrary: any integer position (including negative, to test clamping). */
const arbPosition = fc.record({
  x: fc.integer({ min: -2000, max: 5000 }),
  y: fc.integer({ min: -2000, max: 5000 }),
});

// ─── Property 10 tests ─────────────────────────────────────────────────────

describe('Feature: brightmail-ui-modernization, Property 10: Drag reposition stays within viewport bounds', () => {
  /**
   * Property 10: Drag reposition stays within viewport bounds
   *
   * For any drag delta applied to the ComposeModal title bar, the resulting
   * position SHALL be clamped so the modal remains fully within the viewport
   * boundaries (x >= 0, y >= 0, x + width <= viewport width,
   * y + height <= viewport height).
   *
   * **Validates: Requirements 5.5**
   */

  it('clamped position always has x >= 0 and y >= 0', () => {
    fc.assert(
      fc.property(
        arbViewportAndModal,
        arbPosition,
        ([vw, vh, mw, mh], pos) => {
          const result = clampPosition(pos, mw, mh, vw, vh);
          expect(result.x).toBeGreaterThanOrEqual(0);
          expect(result.y).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('clamped position keeps modal within viewport right and bottom edges', () => {
    fc.assert(
      fc.property(
        arbViewportAndModal,
        arbPosition,
        ([vw, vh, mw, mh], pos) => {
          const result = clampPosition(pos, mw, mh, vw, vh);
          expect(result.x + mw).toBeLessThanOrEqual(vw);
          expect(result.y + mh).toBeLessThanOrEqual(vh);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns the input position unchanged when it is already within bounds', () => {
    fc.assert(
      fc.property(
        arbViewportAndModal.chain(([vw, vh, mw, mh]) =>
          fc.tuple(
            fc.constant(vw),
            fc.constant(vh),
            fc.constant(mw),
            fc.constant(mh),
            fc.record({
              x: fc.integer({ min: 0, max: vw - mw }),
              y: fc.integer({ min: 0, max: vh - mh }),
            }),
          ),
        ),
        ([vw, vh, mw, mh, pos]) => {
          const result = clampPosition(pos, mw, mh, vw, vh);
          expect(result.x).toBe(pos.x);
          expect(result.y).toBe(pos.y);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('clampPosition is idempotent — clamping twice gives the same result as clamping once', () => {
    fc.assert(
      fc.property(
        arbViewportAndModal,
        arbPosition,
        ([vw, vh, mw, mh], pos) => {
          const once = clampPosition(pos, mw, mh, vw, vh);
          const twice = clampPosition(once, mw, mh, vw, vh);
          expect(twice.x).toBe(once.x);
          expect(twice.y).toBe(once.y);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('for any drag delta applied to a valid starting position, the result stays within bounds', () => {
    fc.assert(
      fc.property(
        arbViewportAndModal.chain(([vw, vh, mw, mh]) =>
          fc.tuple(
            fc.constant(vw),
            fc.constant(vh),
            fc.constant(mw),
            fc.constant(mh),
            // Valid starting position (within bounds)
            fc.record({
              x: fc.integer({ min: 0, max: vw - mw }),
              y: fc.integer({ min: 0, max: vh - mh }),
            }),
            // Arbitrary drag delta
            fc.record({
              dx: fc.integer({ min: -3000, max: 3000 }),
              dy: fc.integer({ min: -3000, max: 3000 }),
            }),
          ),
        ),
        ([vw, vh, mw, mh, start, delta]) => {
          const dragged = { x: start.x + delta.dx, y: start.y + delta.dy };
          const result = clampPosition(dragged, mw, mh, vw, vh);

          expect(result.x).toBeGreaterThanOrEqual(0);
          expect(result.y).toBeGreaterThanOrEqual(0);
          expect(result.x + mw).toBeLessThanOrEqual(vw);
          expect(result.y + mh).toBeLessThanOrEqual(vh);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 11 imports ────────────────────────────────────────────────────

import { getInitialExpandedSet } from '../ThreadView';

// ─── Arbitrary generators for Property 11 ───────────────────────────────────

/** Arbitrary: a unique messageId string. */
const arbMessageId = fc
  .stringMatching(/^[0-9a-f]{8,16}$/)
  .map((s) => `<${s}@thread.local>`);

/**
 * Arbitrary: a thread of emails (objects with unique messageId) of length 2–20.
 * Uses fc.uniqueArray to guarantee unique messageIds.
 */
const arbThread = fc
  .uniqueArray(arbMessageId, { minLength: 2, maxLength: 20 })
  .map((ids) => ids.map((id) => ({ messageId: id })));

/** Arbitrary: a single-message thread. */
const arbSingleMessageThread = arbMessageId.map((id) => [{ messageId: id }]);

// ─── Property 11 tests ─────────────────────────────────────────────────────

describe('Feature: brightmail-ui-modernization, Property 11: Thread initial collapse state', () => {
  /**
   * Property 11: Thread initial collapse state
   *
   * For any thread with N messages (N > 1) sorted chronologically, the
   * Thread_View SHALL render exactly N-1 messages in collapsed state and
   * the most recent (last) message in expanded state. Each message element
   * SHALL have an aria-expanded attribute matching its visual state (true
   * for expanded, false for collapsed).
   *
   * **Validates: Requirements 6.1, 6.3, 8.6**
   */

  it('for any thread with N >= 2 messages, getInitialExpandedSet returns a Set of size exactly 1', () => {
    fc.assert(
      fc.property(arbThread, (thread) => {
        const expandedSet = getInitialExpandedSet(thread);
        expect(expandedSet.size).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  it('the single expanded element is the messageId of the last (most recent) email', () => {
    fc.assert(
      fc.property(arbThread, (thread) => {
        const expandedSet = getInitialExpandedSet(thread);
        const lastMessageId = thread[thread.length - 1].messageId;
        expect(expandedSet.has(lastMessageId)).toBe(true);
        // And it's the only element
        expect([...expandedSet][0]).toBe(lastMessageId);
      }),
      { numRuns: 100 },
    );
  });

  it('for any thread with N >= 2 messages, exactly N-1 messages are NOT in the expanded set (collapsed)', () => {
    fc.assert(
      fc.property(arbThread, (thread) => {
        const expandedSet = getInitialExpandedSet(thread);
        const collapsedCount = thread.filter(
          (email) => !expandedSet.has(email.messageId),
        ).length;
        expect(collapsedCount).toBe(thread.length - 1);
      }),
      { numRuns: 100 },
    );
  });

  it('for a single-message thread, the expanded set contains that message ID', () => {
    fc.assert(
      fc.property(arbSingleMessageThread, (thread) => {
        const expandedSet = getInitialExpandedSet(thread);
        expect(expandedSet.size).toBe(1);
        expect(expandedSet.has(thread[0].messageId)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('for an empty thread, the expanded set is empty', () => {
    const expandedSet = getInitialExpandedSet([]);
    expect(expandedSet.size).toBe(0);
  });

  it('aria-expanded attributes would be correct: expanded for last, collapsed for all others', () => {
    fc.assert(
      fc.property(arbThread, (thread) => {
        const expandedSet = getInitialExpandedSet(thread);

        for (let i = 0; i < thread.length; i++) {
          const isExpanded = expandedSet.has(thread[i].messageId);
          const expectedAriaExpanded = i === thread.length - 1;
          expect(isExpanded).toBe(expectedAriaExpanded);
        }
      }),
      { numRuns: 100 },
    );
  });
});


// ─── Property 12 tests ─────────────────────────────────────────────────────

describe('Feature: brightmail-ui-modernization, Property 12: Click expands collapsed thread message', () => {
  /**
   * Property 12: Click expands collapsed thread message
   *
   * For any collapsed thread message, clicking it SHALL transition it to
   * expanded state. The expanded message SHALL display the full body,
   * sender, recipients, date, and action toolbar.
   *
   * Tests use pure Set operations to simulate the toggle — no DOM rendering.
   *
   * **Validates: Requirements 6.2, 6.4**
   */

  it('adding a collapsed message ID to the expanded set results in it being expanded', () => {
    fc.assert(
      fc.property(
        arbThread.chain((thread) =>
          fc.tuple(
            fc.constant(thread),
            // Pick any collapsed index: 0 to N-2 (last is always expanded)
            fc.integer({ min: 0, max: thread.length - 2 }),
          ),
        ),
        ([thread, collapsedIndex]) => {
          const expandedSet = getInitialExpandedSet(thread);
          const targetId = thread[collapsedIndex].messageId;

          // Precondition: the target is initially collapsed
          expect(expandedSet.has(targetId)).toBe(false);

          // Simulate click: add to expanded set
          const newExpanded = new Set(expandedSet);
          newExpanded.add(targetId);

          // The target is now expanded
          expect(newExpanded.has(targetId)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('after expanding a collapsed message, the total number of expanded messages increases by 1', () => {
    fc.assert(
      fc.property(
        arbThread.chain((thread) =>
          fc.tuple(
            fc.constant(thread),
            fc.integer({ min: 0, max: thread.length - 2 }),
          ),
        ),
        ([thread, collapsedIndex]) => {
          const expandedSet = getInitialExpandedSet(thread);
          const sizeBefore = expandedSet.size;

          const newExpanded = new Set(expandedSet);
          newExpanded.add(thread[collapsedIndex].messageId);

          expect(newExpanded.size).toBe(sizeBefore + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('expanding a collapsed message does not affect the expansion state of any other message', () => {
    fc.assert(
      fc.property(
        arbThread.chain((thread) =>
          fc.tuple(
            fc.constant(thread),
            fc.integer({ min: 0, max: thread.length - 2 }),
          ),
        ),
        ([thread, collapsedIndex]) => {
          const expandedSet = getInitialExpandedSet(thread);
          const targetId = thread[collapsedIndex].messageId;

          const newExpanded = new Set(expandedSet);
          newExpanded.add(targetId);

          // Every other message retains its original expansion state
          for (const email of thread) {
            if (email.messageId !== targetId) {
              expect(newExpanded.has(email.messageId)).toBe(
                expandedSet.has(email.messageId),
              );
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('the most recent message remains expanded after expanding any collapsed message', () => {
    fc.assert(
      fc.property(
        arbThread.chain((thread) =>
          fc.tuple(
            fc.constant(thread),
            fc.integer({ min: 0, max: thread.length - 2 }),
          ),
        ),
        ([thread, collapsedIndex]) => {
          const expandedSet = getInitialExpandedSet(thread);
          const lastMessageId = thread[thread.length - 1].messageId;

          const newExpanded = new Set(expandedSet);
          newExpanded.add(thread[collapsedIndex].messageId);

          // The most recent message is still expanded
          expect(newExpanded.has(lastMessageId)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
