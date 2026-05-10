/**
 * ScheduleEditor Component
 *
 * A React component for managing provider/location schedules and generating
 * slots. Renders an editable availability grid showing existing time blocks,
 * supports adding/removing time blocks, recurring availability patterns
 * (e.g., every Monday 9am-5pm), and emits the updated Schedule and
 * generated Slots via onSave.
 *
 * @module scheduling/ScheduleEditor
 */
import type {
  IScheduleResource,
  ISlotResource,
} from '@brightchain/brightchart-lib';
import { BrightChartStrings, SlotStatus } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Days of the week for recurring patterns. */
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

/** A single availability time block within the editor. */
export interface TimeBlock {
  /** Unique identifier for this block. */
  id: string;
  /** Day of the week. */
  day: DayOfWeek;
  /** Start time in HH:mm format. */
  startTime: string;
  /** End time in HH:mm format. */
  endTime: string;
  /** Whether this block recurs weekly. */
  recurring: boolean;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ScheduleEditorProps {
  /** The Schedule resource being edited. */
  schedule: IScheduleResource<string>;
  /** Existing slots for this schedule. */
  slots: ISlotResource<string>[];
  /** Callback emitting the updated Schedule and generated Slots on save. */
  onSave: (
    schedule: IScheduleResource<string>,
    slots: ISlotResource<string>[],
  ) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let blockIdCounter = 0;

/** Generate a unique block id. */
function nextBlockId(): string {
  blockIdCounter += 1;
  return `block-${Date.now()}-${blockIdCounter}`;
}

/** Convert existing slots into TimeBlock entries for the editor grid. */
function slotsToTimeBlocks(slots: ISlotResource<string>[]): TimeBlock[] {
  return slots.map((slot, idx) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const dayIndex = (start.getDay() + 6) % 7; // JS Sunday=0 → Monday=0
    return {
      id: slot.id ?? `existing-${idx}`,
      day: DAYS_OF_WEEK[dayIndex],
      startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
      recurring: false,
    };
  });
}

/** Get the next occurrence of a given day of the week from a base date. */
function getNextDayDate(day: DayOfWeek, base: Date): Date {
  const targetIndex = DAYS_OF_WEEK.indexOf(day);
  const baseIndex = (base.getDay() + 6) % 7;
  const diff = (targetIndex - baseIndex + 7) % 7;
  const result = new Date(base);
  result.setDate(result.getDate() + (diff === 0 ? 0 : diff));
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Generate ISlotResource entries from the current time blocks. */
function generateSlots(
  blocks: TimeBlock[],
  schedule: IScheduleResource<string>,
): ISlotResource<string>[] {
  const now = new Date();
  return blocks.map((block, idx) => {
    const dayDate = getNextDayDate(block.day, now);
    const [startH, startM] = block.startTime.split(':').map(Number);
    const [endH, endM] = block.endTime.split(':').map(Number);

    const start = new Date(dayDate);
    start.setHours(startH, startM, 0, 0);

    const end = new Date(dayDate);
    end.setHours(endH, endM, 0, 0);

    return {
      resourceType: 'Slot' as const,
      id: `generated-slot-${idx}`,
      schedule: { reference: `Schedule/${schedule.id ?? ''}` },
      status: SlotStatus.Free,
      start: start.toISOString(),
      end: end.toISOString(),
      brightchainMetadata: schedule.brightchainMetadata,
      comment: block.recurring ? 'recurring' : undefined,
    };
  });
}

/** Format a time string for display. */
function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ScheduleEditor: React.FC<ScheduleEditorProps> = ({
  schedule,
  slots,
  onSave,
}) => {
  // Initialize time blocks from existing slots
  const initialBlocks = useMemo(() => slotsToTimeBlocks(slots), [slots]);
  const [blocks, setBlocks] = useState<TimeBlock[]>(initialBlocks);
  const { t } = useBrightChartTranslation();

  const DAY_LABELS_I18N: Record<DayOfWeek, string> = useMemo(
    () => ({
      monday: t(BrightChartStrings.ScheduleEditor_Day_Monday),
      tuesday: t(BrightChartStrings.ScheduleEditor_Day_Tuesday),
      wednesday: t(BrightChartStrings.ScheduleEditor_Day_Wednesday),
      thursday: t(BrightChartStrings.ScheduleEditor_Day_Thursday),
      friday: t(BrightChartStrings.ScheduleEditor_Day_Friday),
      saturday: t(BrightChartStrings.ScheduleEditor_Day_Saturday),
      sunday: t(BrightChartStrings.ScheduleEditor_Day_Sunday),
    }),
    [t],
  );

  // New block form state
  const [newDay, setNewDay] = useState<DayOfWeek>('monday');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');
  const [newRecurring, setNewRecurring] = useState(false);
  const [addError, setAddError] = useState('');

  // Add a time block
  const handleAddBlock = useCallback(() => {
    setAddError('');

    if (newStart >= newEnd) {
      setAddError(t(BrightChartStrings.ScheduleEditor_StartBeforeEnd));
      return;
    }

    const block: TimeBlock = {
      id: nextBlockId(),
      day: newDay,
      startTime: newStart,
      endTime: newEnd,
      recurring: newRecurring,
    };

    setBlocks((prev) => [...prev, block]);
  }, [newDay, newStart, newEnd, newRecurring]);

  // Remove a time block
  const handleRemoveBlock = useCallback((blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  }, []);

  // Save handler — generate slots and emit
  const handleSave = useCallback(() => {
    const generatedSlots = generateSlots(blocks, schedule);
    onSave(schedule, generatedSlots);
  }, [blocks, schedule, onSave]);

  // Group blocks by day for the grid display
  const blocksByDay = useMemo(() => {
    const grouped: Record<DayOfWeek, TimeBlock[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };
    for (const block of blocks) {
      grouped[block.day].push(block);
    }
    // Sort each day's blocks by start time
    for (const day of DAYS_OF_WEEK) {
      grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return grouped;
  }, [blocks]);

  // Actor display for the header
  const actorDisplay = useMemo(() => {
    return schedule.actor
      .map((a) => a.display ?? a.reference ?? 'Unknown')
      .join(', ');
  }, [schedule.actor]);

  return (
    <div
      className="schedule-editor"
      role="region"
      aria-label={t(BrightChartStrings.ScheduleEditor_AriaLabel)}
    >
      {/* Header */}
      <div className="schedule-editor__header">
        <h2 className="schedule-editor__title">
          {t(BrightChartStrings.ScheduleEditor_Title)}
          {actorDisplay && (
            <span className="schedule-editor__actor"> — {actorDisplay}</span>
          )}
        </h2>
        {schedule.comment && (
          <p className="schedule-editor__comment">{schedule.comment}</p>
        )}
      </div>

      {/* Add time block form */}
      <fieldset
        className="schedule-editor__add-block"
        aria-label={t(BrightChartStrings.ScheduleEditor_AddBlockLegend)}
      >
        <legend>{t(BrightChartStrings.ScheduleEditor_AddBlockLegend)}</legend>

        <div className="schedule-editor__add-row">
          <div className="schedule-editor__field">
            <label htmlFor="se-day">
              {t(BrightChartStrings.ScheduleEditor_DayLabel)}
            </label>
            <select
              id="se-day"
              value={newDay}
              onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {DAY_LABELS_I18N[day]}
                </option>
              ))}
            </select>
          </div>

          <div className="schedule-editor__field">
            <label htmlFor="se-start">
              {t(BrightChartStrings.ScheduleEditor_StartTime)}
            </label>
            <input
              id="se-start"
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              aria-required="true"
            />
          </div>

          <div className="schedule-editor__field">
            <label htmlFor="se-end">
              {t(BrightChartStrings.ScheduleEditor_EndTime)}
            </label>
            <input
              id="se-end"
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              aria-required="true"
            />
          </div>

          <div className="schedule-editor__field schedule-editor__field--checkbox">
            <label htmlFor="se-recurring">
              <input
                id="se-recurring"
                type="checkbox"
                checked={newRecurring}
                onChange={(e) => setNewRecurring(e.target.checked)}
              />
              {t(BrightChartStrings.ScheduleEditor_RecurringWeekly)}
            </label>
          </div>

          <button
            type="button"
            className="schedule-editor__add-btn"
            onClick={handleAddBlock}
            aria-label={t(BrightChartStrings.ScheduleEditor_AddBlockLegend)}
          >
            {t(BrightChartStrings.ScheduleEditor_AddBlock)}
          </button>
        </div>

        {addError && (
          <span
            className="schedule-editor__error"
            role="alert"
            aria-live="assertive"
          >
            {addError}
          </span>
        )}
      </fieldset>

      {/* Availability grid */}
      <div
        className="schedule-editor__grid"
        role="grid"
        aria-label={t(BrightChartStrings.ScheduleEditor_GridAriaLabel)}
      >
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="schedule-editor__day-column" role="row">
            <div className="schedule-editor__day-header" role="columnheader">
              {DAY_LABELS_I18N[day]}
            </div>

            {blocksByDay[day].length === 0 ? (
              <div
                className="schedule-editor__no-blocks"
                role="gridcell"
                aria-label={`${t(BrightChartStrings.ScheduleEditor_NoAvailability)} ${DAY_LABELS_I18N[day]}`}
              >
                {t(BrightChartStrings.ScheduleEditor_NoAvailability)}
              </div>
            ) : (
              blocksByDay[day].map((block) => (
                <div
                  key={block.id}
                  className={`schedule-editor__block ${block.recurring ? 'schedule-editor__block--recurring' : ''}`}
                  role="gridcell"
                  aria-label={`${DAY_LABELS_I18N[day]} ${formatTimeDisplay(block.startTime)} to ${formatTimeDisplay(block.endTime)}${block.recurring ? ', ' + t(BrightChartStrings.ScheduleEditor_RecurringWeekly).toLowerCase() : ''}`}
                >
                  <span className="schedule-editor__block-time">
                    {formatTimeDisplay(block.startTime)} –{' '}
                    {formatTimeDisplay(block.endTime)}
                  </span>
                  {block.recurring && (
                    <span className="schedule-editor__block-recurring-badge">
                      {t(BrightChartStrings.ScheduleEditor_Recurring)}
                    </span>
                  )}
                  <button
                    type="button"
                    className="schedule-editor__remove-btn"
                    onClick={() => handleRemoveBlock(block.id)}
                    aria-label={`${t(BrightChartStrings.Common_Remove)} ${DAY_LABELS_I18N[day]} ${formatTimeDisplay(block.startTime)} to ${formatTimeDisplay(block.endTime)} block`}
                  >
                    {t(BrightChartStrings.Common_Remove)}
                  </button>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="schedule-editor__actions">
        <button
          type="button"
          className="schedule-editor__save-btn"
          onClick={handleSave}
          aria-label={t(BrightChartStrings.ScheduleEditor_SaveSchedule)}
        >
          {t(BrightChartStrings.ScheduleEditor_SaveSchedule)}
        </button>
      </div>
    </div>
  );
};
