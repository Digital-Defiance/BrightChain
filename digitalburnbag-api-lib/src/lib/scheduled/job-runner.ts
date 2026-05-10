/**
 * Scheduled job runner — executes periodic background tasks on configurable
 * intervals. Each job runs independently; failures in one job do not block others.
 */

export interface IScheduledJob {
  name: string;
  intervalMs: number;
  execute: () => Promise<void>;
}

export interface IJobRunnerOptions {
  onError?: (jobName: string, error: unknown) => void;
}

export class JobRunner {
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private readonly onError: (jobName: string, error: unknown) => void;

  constructor(options?: IJobRunnerOptions) {
    this.onError =
      options?.onError ??
      ((name, err) => {
        console.error(`[JobRunner] ${name} failed:`, err);
      });
  }

  /**
   * Register and start a scheduled job.
   */
  start(job: IScheduledJob): void {
    if (this.timers.has(job.name)) {
      throw new Error(`Job "${job.name}" is already running`);
    }

    const timer = setInterval(async () => {
      try {
        await job.execute();
      } catch (err: unknown) {
        this.onError(job.name, err);
      }
    }, job.intervalMs);

    this.timers.set(job.name, timer);
  }

  /**
   * Stop a specific job by name.
   */
  stop(jobName: string): void {
    const timer = this.timers.get(jobName);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(jobName);
    }
  }

  /**
   * Stop all running jobs.
   */
  stopAll(): void {
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
      this.timers.delete(name);
    }
  }

  /**
   * List names of currently running jobs.
   */
  listRunning(): string[] {
    return Array.from(this.timers.keys());
  }
}
