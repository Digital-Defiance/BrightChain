import type { ICalendarShareDTO } from '@brightchain/brightcal-lib';
import {
  BrightCalStrings,
  CalendarPermissionLevel,
  type BrightCalStringKey,
} from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCalendarSharing } from '../hooks/useCalendarSharing';

/**
 * Props for the SharingDialog component.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */
export interface SharingDialogProps {
  /** Calendar ID to manage sharing for */
  calendarId: string;
  /** Display name of the calendar */
  calendarName: string;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** API base URL */
  apiBaseUrl: string;
  /** Auth token for API requests */
  authToken?: string;
}

/** Permission levels available for sharing (excludes Owner) */
const SHAREABLE_PERMISSIONS = [
  CalendarPermissionLevel.Editor,
  CalendarPermissionLevel.Viewer,
  CalendarPermissionLevel.FreeBusyOnly,
] as const;

const PERMISSION_LABELS_KEYS: Record<string, BrightCalStringKey> = {
  [CalendarPermissionLevel.Owner]: BrightCalStrings.Permission_Owner,
  [CalendarPermissionLevel.Editor]: BrightCalStrings.Permission_Editor,
  [CalendarPermissionLevel.Viewer]: BrightCalStrings.Permission_Viewer,
  [CalendarPermissionLevel.FreeBusyOnly]:
    BrightCalStrings.Permission_FreeBusyOnly,
};

/**
 * SharingDialog provides a modal for managing calendar sharing:
 * listing existing shares, creating new shares, revoking shares,
 * and managing public links.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */
