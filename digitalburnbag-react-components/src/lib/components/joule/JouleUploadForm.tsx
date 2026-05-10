import type {
  BurnbagStorageTier,
  IUploadCommitResultDTO,
} from '@brightchain/digitalburnbag-lib';
import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';
import type { IApiUploadSessionDTO } from '../../services/burnbag-api-client';

import {
  ApiError,
  type BurnbagApiClient,
} from '../../services/burnbag-api-client';
import { computeChunkChecksum } from '../../utils/upload-utils';
import { StorageCostPreview } from './StorageCostPreview';
import { StorageDurationPicker } from './StorageDurationPicker';
import { StorageTierSelector } from './StorageTierSelector';
import { UploadCostApprovalModal } from './UploadCostApprovalModal';

export interface IJouleUploadFormProps {
  /** The File object to upload. Size, name, and MIME type are derived from it. */
  file: File;
  /** Current Joule balance available in the user's wallet (optional — omit if unknown). */
  availableBalance?: bigint;
  folderId: string;
  vaultContainerId: string;
  apiClient: BurnbagApiClient;
  onCommit: (
    result: IUploadCommitResultDTO,
    uploadSession: IApiUploadSessionDTO,
  ) => void;
  /** Called when the user discards or the quote expires. */
  onDiscard: () => void;
  /** Optional: disable all form controls while an upload is in flight. */
  disabled?: boolean;
  /**
   * Optional override for session initialization.
   * When provided, called instead of `apiClient.initUpload()`.
   * Use this for new-version uploads where the session must be created
   * via `initUploadNewVersion` rather than `initUpload`.
   * Receives the selected tier and durationDays so the caller can pass them.
   */
  initSession?: (
    tier: BurnbagStorageTier,
    durationDays: number,
  ) => Promise<IApiUploadSessionDTO>;
}

/**
 * Joule-aware upload configuration form.
 *
 * Renders `StorageTierSelector`, `StorageDurationPicker`, and
 * `StorageCostPreview` so the user can choose tier and duration, see a
 * real-time cost estimate, and then initiate the upload (which opens
 * `UploadCostApprovalModal` for final confirmation).
 *
 * Requirement 8.11 (Phase 6.7)
 */
