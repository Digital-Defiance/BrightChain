// Mock @brightchain/brightchain-lib to avoid the full ECIES/GUID init chain.
jest.mock('@brightchain/brightchain-lib', () => ({
  __esModule: true,
  BrightHubStrings: new Proxy(
    {},
    { get: (_target: unknown, prop: string) => String(prop) },
  ),
  BrightHubComponentId: 'BrightHub',
}));

jest.mock('../hooks/useBrightHubTranslation', () => ({
  useBrightHubTranslation: () => ({
    t: (key: string, _vars?: Record<string, string>) => key,
  }),
}));

import {
  ApproveFollowersMode,
  IBasePrivacySettings,
} from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConnectionPrivacySettings } from './ConnectionPrivacySettings';

const defaultSettings: IBasePrivacySettings = {
  hideFollowerCount: false,
  hideFollowingCount: false,
  hideFollowersFromNonFollowers: false,
  hideFollowingFromNonFollowers: false,
  allowDmsFromNonFollowers: true,
  showOnlineStatus: true,
  showReadReceipts: true,
};

const defaultProps = {
  settings: defaultSettings,
  approveFollowersMode: ApproveFollowersMode.ApproveNone,
  onChange: jest.fn(),
  onApproveFollowersModeChange: jest.fn(),
};

describe('ConnectionPrivacySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and all toggle switches', () => {
    render(<ConnectionPrivacySettings {...defaultProps} />);

    expect(
      screen.getByTestId('connection-privacy-settings'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('ConnectionPrivacySettings_Title'),
    ).toBeInTheDocument();

    // All 7 toggles should be present
    expect(
      screen.getByTestId('privacy-toggle-hideFollowerCount'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('privacy-toggle-hideFollowingCount'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('privacy-toggle-hideFollowersFromNonFollowers'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('privacy-toggle-hideFollowingFromNonFollowers'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('privacy-toggle-allowDmsFromNonFollowers'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('privacy-toggle-showOnlineStatus'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('privacy-toggle-showReadReceipts'),
    ).toBeInTheDocument();
  });

  it('calls onChange with toggled setting when a switch is clicked', () => {
    const onChange = jest.fn();
    render(<ConnectionPrivacySettings {...defaultProps} onChange={onChange} />);

    const toggle = screen.getByTestId('privacy-toggle-hideFollowerCount');
    fireEvent.click(toggle);

    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings,
      hideFollowerCount: true,
    });
  });

  it('reflects checked state from settings prop', () => {
    const settings: IBasePrivacySettings = {
      ...defaultSettings,
      hideFollowerCount: true,
      showOnlineStatus: false,
    };
    render(<ConnectionPrivacySettings {...defaultProps} settings={settings} />);

    const hideFollowerToggle = screen
      .getByTestId('privacy-toggle-hideFollowerCount')
      .querySelector('input');
    expect(hideFollowerToggle).toBeChecked();

    const onlineToggle = screen
      .getByTestId('privacy-toggle-showOnlineStatus')
      .querySelector('input');
    expect(onlineToggle).not.toBeChecked();
  });

  it('renders the approve followers mode selector', () => {
    render(<ConnectionPrivacySettings {...defaultProps} />);

    expect(
      screen.getByTestId('approve-followers-mode-select'),
    ).toBeInTheDocument();
  });

  it('does not render save button when onSave is not provided', () => {
    render(<ConnectionPrivacySettings {...defaultProps} />);

    expect(screen.queryByTestId('privacy-save-button')).not.toBeInTheDocument();
  });

  it('renders save button and calls onSave when clicked', () => {
    const onSave = jest.fn();
    render(<ConnectionPrivacySettings {...defaultProps} onSave={onSave} />);

    const saveButton = screen.getByTestId('privacy-save-button');
    expect(saveButton).toBeInTheDocument();

    fireEvent.click(saveButton);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('displays i18n labels for all toggle options', () => {
    render(<ConnectionPrivacySettings {...defaultProps} />);

    expect(
      screen.getByText('ConnectionPrivacySettings_HideFollowerCount'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('ConnectionPrivacySettings_HideFollowingCount'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('ConnectionPrivacySettings_AllowDmsFromNonFollowers'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('ConnectionPrivacySettings_ShowOnlineStatus'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('ConnectionPrivacySettings_ShowReadReceipts'),
    ).toBeInTheDocument();
  });
});
