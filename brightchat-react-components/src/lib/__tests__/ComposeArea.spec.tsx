/**
 * Unit tests for ComposeArea encryption indicator.
 *
 * Tests placeholder text, lock icon presence, data-testid, and aria-label
 * for the encryption indicator in the compose area.
 *
 * Requirements: 3.1, 3.2, 3.3, 9.3
 */

// Mock useChatApi to return a fake API client
const mockChatApi = {
  sendDirectMessage: jest.fn().mockResolvedValue({}),
  sendGroupMessage: jest.fn().mockResolvedValue({}),
  sendChannelMessage: jest.fn().mockResolvedValue({}),
};

jest.mock('../hooks/useChatApi', () => ({
  useChatApi: () => mockChatApi,
}));

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
}));

import { render, screen } from '@testing-library/react';
import ComposeArea from '../ComposeArea';

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderCompose(
  overrides: Partial<{
    contextType: 'conversation' | 'group' | 'channel';
    contextId: string;
    onMessageSent: jest.Mock;
  }> = {},
) {
  return render(
    <ComposeArea
      contextType={overrides.contextType ?? 'conversation'}
      contextId={overrides.contextId ?? 'ctx-1'}
      onMessageSent={overrides.onMessageSent}
    />,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ComposeArea encryption indicator', () => {
  it('displays placeholder text "Type an encrypted message..." (Req 3.2)', () => {
    renderCompose();
    const input = screen.getByPlaceholderText('Compose_Placeholder');
    expect(input).toBeTruthy();
  });

  it('renders a lock icon with data-testid="encryption-icon-compose" (Req 3.1, 9.3)', () => {
    renderCompose();
    const lockIcon = screen.getByTestId('encryption-icon-compose');
    expect(lockIcon).toBeTruthy();
    expect(lockIcon.tagName).toBe('svg');
  });

  it('has aria-label="Encrypted message input" on the text input (Req 3.3)', () => {
    renderCompose();
    const input = screen.getByLabelText('Encrypted message input');
    expect(input).toBeTruthy();
  });

  it('renders encryption indicator for conversation context type', () => {
    renderCompose({ contextType: 'conversation' });
    expect(screen.getByTestId('encryption-icon-compose')).toBeTruthy();
    expect(screen.getByPlaceholderText('Compose_Placeholder')).toBeTruthy();
  });

  it('renders encryption indicator for group context type', () => {
    renderCompose({ contextType: 'group' });
    expect(screen.getByTestId('encryption-icon-compose')).toBeTruthy();
    expect(screen.getByPlaceholderText('Compose_Placeholder')).toBeTruthy();
  });

  it('renders encryption indicator for channel context type', () => {
    renderCompose({ contextType: 'channel' });
    expect(screen.getByTestId('encryption-icon-compose')).toBeTruthy();
    expect(screen.getByPlaceholderText('Compose_Placeholder')).toBeTruthy();
  });
});