export function JouleUploadForm({
  file,
  availableBalance,
  folderId,
  vaultContainerId,
  apiClient,
  onCommit,
  onDiscard,
  disabled = false,
  initSession,
}: IJouleUploadFormProps) {
  const bytes = BigInt(file.size);
  const [tier, setTier] = useState<BurnbagStorageTier>('standard');
  const [durationDays, setDurationDays] = useState(30);
  const [hasBurnDate, setHasBurnDate] = useState(false);
  const [uploadSession, setUploadSession] =
    useState<IApiUploadSessionDTO | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [chunkProgress, setChunkProgress] = useState(0);
  const { tBranded: t } = useI18n();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setInitError(null);
      setIsUploading(true);
      setChunkProgress(0);
      try {
        const session = initSession
          ? await initSession(tier, durationDays)
          : await apiClient.initUpload(
              file.name,
              file.type || 'application/octet-stream',
              file.size,
              folderId,
              vaultContainerId,
              tier,
              durationDays,
            );

        // Upload all chunks before requesting a quote.
        // quote() on the server requires all chunks to be received first.
        const { sessionId, chunkSize, totalChunks } = session;
        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = await file.slice(start, end).arrayBuffer();
          const checksum = computeChunkChecksum(chunk);
          await apiClient.uploadChunk(sessionId, i, chunk, checksum);
          setChunkProgress(Math.round(((i + 1) / totalChunks) * 100));
        }

        // Probe whether the Joule storage economy is enabled on the server
        // by attempting to fetch a cost quote. When Joule is disabled the
        // server responds 404 to /quote, /commit, /discard — in that case
        // we transparently fall back to the legacy `/upload/:id/finalize`
        // endpoint so users can still upload. This mirrors the behaviour
        // of the e2e seedFile fixture and matches the public contract for
        // Joule-disabled deployments.
        try {
          await apiClient.quoteUpload(sessionId);
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            const finalized = await apiClient.finalizeUpload(sessionId);
            const synthetic = {
              fileId: finalized.id,
              fileName: finalized.name,
              metadata: finalized,
            } as unknown as IUploadCommitResultDTO;
            onCommit(synthetic, session);
            return;
          }
          throw err;
        }

        setUploadSession(session);
        setApprovalOpen(true);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : t(DigitalBurnbagStrings.Joule_InitUploadFailed);
        setInitError(msg);
      } finally {
        setIsUploading(false);
      }
    },
    [
      apiClient,
      durationDays,
      file,
      folderId,
      vaultContainerId,
      tier,
      t,
      initSession,
      onCommit,
    ],
  );

  const handleApprovalCommit = useCallback(
    (result: IUploadCommitResultDTO) => {
      const session = uploadSession!;
      setApprovalOpen(false);
      setUploadSession(null);
      onCommit(result, session);
    },
    [onCommit, uploadSession],
  );

  const handleApprovalDiscard = useCallback(() => {
    setApprovalOpen(false);
    setUploadSession(null);
    onDiscard();
  }, [onDiscard]);

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      aria-label={t(DigitalBurnbagStrings.Joule_FormAriaLabel)}
      role="form"
    >
      <Stack spacing={3}>
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            gutterBottom
            id="storage-tier-label"
          >
            {t(DigitalBurnbagStrings.Joule_StorageTierTitle)}
          </Typography>
          <StorageTierSelector
            value={tier}
            onChange={setTier}
            disabled={disabled}
          />
        </Box>

        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            gutterBottom
            id="storage-duration-label"
          >
            {t(DigitalBurnbagStrings.Joule_StorageDurationTitle)}
          </Typography>
          <StorageDurationPicker
            value={durationDays}
            onChange={setDurationDays}
            disabled={disabled}
          />
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={hasBurnDate}
              onChange={(e) => setHasBurnDate(e.target.checked)}
              disabled={disabled}
              inputProps={{
                'aria-label': t(
                  DigitalBurnbagStrings.Joule_BurnDateCheckboxAriaLabel,
                ),
              }}
            />
          }
          label={t(DigitalBurnbagStrings.Joule_BurnDateCheckboxLabel)}
        />

        <StorageCostPreview
          bytes={bytes}
          tier={tier}
          durationDays={durationDays}
          hasBurnDate={hasBurnDate}
          availableBalance={availableBalance}
        />

        {initError && (
          <Typography color="error.main" role="alert" aria-live="assertive">
            {initError}
          </Typography>
        )}

        <Box
          display="flex"
          justifyContent="flex-end"
          alignItems="center"
          gap={1}
        >
          {isUploading && (
            <CircularProgress
              size={20}
              variant={chunkProgress > 0 ? 'determinate' : 'indeterminate'}
              value={chunkProgress}
              aria-label={`${chunkProgress}%`}
            />
          )}
          <Button
            variant="outlined"
            disabled={isUploading}
            onClick={onDiscard}
            aria-label={t(DigitalBurnbagStrings.Joule_CancelButtonAriaLabel)}
          >
            {t(DigitalBurnbagStrings.Joule_CancelButton)}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={disabled || isUploading || bytes <= 0n}
            aria-label={t(DigitalBurnbagStrings.Joule_ContinueButtonAriaLabel)}
          >
            {t(DigitalBurnbagStrings.Joule_ContinueButton)}
          </Button>
        </Box>
      </Stack>

      {uploadSession && (
        <UploadCostApprovalModal
          open={approvalOpen}
          sessionId={uploadSession.sessionId}
          availableJouleBalance={availableBalance}
          apiClient={apiClient}
          onCommit={handleApprovalCommit}
          onDiscard={handleApprovalDiscard}
        />
      )}
    </Box>
  );
}
