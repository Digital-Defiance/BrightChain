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

import type { IBaseGroupConversation } from '@brightchain/brighthub-lib';
import {
  ConversationType,
  GroupParticipantRole,
} from '@brightchain/brighthub-lib';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ParticipantInfo } from './GroupConversationSettings';
import { GroupConversationSettings } from './GroupConversationSettings';

const makeConversation = (): IBaseGroupConversation<string> => ({
  _id: 'conv-1',
  type: ConversationType.Group,
  participantIds: ['user-1', 'user-2', 'user-3'],
  name: 'Team Chat',
  adminIds: ['user-1'],
  creatorId: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
});

const makeParticipants = (): ParticipantInfo[] => [
  {
    userId: 'user-1',
    displayName: 'Alice',
    role: GroupParticipantRole.Admin,
  },
  {
    userId: 'user-2',
    displayName: 'Bob',
    role: GroupParticipantRole.Participant,
  },
  {
    userId: 'user-3',
    displayName: 'Charlie',
    role: GroupParticipantRole.Participant,
  },
];

describe('GroupConversationSettings', () => {
  it('renders group name and participants', () => {
    render(
      <GroupConversationSettings
        conversation={makeConversation()}
        participants={makeParticipants()}
        currentUserId="user-1"
        isAdmin
      />,
    );
    expect(screen.getByDisplayValue('Team Chat')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows admin badges', () => {
    render(
      <GroupConversationSettings
        conversation={makeConversation()}
        participants={makeParticipants()}
        currentUserId="user-1"
        isAdmin
      />,
    );
    expect(screen.getByTestId('admin-badge-user-1')).toBeInTheDocument();
  });

  it('calls onRemoveParticipant', () => {
    const onRemove = jest.fn();
    render(
      <GroupConversationSettings
        conversation={makeConversation()}
        participants={makeParticipants()}
        currentUserId="user-1"
        isAdmin
        onRemoveParticipant={onRemove}
      />,
    );
    const removeButtons = screen.getAllByLabelText(
      'GroupConversationSettings_RemoveParticipant',
    );
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith('user-2');
  });

  it('calls onPromoteToAdmin', () => {
    const onPromote = jest.fn();
    render(
      <GroupConversationSettings
        conversation={makeConversation()}
        participants={makeParticipants()}
        currentUserId="user-1"
        isAdmin
        onPromoteToAdmin={onPromote}
      />,
    );
    const promoteButtons = screen.getAllByLabelText(
      'GroupConversationSettings_PromoteToAdmin',
    );
    fireEvent.click(promoteButtons[0]);
    expect(onPromote).toHaveBeenCalledWith('user-2');
  });

  it('calls onLeaveGroup', () => {
    const onLeave = jest.fn();
    render(
      <GroupConversationSettings
        conversation={makeConversation()}
        participants={makeParticipants()}
        currentUserId="user-1"
        isAdmin
        onLeaveGroup={onLeave}
      />,
    );
    fireEvent.click(
      screen.getByLabelText('GroupConversationSettings_LeaveGroup'),
    );
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('disables name editing for non-admins', () => {
    render(
      <GroupConversationSettings
        conversation={makeConversation()}
        participants={makeParticipants()}
        currentUserId="user-2"
        isAdmin={false}
      />,
    );
    const nameInput = screen.getByDisplayValue('Team Chat');
    expect(nameInput).toBeDisabled();
  });
});
