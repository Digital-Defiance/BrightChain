import type { ICalendarCollectionDTO } from '@brightchain/brightcal-lib';
import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import React, { useCallback, useMemo, useState } from 'react';
import { useCalendarManagement } from '../hooks/useCalendarManagement';
import { useCalendarSubscription } from '../hooks/useCalendarSubscription';
import {
  groupCalendarsByOwnership,
  toggleVisibility,
} from '../utils/visibilitySet';
import { MiniCalendar } from './MiniCalendar';

/**
 * Props for the CalendarSidebar component.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4, 4.5
 */
export interface CalendarSidebarProps {
  /** All calendar collections to display */
  calendars: ICalendarCollectionDTO[];
  /** Set of currently visible calendar IDs */
  visibilitySet: Set<string>;
  /** Callback when visibility set changes */
  onVisibilityChange: (newSet: Set<string>) => void;
  /** API base URL for calendar management operations */
  apiBaseUrl: string;
  /** Auth token for API requests */
  authToken?: string;
  /** Callback to trigger parent refetch after calendar CRUD */
  onCalendarsChanged: () => void;
  /** Current user ID for ownership grouping */
  userId?: string;
  /** Currently selected date for MiniCalendar */
  selectedDate?: Date;
  /** Callback when a date is selected on the mini calendar */
  onDateSelect?: (date: Date) => void;
  /** Callback when "Browse Holiday Calendars" is clicked */
  onBrowseHolidays?: () => void;
}

interface ContextMenuState {
  calendarId: string;
  x: number;
  y: number;
}

type InlineFormMode =
  | 'none'
  | 'add-calendar'
  | 'subscribe'
  | 'rename'
  | 'change-color';

interface InlineFormState {
  mode: InlineFormMode;
  targetCalendarId?: string;
  displayName: string;
  color: string;
  subscriptionUrl: string;
}

const DEFAULT_COLOR = '#3b82f6';
const COLOR_OPTIONS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#6366f1',
  '#14b8a6',
];

/**
 * CalendarSidebar provides an Outlook-style sidebar with calendar list,
 * visibility toggles, context menus, and calendar management controls.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3
 */
