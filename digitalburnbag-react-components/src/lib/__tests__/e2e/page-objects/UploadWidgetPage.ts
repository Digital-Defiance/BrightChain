/**
 * Page Object Model for the UploadWidget + Joule upload pipeline.
 *
 * The upload widget is rendered inline on the "My Files" section of
 * BurnbagPage. Selecting a file does NOT immediately upload it — it
 * enqueues the file in `jouleUploadQueue` and BurnbagPage opens a
 * `JouleUploadForm` dialog for tier/duration selection. After the user
 * clicks "Continue" the chunks upload and an `UploadCostApprovalModal`
 * opens; the user must click "Confirm Upload" to actually commit the file
 * to storage. The legacy POM that only called `setInputFiles` left the
 * upload sitting in the form dialog and the file never appeared in the
 * browser, which is why ~20 specs were skipping with "API-seeded file did
 * not appear in file browser".
 *
 * This POM drives the full pipeline by default. Pass `skipApproval: true`
 * to leave the cost-approval dialog open (for tests that assert on the
 * modal itself), or `skipForm: true` to leave the form dialog open.
 */
import { expect, Locator, Page } from '@playwright/test';

export interface UploadFileSpec {
  name: string;
  content: string;
  mimeType?: string;
}

export interface UploadOptions {
  /** Leave the JouleUploadForm dialog open without submitting. */
  skipForm?: boolean;
  /** Submit the JouleUploadForm but leave the cost-approval modal open. */
  skipApproval?: boolean;
  /** Override the timeout used while waiting for chunks to upload. */
  uploadTimeoutMs?: number;
}

