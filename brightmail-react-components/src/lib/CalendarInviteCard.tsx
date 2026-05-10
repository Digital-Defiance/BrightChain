/**
 * CalendarInviteCard
 *
 * Displays a structured invite card inside an email thread (ReadingPane /
 * ThreadView) when the email contains a `text/calendar` MIME part.
 *
 * Supported iTIP methods:
 *  - REQUEST  → shows Accept / Tentative / Decline buttons
 *  - CANCEL   → shows a "This event has been cancelled" banner
 *  - REPLY    → shows the attendee's RSVP response (read-only for organizer)
 *  - COUNTER  → shows a counter-proposal with proposed times
 *  - UPDATE   → alias for REQUEST with higher sequence
 *
 * Props
 * ─────
 * `invite`      Parsed `ICalInviteEmailDTO` from the mail layer.
 * `onRsvp`      Called with the chosen `ParticipationStatus`; should POST the
 *               RSVP to the calendar API and send a REPLY iTIP back.
 * `onAddToCalendar` Called when the user clicks "Add to Calendar" (for
 *               non-iTIP calendar attachments that just describe an event).
 * `currentPartstat` Optional: the user's current participation status if
 *               the event is already in their calendar.
 *
 * @see Requirements 10.2, 10.3
 */
import {
  ITipMethod,
  ParticipationStatus,
  type ICalInviteEmailDTO,
} from '@brightchain/brightcal-lib';
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import { BrightMailStrings } from '@brightchain/brightmail-lib';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ScheduleIcon from '@mui/icons-material/Schedule';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { FC, memo, useState } from 'react';
import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarInviteCardProps {
  invite: ICalInviteEmailDTO;
  onRsvp?: (status: ParticipationStatus) => Promise<void>;
  onAddToCalendar?: () => Promise<void>;
  /** Current PARTSTAT if the event is already in the user's calendar. */
  currentPartstat?: ParticipationStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(
  dtstart: string,
  dtend: string | undefined,
  allDay: boolean,
  formatDateTime: (date: Date | string) => string,
): string {
  if (allDay) {
    return formatDateTime(dtstart);
  }
  const startStr = formatDateTime(dtstart);
  if (!dtend) {
    return startStr;
  }
  const end = new Date(dtend);
  const endTimeStr = end.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${startStr} – ${endTimeStr}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CalendarInviteCard: FC<CalendarInviteCardProps> = ({
  invite,
  onRsvp,
  onAddToCalendar,
  currentPartstat,
}) => {
  const { t } = useBrightMailTranslation();
  const { formatDateTime } = useFormattedDate();
  const [rsvpStatus, setRsvpStatus] = useState<ParticipationStatus | null>(
    currentPartstat ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRsvp = async (status: ParticipationStatus) => {
    if (!onRsvp) return;
    setLoading(true);
    setError(null);
    try {
      await onRsvp(status);
      setRsvpStatus(status);
    } catch {
      setError(t(BrightMailStrings.CalInvite_ErrorRsvp));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCalendar = async () => {
    if (!onAddToCalendar) return;
    setLoading(true);
    setError(null);
    try {
      await onAddToCalendar();
    } catch {
      setError(t(BrightMailStrings.CalInvite_ErrorImport));
    } finally {
      setLoading(false);
    }
  };

  const isCancelled = invite.method === ITipMethod.Cancel;
  const isReply = invite.method === ITipMethod.Reply;
  const isCounter = invite.method === ITipMethod.Counter;
  const isRequest =
    invite.method === ITipMethod.Request ||
    invite.method === ITipMethod.DeclineCounter;

  const dateLabel = formatDateRange(
    invite.dtstart,
    invite.dtend,
    invite.allDay,
    formatDateTime,
  );

  const respondedChipColor = (): 'success' | 'error' | 'warning' | 'default' => {
    switch (rsvpStatus) {
      case ParticipationStatus.Accepted:
        return 'success';
      case ParticipationStatus.Declined:
        return 'error';
      case ParticipationStatus.Tentative:
        return 'warning';
      default:
        return 'default';
    }
  };

  const respondedLabel = (): string => {
    switch (rsvpStatus) {
      case ParticipationStatus.Accepted:
        return t(BrightMailStrings.CalInvite_SuccessAccepted);
      case ParticipationStatus.Declined:
        return t(BrightMailStrings.CalInvite_SuccessDeclined);
      case ParticipationStatus.Tentative:
        return t(BrightMailStrings.CalInvite_SuccessTentative);
      default:
        return '';
    }
  };

  return (
    <Box
      data-testid="calendar-invite-card"
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        my: 2,
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <CalendarTodayIcon color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight={600}>
          {t(BrightMailStrings.CalInvite_Title)}
        </Typography>

        {isCancelled && (
          <Chip
            icon={<CancelIcon />}
            label={t(BrightMailStrings.CalInvite_Cancelled)}
            color="error"
            size="small"
          />
        )}
        {isCounter && (
          <Chip
            label={t(BrightMailStrings.CalInvite_Counter)}
            color="warning"
            size="small"
          />
        )}
        {rsvpStatus && (
          <Chip
            label={respondedLabel()}
            color={respondedChipColor()}
            size="small"
          />
        )}
      </Stack>

      <Divider sx={{ mb: 1.5 }} />

      {/* Event details */}
      <Stack spacing={0.75}>
        <Typography variant="h6">{invite.summary}</Typography>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <ScheduleIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {invite.allDay
              ? `${dateLabel} – ${t(BrightMailStrings.CalInvite_AllDay)}`
              : dateLabel}
          </Typography>
        </Stack>

        {invite.location && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <LocationOnIcon fontSize="small" color="action" />
            <Typography variant="body2">{invite.location}</Typography>
          </Stack>
        )}

        <Typography variant="body2" color="text.secondary">
          {t(BrightMailStrings.CalInvite_Organizer)}: {invite.organizerName ?? invite.organizerEmail}
        </Typography>

        {invite.attendees.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {t(BrightMailStrings.CalInvite_AttendeesTemplate, {
              count: String(invite.attendees.length),
            })}
          </Typography>
        )}

        {invite.description && (
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}
          >
            {invite.description}
          </Typography>
        )}
      </Stack>

      {/* CANCEL banner */}
      {isCancelled && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(BrightMailStrings.CalInvite_CancelledBody)}
        </Alert>
      )}

      {/* COUNTER banner */}
      {isCounter && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t(BrightMailStrings.CalInvite_CounterBody)}
        </Alert>
      )}

      {/* REPLY read-only banner (organizer view) */}
      {isReply && invite.attendees[0] && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t(BrightMailStrings.CalInvite_ResponseTemplate, {
            name:
              invite.attendees[0].displayName ?? invite.attendees[0].email,
            status: invite.attendees[0].partstat,
          })}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      {/* RSVP actions (REQUEST only, when not yet responded) */}
      {isRequest && onRsvp && !rsvpStatus && (
        <ButtonGroup
          variant="outlined"
          size="small"
          disabled={loading}
          sx={{ mt: 2 }}
          aria-label="RSVP"
        >
          <Button
            startIcon={<CheckCircleOutlineIcon />}
            onClick={() => handleRsvp(ParticipationStatus.Accepted)}
          >
            {t(BrightMailStrings.CalInvite_Accept)}
          </Button>
          <Button
            startIcon={<HelpOutlineIcon />}
            onClick={() => handleRsvp(ParticipationStatus.Tentative)}
          >
            {t(BrightMailStrings.CalInvite_Tentative)}
          </Button>
          <Button
            startIcon={<CancelIcon />}
            onClick={() => handleRsvp(ParticipationStatus.Declined)}
          >
            {t(BrightMailStrings.CalInvite_Decline)}
          </Button>
        </ButtonGroup>
      )}

      {/* View in Calendar (if already imported) */}
      {isRequest && rsvpStatus && (
        <Button
          variant="text"
          size="small"
          sx={{ mt: 1 }}
          onClick={handleAddToCalendar}
        >
          {t(BrightMailStrings.CalInvite_ViewInCalendar)}
        </Button>
      )}

      {/* Add to Calendar (non-iTIP .ics attachment, no RSVP flow) */}
      {!isRequest && !isCancelled && onAddToCalendar && (
        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 2 }}
          onClick={handleAddToCalendar}
          disabled={loading}
        >
          {t(BrightMailStrings.CalInvite_AddToCalendar)}
        </Button>
      )}
    </Box>
  );
};

export default memo(CalendarInviteCard);
