/**
 * ProgressReporter — wraps `vscode.window.withProgress` for upload/download
 * progress notifications with cancellation support.
 */

import * as vscode from 'vscode';

/**
 * Calculate the progress percentage for a chunk-based operation.
 * Exported for testability.
 *
 * @param chunksCompleted - Number of chunks completed (1-indexed after completion)
 * @param totalChunks - Total number of chunks
 * @returns Progress fraction between 0 and 1
 */
export function calculateProgress(
  chunksCompleted: number,
  totalChunks: number,
): number {
  if (totalChunks <= 0) return 0;
  return Math.min(chunksCompleted / totalChunks, 1);
}

export interface IProgressTask<T> {
  (
    report: (fraction: number, message?: string) => void,
    cancellationToken: vscode.CancellationToken,
  ): Promise<T>;
}

export class ProgressReporter extends vscode.Disposable {
  constructor() {
    super(() => {
      /* no-op */
    });
  }

  /**
   * Run a task with a VS Code progress notification.
   *
   * @param title - The title shown in the progress notification
   * @param task - Async function receiving a report callback and cancellation token
   * @returns The result of the task
   */
  async withProgress<T>(
    title: string,
    task: IProgressTask<T>,
    cancellable = true,
  ): Promise<T> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable,
      },
      async (progress, token) => {
        let lastReportedPercent = 0;

        const report = (fraction: number, message?: string): void => {
          const percent = Math.round(fraction * 100);
          const increment = percent - lastReportedPercent;
          if (increment > 0) {
            progress.report({ increment, message });
            lastReportedPercent = percent;
          } else if (message) {
            progress.report({ message });
          }
        };

        return task(report, token);
      },
    );
  }
}
