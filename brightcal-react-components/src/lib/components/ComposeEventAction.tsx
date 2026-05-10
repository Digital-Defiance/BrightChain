import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';

/**
 * A recipient from the email compose fields.
 */
export interface ComposeRecipient {
  email: string;
  displayName?: string;
}

/**
 * Props for the ComposeEventAction component.
 */
export interface ComposeEventActionProps {
  /** Recipients from the To/CC fields */
  recipients: ComposeRecipient[];
  /** Callback when the user clicks "Add Event" */
  onCreateEvent: (recipients: ComposeRecipient[]) => void;
}

/**
 * ComposeEventAction renders an "Add Event" button in the BrightMail
 * compose interface. When clicked, it triggers event creation
 * pre-populated with the email recipients as attendees.
 *
 * Requirements: 13.4, 13.7
 */
export function ComposeEventAction({
  recipients,
  onCreateEvent,
}: ComposeEventActionProps) {
  const { tBranded: t } = useI18n();
  return (
    <button
      type="button"
      className="brightcal-compose-event-action"
      onClick={() => onCreateEvent(recipients)}
      aria-label={t(BrightCalStrings.Label_AddCalendarEvent)}
      title={t(BrightCalStrings.Tooltip_AddEvent)}
    >
      {t(BrightCalStrings.Action_AddEvent)}
    </button>
  );
}
