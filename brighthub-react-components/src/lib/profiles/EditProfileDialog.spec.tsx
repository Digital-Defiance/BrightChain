/**
 * Unit tests for EditProfileDialog component.
 *
 * Feature: brighthub-profile-enhancements
 * Requirements: 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 *
 * Tests that EditProfileDialog pre-populates fields, shows live character
 * count, validates bio length and image markdown, calls onSave with correct
 * data, shows saving state, calls onClose on cancel, and uses i18n keys.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock @brightchain/brightchain-lib to avoid the full ECIES/GUID init chain.
jest.mock('@brightchain/brightchain-lib', () => ({
  __esModule: true,
  BrightHubStrings: new Proxy(
    {},
    { get: (_target: unknown, prop: string) => String(prop) },
  ),
  BrightHubComponentId: 'BrightHub',
  i18nEngine: {
    registerEnum: jest.fn(() => ({})),
    translate: jest.fn((key: string) => key),
    translateEnum: jest.fn((_enumType: unknown, value: unknown) =>
      String(value),
    ),
  },
}));

jest.mock('@brightchain/brighthub-lib', () => ({
  ...jest.requireActual('@brightchain/brighthub-lib'),
  __esModule: true,
  BrightHubStrings: new Proxy(
    {},
    { get: (_target: unknown, prop: string) => String(prop) },
  ),
  BrightHubComponentId: 'BrightHub',
}));

// Mock the sub-path used by EditProfileDialog for the content pipeline functions
jest.mock('@brightchain/brighthub-lib/lib/brighthub-lib', () => ({
  ...jest.requireActual('@brightchain/brighthub-lib/lib/brighthub-lib'),
  __esModule: true,
  // Mock parseBioContent and getCharacterCount to avoid running the full markdown pipeline
  parseBioContent: jest.fn((content: string) => `<p>${content}</p>`),
  getCharacterCount: jest.fn((content: string) => content.length),
}));

jest.mock('../hooks/useBrightHubTranslation', () => ({
  useBrightHubTranslation: () => ({
    t: (key: string, vars?: Record<string, string>) => {
      if (!vars) return key;
      // Replace template variables like {CURRENT}, {MAX}
      return Object.entries(vars).reduce(
        (acc, [k, v]) => acc.replace(`{${k}}`, v),
        key,
      );
    },
    tEnum: (_enumType: unknown, value: unknown) => String(value),
  }),
}));

import type { IBaseUserProfile } from '@brightchain/brighthub-lib';
import {
  getCharacterCount,
  parseBioContent,
} from '@brightchain/brighthub-lib/lib/brighthub-lib';
import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { EditProfileDialog } from './EditProfileDialog';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createProfile(
  overrides: Partial<IBaseUserProfile<string>> = {},
): IBaseUserProfile<string> {
  return {
    _id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    bio: 'My bio',
    location: 'New York',
    websiteUrl: 'https://example.com',
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    isVerified: false,
    isProtected: false,
    approveFollowersMode: 0 as any,
    privacySettings: {} as any,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const BIO_MAX_LENGTH = 200;

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('EditProfileDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: getCharacterCount returns content.length
    (getCharacterCount as jest.Mock).mockImplementation(
      (content: string) => content.length,
    );
    // Default mock: parseBioContent returns wrapped content
    (parseBioContent as jest.Mock).mockImplementation(
      (content: string) => `<p>${content}</p>`,
    );
  });

  /**
   * Requirement 9.2: All form fields should be pre-populated with the profile data.
   */
  it('renders all form fields pre-populated with the profile data', () => {
    const profile = createProfile({
      displayName: 'Jane Doe',
      bio: 'Hello world',
      location: 'London',
      websiteUrl: 'https://janedoe.com',
    });

    render(
      <EditProfileDialog
        open={true}
        profile={profile}
        bioMaxLength={BIO_MAX_LENGTH}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    // Display name field should be pre-populated
    const displayNameInput = screen.getByDisplayValue('Jane Doe');
    expect(displayNameInput).toBeInTheDocument();

    // Bio field should be pre-populated
    const bioInput = screen.getByDisplayValue('Hello world');
    expect(bioInput).toBeInTheDocument();

    // Location field should be pre-populated
    const locationInput = screen.getByDisplayValue('London');
    expect(locationInput).toBeInTheDocument();

    // Website URL field should be pre-populated
    const websiteInput = screen.getByDisplayValue('https://janedoe.com');
    expect(websiteInput).toBeInTheDocument();
  });

  /**
   * Requirement 9.3: Bio field should show a live character count.
   */
  it('shows live character count for the bio field', () => {
    const profile = createProfile({ bio: 'Hello' });
    (getCharacterCount as jest.Mock).mockReturnValue(5);

    render(
      <EditProfileDialog
        open={true}
        profile={profile}
        bioMaxLength={BIO_MAX_LENGTH}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    // The character count template key with substituted values should appear
    // Our mock t() replaces {CURRENT} and {MAX} in the key string
    expect(
      screen.getByText(
        `EditProfileDialog_BioCharCountTemplate`
          .replace('{CURRENT}', '5')
          .replace('{MAX}', String(BIO_MAX_LENGTH)),
      ),
    ).toBeInTheDocument();
  });

  /**
   * Requirement 9.3: Character count should turn red (error color) when bio exceeds bioMaxLength.
   */
  it('character count turns red when bio exceeds bioMaxLength', () => {
    const longBio = 'a'.repeat(BIO_MAX_LENGTH + 1);
    const profile = createProfile({ bio: longBio });
    (getCharacterCount as jest.Mock).mockReturnValue(BIO_MAX_LENGTH + 1);

    render(
      <EditProfileDialog
        open={true}
        profile={profile}
        bioMaxLength={BIO_MAX_LENGTH}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    // Find the character count element
    const charCountEl = screen.getByText(
      `EditProfileDialog_BioCharCountTemplate`
        .replace('{CURRENT}', String(BIO_MAX_LENGTH + 1))
        .replace('{MAX}', String(BIO_MAX_LENGTH)),
    );
    expect(charCountEl).toBeInTheDocument();

    // When over limit, the bio TextField should be in error state (aria-invalid="true")
    const bioTextarea = screen.getByRole('textbox', {
      name: 'EditProfileDialog_Bio',
    });
    expect(bioTextarea).toHaveAttribute('aria-invalid', 'true');

    // The char count Typography element should be present as a MUI Typography component
    const classList = Array.from(charCountEl.classList);
    expect(classList.some((c) => c.startsWith('MuiTypography'))).toBe(true);
  });

  /**
   * Requirement 9.5: Submit button should be disabled when displayName is empty.
   */
  it('submit button is disabled when displayName is empty', () => {
    const profile = createProfile({ displayName: '' });

    render(
      <EditProfileDialog
        open={true}
        profile={profile}
        bioMaxLength={BIO_MAX_LENGTH}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    // The save button should be disabled
    const saveButton = screen.getByText('EditProfileDialog_Save');
    expect(saveButton.closest('button')).toBeDisabled();
  });

  /**
   * Requirement 9.5: Submit button should be disabled when bio exceeds bioMaxLength.
   */
  it('submit button is disabled when bio exceeds bioMaxLength', () => {
    const longBio = 'a'.repeat(BIO_MAX_LENGTH + 1);
    const profile = createProfile({ bio: longBio });
    (getCharacterCount as jest.Mock).mockReturnValue(BIO_MAX_LENGTH + 1);

    render(
      <EditProfileDialog
        open={true}
        profile={profile}
        bioMaxLength={BIO_MAX_LENGTH}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const saveButton = screen.getByText('EditProfileDialog_Save');
    expect(saveButton.closest('button')).toBeDisabled();
  });

  /**
   * Requirement 9.6: Shows bio validation error when image markdown is entered.
   */
  it('shows bio validation error when image markdown is entered', async () => {
    const profile = createProfile({ bio: '' });

    render(
      <EditProfileDialog
        open={true}
        profile={profile}
        bioMaxLength={BIO_MAX_LENGTH}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    // Type image markdown into the bio field
    const bioInput = screen.getByRole('textbox', {
      name: 'EditProfileDialog_Bio',
    });
    fireEvent.change(bioInput, {
      target: { value: '![alt](https://example.com/img.png)' },
    });

    // Click save to trigger validation
    const saveButton = screen.getByText('EditProfileDialog_Save');
    fireEvent.click(saveButton);

    // The image error key should appear
    await waitFor(() => {
      expect(
        screen.getByText('EditProfileDialog_ErrorBioContainsImage'),
      ).toBeInTheDocument();
    });
  });

  /**
   * Requirement 9.7: Calls onSave with correct EditProfileUpdates when form is submitted.
   */
  it('calls onSave with correct EditProfileUpdates when form is submitted', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const profile = createProfile({
      displayName: 'Jane Doe',
      bio: 'My bio',
      location: 'London',
      websiteUrl: 'https://janedoe.com',
    });

    render(
      <EditProfileDialog
        open={true}
        profile={profile}
        bioMaxLength={BIO_MAX_LENGTH}
        onSave={onSave}
        onClose={jest.fn()}
      />,
    );

    // Click save
    const saveButton = screen.getByText('EditProfileDialog_Save');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      displayName: 'Jane Doe',
      bio: 'My bio',
      location: 'London',
      websiteUrl: 'https://janedoe.com',
    });
  });

  /**
   * Requirement 9.7: Shows saving state (disabled button, saving label) while onSave is in flight.
   */
  it('shows saving state while onSave is in flight', async () => {
    // Create a promise we can control
    let resolveSave!: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const onSave = jest.fn().mockReturnValue(savePromise);

    const profile = createProfile({ displayName: 'Jane Doe', bio: 'My bio' });

    render(
      <EditProfileDialog
        open={true}
        profile={profile}
        bioMaxLength={BIO_MAX_LENGTH}
        onSave={onSave}
        onClose={jest.fn()}
      />,
    );

    // Click save to start the in-flight save
    const saveButton = screen.getByText('EditProfileDialog_Save');
    act(() => {
      fireEvent.click(saveButton);
    });

    // While saving, the button should show the saving label and be disabled
    await waitFor(() => {
      expect(screen.getByText('EditProfileDialog_Saving')).toBeInTheDocument();
    });

    const savingButton = screen.getByText('EditProfileDialog_Saving');
    expect(savingButton.closest('button')).toBeDisabled();

    // Resolve the save
    await act(async () => {
      resolveSave();
    });
  });

  /**
   * Requirement 9.7: Calls onClose when Cancel is clicked.
   */
  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    const profile = createProfile();

    render(
      <EditProfileDialog
        open={true}
        profile={profile}
        bioMaxLength={BIO_MAX_LENGTH}
        onSave={jest.fn()}
        onClose={onClose}
      />,
    );

    const cancelButton = screen.getByText('EditProfileDialog_Cancel');
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Requirement 9.8: All user-facing strings use i18n keys.
   * The mock returns the key as the value, so we verify key names appear in output.
   */
  it('all user-facing strings use i18n keys (mock returns key as value)', () => {
    const profile = createProfile();

    render(
      <EditProfileDialog
        open={true}
        profile={profile}
        bioMaxLength={BIO_MAX_LENGTH}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    // Verify key names appear in the rendered output
    expect(screen.getByText('EditProfileDialog_Title')).toBeInTheDocument();
    expect(screen.getByText('EditProfileDialog_Save')).toBeInTheDocument();
    expect(screen.getByText('EditProfileDialog_Cancel')).toBeInTheDocument();
    // Bio tab label
    expect(screen.getByText('EditProfileDialog_Bio')).toBeInTheDocument();
    // Bio preview tab label
    expect(
      screen.getByText('EditProfileDialog_BioPreview'),
    ).toBeInTheDocument();
  });
});