export function SharingDialog({
  calendarId,
  calendarName,
  isOpen,
  onClose,
  apiBaseUrl,
  authToken,
}: SharingDialogProps) {
  const { tBranded: t } = useI18n();
  const {
    shareCalendar,
    revokeShare,
    getShares,
    generatePublicLink,
    revokePublicLink,
    loading,
    error,
  } = useCalendarSharing({ apiBaseUrl, authToken });

  const [shares, setShares] = useState<ICalendarShareDTO[]>([]);
  const [newUserId, setNewUserId] = useState('');
  const [newPermission, setNewPermission] = useState<CalendarPermissionLevel>(
    CalendarPermissionLevel.Viewer,
  );
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [clipboardMsg, setClipboardMsg] = useState<string | null>(null);
  const publicLinkRef = useRef<HTMLInputElement>(null);

  // Fetch shares when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchShares();
    }
    // Reset state when dialog closes
    if (!isOpen) {
      setNewUserId('');
      setNewPermission(CalendarPermissionLevel.Viewer);
      setClipboardMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, calendarId]);

  const fetchShares = useCallback(async () => {
    const result = await getShares(calendarId);
    setShares(result);
    // Check if any share has a public link
    const shareWithLink = result.find((s) => s.publicLink);
    if (shareWithLink?.publicLink) {
      setPublicLink(shareWithLink.publicLink);
    } else {
      setPublicLink(null);
    }
  }, [calendarId, getShares]);

  const handleShare = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newUserId.trim()) return;
      const result = await shareCalendar(
        calendarId,
        newUserId.trim(),
        newPermission,
      );
      if (result) {
        setNewUserId('');
        await fetchShares();
      }
    },
    [calendarId, newUserId, newPermission, shareCalendar, fetchShares],
  );

  const handleRevoke = useCallback(
    async (shareId: string) => {
      const success = await revokeShare(calendarId, shareId);
      if (success) {
        await fetchShares();
      }
    },
    [calendarId, revokeShare, fetchShares],
  );

  const handleCopyPublicLink = useCallback(async () => {
    let link = publicLink;
    if (!link) {
      link = await generatePublicLink(calendarId);
      if (link) {
        setPublicLink(link);
      }
    }
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setClipboardMsg(t(BrightCalStrings.Sharing_LinkCopied));
    } catch {
      // Fallback: select the text for manual copy
      if (publicLinkRef.current) {
        publicLinkRef.current.select();
        setClipboardMsg(t(BrightCalStrings.Sharing_SelectAndCopy));
      }
    }
  }, [publicLink, calendarId, generatePublicLink, t]);

  const handleRevokePublicLink = useCallback(async () => {
    const success = await revokePublicLink(calendarId);
    if (success) {
      setPublicLink(null);
      setClipboardMsg(null);
    }
  }, [calendarId, revokePublicLink]);

  if (!isOpen) return null;

  return (
    <div
      className="brightcal-sharing-dialog-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="brightcal-sharing-dialog"
        role="dialog"
        aria-label={t(BrightCalStrings.Sharing_DialogTitleTemplate).replace(
          '{NAME}',
          calendarName,
        )}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brightcal-sharing-dialog-header">
          <h2>
            {t(BrightCalStrings.Sharing_DialogTitleTemplate).replace(
              '{NAME}',
              calendarName,
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(BrightCalStrings.Label_CloseSharingDialog)}
            className="brightcal-sharing-dialog-close"
          >
            ×
          </button>
        </div>

        {/* Inline error display — Requirements: 3.5 */}
        {error && (
          <div className="brightcal-sharing-dialog-error" role="alert">
            {error}
          </div>
        )}

        {/* Existing shares list — Requirements: 3.2, 3.4 */}
        <div className="brightcal-sharing-dialog-shares">
          <h3>{t(BrightCalStrings.Sharing_CurrentShares)}</h3>
          {shares.length === 0 ? (
            <p className="brightcal-sharing-dialog-empty">
              {t(BrightCalStrings.Sharing_NoShares)}
            </p>
          ) : (
            <ul role="list" aria-label={t(BrightCalStrings.Label_SharedUsers)}>
              {shares.map((share) => {
                const shareId = share.id as string;
                const userId =
                  (share.grantedToUserId as string) ||
                  (share.grantedToGroupId as string) ||
                  'Unknown';
                return (
                  <li
                    key={shareId}
                    className="brightcal-sharing-dialog-share-entry"
                  >
                    <span className="brightcal-sharing-dialog-share-user">
                      {userId}
                    </span>
                    <span className="brightcal-sharing-dialog-share-permission">
                      {t(PERMISSION_LABELS_KEYS[share.permission]) ||
                        share.permission}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRevoke(shareId)}
                      disabled={loading}
                      aria-label={`${t(BrightCalStrings.Action_Revoke)} ${userId}`}
                    >
                      {t(BrightCalStrings.Action_Revoke)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* New share form — Requirements: 3.3 */}
        <form
          className="brightcal-sharing-dialog-new-share"
          onSubmit={handleShare}
          aria-label={t(BrightCalStrings.Label_ShareCalendarForm)}
        >
          <h3>{t(BrightCalStrings.Sharing_AddShare)}</h3>
          <div className="brightcal-sharing-dialog-form-row">
            <input
              type="text"
              placeholder={t(BrightCalStrings.Label_UserId)}
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              aria-label={t(BrightCalStrings.Label_UserId)}
              required
            />
            <select
              value={newPermission}
              onChange={(e) =>
                setNewPermission(e.target.value as CalendarPermissionLevel)
              }
              aria-label={t(BrightCalStrings.Label_PermissionLevel)}
            >
              {SHAREABLE_PERMISSIONS.map((perm) => (
                <option key={perm} value={perm}>
                  {t(PERMISSION_LABELS_KEYS[perm])}
                </option>
              ))}
            </select>
            <button type="submit" disabled={loading || !newUserId.trim()}>
              {t(BrightCalStrings.Action_Share)}
            </button>
          </div>
        </form>

        {/* Public link section — Requirements: 3.6, 3.7 */}
        <div className="brightcal-sharing-dialog-public-link">
          <h3>{t(BrightCalStrings.Label_PublicLink)}</h3>
          {publicLink && (
            <div className="brightcal-sharing-dialog-link-display">
              <input
                ref={publicLinkRef}
                type="text"
                value={publicLink}
                readOnly
                aria-label={t(BrightCalStrings.Label_PublicLinkUrl)}
              />
            </div>
          )}
          {clipboardMsg && (
            <p className="brightcal-sharing-dialog-clipboard-msg" role="status">
              {clipboardMsg}
            </p>
          )}
          <div className="brightcal-sharing-dialog-link-actions">
            <button
              type="button"
              onClick={handleCopyPublicLink}
              disabled={loading}
            >
              {t(BrightCalStrings.Action_CopyPublicLink)}
            </button>
            {publicLink && (
              <button
                type="button"
                onClick={handleRevokePublicLink}
                disabled={loading}
              >
                {t(BrightCalStrings.Action_RevokePublicLink)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
