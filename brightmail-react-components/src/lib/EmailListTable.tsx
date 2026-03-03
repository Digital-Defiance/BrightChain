/**
 * EmailListTable — Semantic HTML table for the email inbox list.
 *
 * Renders rows with: checkbox, sender display name (or address fallback),
 * subject, locale-formatted date, and read/unread visual indicator.
 * Row click navigates to `/brightmail/thread/:messageId`.
 *
 * Requirements: 3.2, 3.4, 12.1
 */

import { IEmailMetadata } from '@brightchain/brightchain-lib';
import { Checkbox } from '@mui/material';
import { FC, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateLocale } from './dateFormatting';

export interface EmailListTableProps {
  emails: IEmailMetadata[];
  selectedIds: Set<string>;
  onToggleSelect: (messageId: string) => void;
  onToggleSelectAll: () => void;
  /** Optional BCP 47 locale for date formatting (defaults to runtime locale). */
  locale?: string;
}

function getSenderDisplay(email: IEmailMetadata): string {
  if (email.from?.displayName) {
    return email.from.displayName;
  }
  if (email.from?.address) {
    return email.from.address;
  }
  if (email.from?.localPart && email.from?.domain) {
    return `${email.from.localPart}@${email.from.domain}`;
  }
  return '';
}

function isRead(email: IEmailMetadata): boolean {
  // readReceipts is a Map; if it has any entries the email has been read
  if (email.readReceipts && email.readReceipts.size > 0) {
    return true;
  }
  return false;
}

const EmailListTable: FC<EmailListTableProps> = ({
  emails,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  locale,
}) => {
  const navigate = useNavigate();

  const handleRowClick = useCallback(
    (messageId: string) => {
      navigate(`/brightmail/thread/${encodeURIComponent(messageId)}`);
    },
    [navigate],
  );

  const allSelected = emails.length > 0 && selectedIds.size === emails.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <table
      role="grid"
      aria-label="Email list"
      style={{ width: '100%', borderCollapse: 'collapse' }}
    >
      <thead>
        <tr>
          <th scope="col" style={{ width: 48, padding: '8px' }}>
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={onToggleSelectAll}
              inputProps={{ 'aria-label': 'Select all emails' }}
            />
          </th>
          <th scope="col" style={{ textAlign: 'left', padding: '8px' }}>
            Sender
          </th>
          <th scope="col" style={{ textAlign: 'left', padding: '8px' }}>
            Subject
          </th>
          <th scope="col" style={{ textAlign: 'left', padding: '8px' }}>
            Date
          </th>
          <th scope="col" style={{ width: 48, padding: '8px' }}>
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {emails.map((email) => {
          const read = isRead(email);
          const selected = selectedIds.has(email.messageId);
          const fontWeight = read ? 'normal' : 'bold';

          return (
            <tr
              key={email.messageId}
              role="row"
              aria-selected={selected}
              tabIndex={0}
              onClick={() => handleRowClick(email.messageId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRowClick(email.messageId);
                }
              }}
              style={{
                cursor: 'pointer',
                fontWeight,
                backgroundColor: selected ? '#e3f2fd' : undefined,
              }}
              data-testid={`email-row-${email.messageId}`}
            >
              <td
                style={{ padding: '8px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selected}
                  onChange={() => onToggleSelect(email.messageId)}
                  inputProps={{
                    'aria-label': `Select email from ${getSenderDisplay(email)}`,
                  }}
                />
              </td>
              <td style={{ padding: '8px' }} data-testid="email-sender">
                {getSenderDisplay(email)}
              </td>
              <td style={{ padding: '8px' }} data-testid="email-subject">
                {email.subject ?? ''}
              </td>
              <td style={{ padding: '8px' }} data-testid="email-date">
                {formatDateLocale(email.date, locale)}
              </td>
              <td
                style={{ padding: '8px', textAlign: 'center' }}
                data-testid="email-status"
                aria-label={read ? 'Read' : 'Unread'}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: read ? 'transparent' : '#1976d2',
                    border: read ? '1px solid #ccc' : 'none',
                  }}
                  aria-hidden="true"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default memo(EmailListTable);