export function CalendarSidebar({
  calendars,
  visibilitySet,
  onVisibilityChange,
  apiBaseUrl,
  authToken,
  onCalendarsChanged,
  userId = '',
  selectedDate,
  onDateSelect,
  onBrowseHolidays,
}: CalendarSidebarProps) {
  const { tBranded: t } = useI18n();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [inlineForm, setInlineForm] = useState<InlineFormState>({
    mode: 'none',
    displayName: '',
    color: DEFAULT_COLOR,
    subscriptionUrl: '',
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sidebarError, setSidebarError] = useState<string | null>(null);

  const {
    createCalendar,
    updateCalendar,
    deleteCalendar,
    loading: mgmtLoading,
    error: mgmtError,
  } = useCalendarManagement({
    apiBaseUrl,
    authToken,
    onSuccess: onCalendarsChanged,
  });

  const {
    subscribe,
    loading: subLoading,
    error: subError,
  } = useCalendarSubscription({
    apiBaseUrl,
    authToken,
    onSuccess: onCalendarsChanged,
  });

  const { owned, other } = useMemo(
    () => groupCalendarsByOwnership(calendars, userId),
    [calendars, userId],
  );

  const handleToggle = useCallback(
    (calendarId: string) => {
      onVisibilityChange(toggleVisibility(visibilitySet, calendarId));
    },
    [visibilitySet, onVisibilityChange],
  );

  const openContextMenu = useCallback(
    (e: React.MouseEvent, calendarId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ calendarId, x: e.clientX, y: e.clientY });
    },
    [],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleRename = useCallback(
    (calendarId: string) => {
      const cal = calendars.find((c) => (c.id as string) === calendarId);
      setInlineForm({
        mode: 'rename',
        targetCalendarId: calendarId,
        displayName: cal?.displayName ?? '',
        color: cal?.color ?? DEFAULT_COLOR,
        subscriptionUrl: '',
      });
      setContextMenu(null);
    },
    [calendars],
  );

  const handleChangeColor = useCallback(
    (calendarId: string) => {
      const cal = calendars.find((c) => (c.id as string) === calendarId);
      setInlineForm({
        mode: 'change-color',
        targetCalendarId: calendarId,
        displayName: '',
        color: cal?.color ?? DEFAULT_COLOR,
        subscriptionUrl: '',
      });
      setContextMenu(null);
    },
    [calendars],
  );

  const handleDeleteRequest = useCallback(
    (calendarId: string) => {
      const cal = calendars.find((c) => (c.id as string) === calendarId);
      if (cal?.isDefault) {
        setSidebarError(t(BrightCalStrings.Sidebar_CannotDeleteDefault));
        setContextMenu(null);
        return;
      }
      setConfirmDeleteId(calendarId);
      setContextMenu(null);
    },
    [calendars, t],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDeleteId) return;
    await deleteCalendar(confirmDeleteId);
    setConfirmDeleteId(null);
  }, [confirmDeleteId, deleteCalendar]);

  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  const handleAddCalendarSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSidebarError(null);
      if (!inlineForm.displayName.trim()) return;
      await createCalendar(inlineForm.displayName.trim(), inlineForm.color);
      setInlineForm({
        mode: 'none',
        displayName: '',
        color: DEFAULT_COLOR,
        subscriptionUrl: '',
      });
    },
    [inlineForm, createCalendar],
  );

  const handleRenameSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSidebarError(null);
      if (!inlineForm.targetCalendarId || !inlineForm.displayName.trim())
        return;
      await updateCalendar(inlineForm.targetCalendarId, {
        displayName: inlineForm.displayName.trim(),
      });
      setInlineForm({
        mode: 'none',
        displayName: '',
        color: DEFAULT_COLOR,
        subscriptionUrl: '',
      });
    },
    [inlineForm, updateCalendar],
  );

  const handleChangeColorSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSidebarError(null);
      if (!inlineForm.targetCalendarId) return;
      await updateCalendar(inlineForm.targetCalendarId, {
        color: inlineForm.color,
      });
      setInlineForm({
        mode: 'none',
        displayName: '',
        color: DEFAULT_COLOR,
        subscriptionUrl: '',
      });
    },
    [inlineForm, updateCalendar],
  );

  const handleSubscribeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSidebarError(null);
      if (!inlineForm.subscriptionUrl.trim()) return;
      await subscribe(inlineForm.subscriptionUrl.trim(), 'Subscription');
      setInlineForm({
        mode: 'none',
        displayName: '',
        color: DEFAULT_COLOR,
        subscriptionUrl: '',
      });
    },
    [inlineForm, subscribe],
  );

  const resetInlineForm = useCallback(() => {
    setInlineForm({
      mode: 'none',
      displayName: '',
      color: DEFAULT_COLOR,
      subscriptionUrl: '',
    });
  }, []);

  const renderCalendarEntry = (cal: ICalendarCollectionDTO) => {
    const calId = cal.id as string;
    const isVisible = visibilitySet.has(calId);

    return (
      <li key={calId} className="brightcal-sidebar-calendar-entry">
        <label className="brightcal-sidebar-calendar-label">
          <input
            type="checkbox"
            checked={isVisible}
            onChange={() => handleToggle(calId)}
            aria-label={`Toggle ${cal.displayName}`}
            style={{ accentColor: cal.color || DEFAULT_COLOR }}
          />
          <span
            className="brightcal-sidebar-calendar-color"
            style={{ backgroundColor: cal.color || DEFAULT_COLOR }}
            aria-hidden="true"
          />
          <span className="brightcal-sidebar-calendar-name">
            {cal.displayName}
          </span>
        </label>
        <button
          type="button"
          className="brightcal-sidebar-context-btn"
          onClick={(e) => openContextMenu(e, calId)}
          aria-label={`Options for ${cal.displayName}`}
          aria-haspopup="true"
        >
          ⋯
        </button>
      </li>
    );
  };

  const displayError = sidebarError || mgmtError || subError;

  return (
    <aside
      className="brightcal-sidebar"
      role="complementary"
      aria-label={t(BrightCalStrings.Label_CalendarSidebar)}
      onClick={closeContextMenu}
    >
      {/* MiniCalendar at top */}
      {selectedDate && onDateSelect && (
        <MiniCalendar selectedDate={selectedDate} onDateSelect={onDateSelect} />
      )}

      {/* Error display */}
      {displayError && (
        <div className="brightcal-sidebar-error" role="alert">
          {displayError}
          <button
            type="button"
            onClick={() => setSidebarError(null)}
            aria-label={t(BrightCalStrings.Label_DismissError)}
          >
            ×
          </button>
        </div>
      )}

      {/* My Calendars section */}
      <section aria-label={t(BrightCalStrings.Label_MyCalendars)}>
        <h3>{t(BrightCalStrings.Label_MyCalendars)}</h3>
        <ul role="list">{owned.map(renderCalendarEntry)}</ul>
      </section>

      {/* Other Calendars section */}
      {other.length > 0 && (
        <section aria-label={t(BrightCalStrings.Label_OtherCalendars)}>
          <h3>{t(BrightCalStrings.Label_OtherCalendars)}</h3>
          <ul role="list">{other.map(renderCalendarEntry)}</ul>
        </section>
      )}

      {/* Action buttons */}
      <div className="brightcal-sidebar-actions">
        <button
          type="button"
          onClick={() =>
            setInlineForm({
              mode: 'add-calendar',
              displayName: '',
              color: DEFAULT_COLOR,
              subscriptionUrl: '',
            })
          }
          disabled={mgmtLoading}
        >
          {t(BrightCalStrings.Action_AddCalendar)}
        </button>
        <button
          type="button"
          onClick={() =>
            setInlineForm({
              mode: 'subscribe',
              displayName: '',
              color: DEFAULT_COLOR,
              subscriptionUrl: '',
            })
          }
          disabled={subLoading}
        >
          {t(BrightCalStrings.Action_SubscribeToCalendar)}
        </button>
        <button type="button" onClick={onBrowseHolidays}>
          {t(BrightCalStrings.Action_BrowseHolidayCalendars)}
        </button>
      </div>

      {/* Add Calendar inline form */}
      {inlineForm.mode === 'add-calendar' && (
        <form
          className="brightcal-sidebar-inline-form"
          onSubmit={handleAddCalendarSubmit}
          aria-label={t(BrightCalStrings.Label_AddCalendarForm)}
        >
          <input
            type="text"
            placeholder={t(BrightCalStrings.Label_CalendarName)}
            value={inlineForm.displayName}
            onChange={(e) =>
              setInlineForm((prev) => ({
                ...prev,
                displayName: e.target.value,
              }))
            }
            aria-label={t(BrightCalStrings.Label_CalendarName)}
            required
          />
          <div
            className="brightcal-sidebar-color-picker"
            role="radiogroup"
            aria-label={t(BrightCalStrings.Label_CalendarColor)}
          >
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                className={`brightcal-sidebar-color-option${inlineForm.color === c ? ' selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setInlineForm((prev) => ({ ...prev, color: c }))}
                aria-label={`Color ${c}`}
                aria-pressed={inlineForm.color === c}
                role="radio"
                aria-checked={inlineForm.color === c}
              />
            ))}
          </div>
          <div className="brightcal-sidebar-form-buttons">
            <button type="submit" disabled={mgmtLoading}>
              {t(BrightCalStrings.Action_Create)}
            </button>
            <button type="button" onClick={resetInlineForm}>
              {t(BrightCalStrings.Action_Cancel)}
            </button>
          </div>
        </form>
      )}

      {/* Subscribe inline form */}
      {inlineForm.mode === 'subscribe' && (
        <form
          className="brightcal-sidebar-inline-form"
          onSubmit={handleSubscribeSubmit}
          aria-label={t(BrightCalStrings.Label_SubscribeToCalendarForm)}
        >
          <input
            type="url"
            placeholder={t(BrightCalStrings.Label_CalendarUrl)}
            value={inlineForm.subscriptionUrl}
            onChange={(e) =>
              setInlineForm((prev) => ({
                ...prev,
                subscriptionUrl: e.target.value,
              }))
            }
            aria-label={t(BrightCalStrings.Label_CalendarUrl)}
            required
          />
          <div className="brightcal-sidebar-form-buttons">
            <button type="submit" disabled={subLoading}>
              {t(BrightCalStrings.Action_Subscribe)}
            </button>
            <button type="button" onClick={resetInlineForm}>
              {t(BrightCalStrings.Action_Cancel)}
            </button>
          </div>
        </form>
      )}

      {/* Rename inline form */}
      {inlineForm.mode === 'rename' && (
        <form
          className="brightcal-sidebar-inline-form"
          onSubmit={handleRenameSubmit}
          aria-label={t(BrightCalStrings.Label_RenameCalendarForm)}
        >
          <input
            type="text"
            placeholder={t(BrightCalStrings.Label_NewName)}
            value={inlineForm.displayName}
            onChange={(e) =>
              setInlineForm((prev) => ({
                ...prev,
                displayName: e.target.value,
              }))
            }
            aria-label={t(BrightCalStrings.Label_NewCalendarName)}
            required
          />
          <div className="brightcal-sidebar-form-buttons">
            <button type="submit" disabled={mgmtLoading}>
              {t(BrightCalStrings.Action_Save)}
            </button>
            <button type="button" onClick={resetInlineForm}>
              {t(BrightCalStrings.Action_Cancel)}
            </button>
          </div>
        </form>
      )}

      {/* Change Color inline form */}
      {inlineForm.mode === 'change-color' && (
        <form
          className="brightcal-sidebar-inline-form"
          onSubmit={handleChangeColorSubmit}
          aria-label={t(BrightCalStrings.Label_ChangeCalendarColorForm)}
        >
          <div
            className="brightcal-sidebar-color-picker"
            role="radiogroup"
            aria-label={t(BrightCalStrings.Label_CalendarColor)}
          >
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                className={`brightcal-sidebar-color-option${inlineForm.color === c ? ' selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setInlineForm((prev) => ({ ...prev, color: c }))}
                aria-label={`Color ${c}`}
                aria-pressed={inlineForm.color === c}
                role="radio"
                aria-checked={inlineForm.color === c}
              />
            ))}
          </div>
          <div className="brightcal-sidebar-form-buttons">
            <button type="submit" disabled={mgmtLoading}>
              {t(BrightCalStrings.Action_Save)}
            </button>
            <button type="button" onClick={resetInlineForm}>
              {t(BrightCalStrings.Action_Cancel)}
            </button>
          </div>
        </form>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="brightcal-sidebar-context-menu"
          role="menu"
          aria-label={t(BrightCalStrings.Label_CalendarOptions)}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleRename(contextMenu.calendarId)}
          >
            {t(BrightCalStrings.Action_Rename)}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleChangeColor(contextMenu.calendarId)}
          >
            {t(BrightCalStrings.Action_ChangeColor)}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleDeleteRequest(contextMenu.calendarId)}
          >
            {t(BrightCalStrings.Action_Delete)}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              // Share action — emits the calendar ID for parent to handle
              setContextMenu(null);
            }}
          >
            {t(BrightCalStrings.Action_Share)}
          </button>
        </div>
      )}

      {/* Confirmation dialog for delete */}
      {confirmDeleteId && (
        <div
          className="brightcal-sidebar-confirm-dialog"
          role="alertdialog"
          aria-label={t(BrightCalStrings.Label_ConfirmDelete)}
          aria-describedby="confirm-delete-msg"
        >
          <p id="confirm-delete-msg">
            {t(BrightCalStrings.Sidebar_ConfirmDeleteMessage)}
          </p>
          <div className="brightcal-sidebar-form-buttons">
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={mgmtLoading}
            >
              {t(BrightCalStrings.Action_Delete)}
            </button>
            <button type="button" onClick={handleCancelDelete}>
              {t(BrightCalStrings.Action_Cancel)}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