export class UploadWidgetPage {
  readonly page: Page;
  readonly dropZone: Locator;
  readonly fileInput: Locator;
  readonly progressBars: Locator;
  readonly jouleFormDialog: Locator;
  readonly continueButton: Locator;
  readonly cancelFormButton: Locator;
  readonly costApprovalDialog: Locator;
  readonly confirmUploadButton: Locator;
  readonly cancelApprovalButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dropZone = page.getByText(/drag.*drop|drop.*files|click to browse/i);
    // The Joule upload pipeline mounts a hidden file input inside the
    // UploadWidget; PostComposer / BurnbagPage may also mount image/video
    // inputs elsewhere on the page. Scope to the multi-file widget input.
    this.fileInput = page
      .locator('input[type="file"][multiple]')
      .first();
    this.progressBars = page.getByRole('progressbar');
    // JouleUploadForm renders inside an MUI Dialog whose DialogTitle text
    // is `Joule_FormAriaLabel` ("Upload configuration form" in en-US) —
    // and the inner form has aria-label set to the same string. We match
    // the dialog by its title to keep this resilient to localization
    // changes affecting only the inner role="form" aria-label.
    this.jouleFormDialog = page
      .getByRole('dialog')
      .filter({ hasText: /upload configuration form|upload new version/i });
    this.continueButton = this.jouleFormDialog.getByRole('button', {
      name: /continue/i,
    });
    this.cancelFormButton = this.jouleFormDialog.getByRole('button', {
      name: /cancel/i,
    });
    // UploadCostApprovalModal uses aria-labelledby="upload-cost-approval-title"
    this.costApprovalDialog = page.locator(
      '[role="dialog"][aria-labelledby="upload-cost-approval-title"]',
    );
    this.confirmUploadButton = this.costApprovalDialog.getByRole('button', {
      name: /confirm upload/i,
    });
    this.cancelApprovalButton = this.costApprovalDialog.getByRole('button', {
      name: /cancel/i,
    });
  }

  /**
   * Select a single file and drive the full upload pipeline (form Continue
   * → chunk upload → cost approval Confirm Upload) to completion. The file
   * will appear in the browser table once `loadFolderContents` re-fetches.
   */
  async uploadFile(
    name: string,
    content: string,
    mimeType = 'text/plain',
    options: UploadOptions = {},
  ): Promise<void> {
    await this.selectFiles([{ name, content, mimeType }]);
    await this.completeOnePendingUpload(options);
  }

  /**
   * Select multiple files and drive each through the upload pipeline in
   * sequence. BurnbagPage queues files in `jouleUploadQueue` and only
   * renders the form for the head of the queue, so we drive one at a
   * time.
   */
  async uploadMultipleFiles(
    files: UploadFileSpec[],
    options: UploadOptions = {},
  ): Promise<void> {
    await this.selectFiles(files);
    for (let i = 0; i < files.length; i++) {
      const isLast = i === files.length - 1;
      // For non-last files we always complete the pipeline regardless of
      // skipForm/skipApproval — those flags only apply to the final file
      // which is what the test typically asserts on.
      await this.completeOnePendingUpload(isLast ? options : {});
    }
  }

  /** Just stage files via the input without driving any dialogs. */
  async selectFiles(files: UploadFileSpec[]): Promise<void> {
    await this.fileInput.setInputFiles(
      files.map((f) => ({
        name: f.name,
        mimeType: f.mimeType ?? 'text/plain',
        buffer: Buffer.from(f.content),
      })),
    );
  }

  /**
   * Drive a single queued file through the JouleUploadForm and the
   * UploadCostApprovalModal. Assumes the form dialog is about to appear
   * (or already visible).
   */
  async completeOnePendingUpload(options: UploadOptions = {}): Promise<void> {
    await expect(this.jouleFormDialog).toBeVisible({ timeout: 15_000 });
    if (options.skipForm) {
      return;
    }
    await expect(this.continueButton).toBeEnabled({ timeout: 15_000 });
    await this.continueButton.click();
    // After Continue, JouleUploadForm calls initUpload + uploadChunk in a
    // loop, then probes /quote. If Joule is enabled it opens the
    // UploadCostApprovalModal. If Joule is disabled (server returns 404
    // on /quote), the form transparently falls back to legacy /finalize
    // and emits onCommit directly, so the cost-approval modal never
    // appears.
    //
    // Confirm the click registered (button briefly disabled while
    // isUploading=true), then race for the cost-approval modal vs. an
    // auto-finalize signal (continue button re-enabled in a remounted
    // form, or the form unmounting entirely when the queue empties).
    await expect(this.continueButton)
      .toBeDisabled({ timeout: 5_000 })
      .catch(() => {
        // The auto-finalize round-trip may complete fast enough that the
        // disabled state is never observed; that's fine — fall through to
        // the modal vs. auto-finalize race below.
      });
    const modalAppeared = await Promise.race([
      this.costApprovalDialog
        .waitFor({
          state: 'visible',
          timeout: options.uploadTimeoutMs ?? 60_000,
        })
        .then(() => true)
        .catch(() => false),
      (async () => {
        const deadline =
          Date.now() + (options.uploadTimeoutMs ?? 60_000);
        while (Date.now() < deadline) {
          if (await this.costApprovalDialog.isVisible().catch(() => false)) {
            return true;
          }
          // Form unmounted entirely → auto-finalized last file.
          if (!(await this.jouleFormDialog.isVisible().catch(() => true))) {
            return false;
          }
          // Continue re-enabled with no modal → auto-finalized and form
          // remounted for the next queued file.
          if (await this.continueButton.isEnabled().catch(() => false)) {
            if (
              !(await this.costApprovalDialog.isVisible().catch(() => false))
            ) {
              return false;
            }
          }
          await new Promise((r) => setTimeout(r, 200));
        }
        return false;
      })(),
    ]);
    if (!modalAppeared) {
      // Joule disabled path: form auto-finalized via /finalize fallback.
      return;
    }
    if (options.skipApproval) {
      return;
    }
    // Wait for the quote to load — the Confirm Upload button is disabled
    // while phase === 'loading' and re-enables once the quote arrives.
    await expect(this.confirmUploadButton).toBeEnabled({ timeout: 30_000 });
    await this.confirmUploadButton.click();
    await expect(this.costApprovalDialog).toBeHidden({ timeout: 30_000 });
    // After commit, BurnbagPage closes the form dialog and dequeues. In
    // multi-file uploads the next file's form opens immediately, so we
    // do not assert jouleFormDialog.toBeHidden here — callers drive that
    // synchronization via the next iteration's visibility wait.
  }

  /** Cancel an open JouleUploadForm dialog. */
  async cancelUpload(): Promise<void> {
    await expect(this.jouleFormDialog).toBeVisible();
    await this.cancelFormButton.click();
    await expect(this.jouleFormDialog).toBeHidden({ timeout: 10_000 });
  }

  /** Cancel an open UploadCostApprovalModal (discards the session). */
  async discardCostApproval(): Promise<void> {
    await expect(this.costApprovalDialog).toBeVisible();
    await this.cancelApprovalButton.click();
    await expect(this.costApprovalDialog).toBeHidden({ timeout: 30_000 });
  }

  /** Confirm an already-open UploadCostApprovalModal. */
  async approveCostApproval(): Promise<void> {
    await expect(this.costApprovalDialog).toBeVisible();
    await expect(this.confirmUploadButton).toBeEnabled({ timeout: 30_000 });
    await this.confirmUploadButton.click();
    await expect(this.costApprovalDialog).toBeHidden({ timeout: 30_000 });
  }

  /** Wait for any leftover progress bars to disappear. */
  async waitForUploadComplete(timeout = 30_000): Promise<void> {
    await this.page
      .waitForFunction(
        () =>
          window.document.querySelectorAll('[role="progressbar"]').length === 0,
        { timeout },
      )
      .catch(() => {
        // Best effort — chunk progress is short-lived; a remaining bar may
        // belong to an unrelated component (e.g. the file browser loader).
      });
  }

  async getProgressCount(): Promise<number> {
    return this.progressBars.count();
  }
}
