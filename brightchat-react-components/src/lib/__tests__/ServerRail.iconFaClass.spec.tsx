/**
 * Unit tests for ServerRail — iconFaClass / iconUrl / letter-fallback priority.
 *
 * Validates that the component renders the correct icon based on priority:
 *   1. iconFaClass  → <i> element with the FA class
 *   2. iconUrl      → <img> avatar
 *   3. letter       → first-letter fallback
 */

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tBranded: (key: string) => key,
    tComponent: (_: string, key: string) => key,
  }),
}));

jest.mock('@brightchain/brightchain-lib', () => ({
  PresenceStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    IDLE: 'idle',
    DO_NOT_DISTURB: 'dnd',
  },
  DefaultRole: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    MEMBER: 'member',
  },
}));

import { render, screen } from '@testing-library/react';
import ServerRail from '../ServerRail';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createServer(overrides = {}) {
  return {
    id: 'srv-1',
    name: 'Test',
    ownerId: 'u1',
    memberIds: ['u1'],
    channelIds: [],
    categories: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function renderRail(server: ReturnType<typeof createServer>) {
  return render(
    <ServerRail
      servers={[server]}
      activeServerId={null}
      onServerSelect={jest.fn()}
      onHomeClick={jest.fn()}
      onCreateServer={jest.fn()}
    />,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ServerRail — iconFaClass priority', () => {
  it('renders FA icon when iconFaClass is set', () => {
    const server = createServer({ iconFaClass: 'fa-solid fa-gamepad' });
    const { container } = renderRail(server);

    const faIcon = container.querySelector('i.fa-solid.fa-gamepad');
    expect(faIcon).toBeTruthy();
  });

  it('renders image avatar when iconUrl is set but no iconFaClass', () => {
    const server = createServer({
      iconUrl: 'https://example.com/icon.png',
    });
    const { container } = renderRail(server);

    const img = container.querySelector('img[src="https://example.com/icon.png"]');
    expect(img).toBeTruthy();

    // No <i> FA icon should be present
    const faIcon = container.querySelector('i.fa-solid');
    expect(faIcon).toBeNull();
  });

  it('renders letter fallback when neither iconFaClass nor iconUrl is set', () => {
    const server = createServer({ name: 'Zeta' });
    const { container } = renderRail(server);

    // Should show the first letter of the server name
    expect(screen.getByText('Z')).toBeTruthy();

    // No <i> FA icon or <img> avatar should be present inside the server button
    const serverBtn = screen.getByLabelText('Zeta');
    const faIcon = serverBtn.querySelector('i');
    expect(faIcon).toBeNull();
    const img = serverBtn.querySelector('img');
    expect(img).toBeNull();
  });

  it('iconFaClass takes precedence over iconUrl when both are set', () => {
    const server = createServer({
      iconFaClass: 'fa-solid fa-heart',
      iconUrl: 'https://example.com/icon.png',
    });
    const { container } = renderRail(server);

    // FA icon should be rendered
    const faIcon = container.querySelector('i.fa-solid.fa-heart');
    expect(faIcon).toBeTruthy();

    // Image avatar should NOT be rendered
    const img = container.querySelector('img[src="https://example.com/icon.png"]');
    expect(img).toBeNull();
  });
});
