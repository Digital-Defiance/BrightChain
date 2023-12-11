/**
 * Circuit breaker states for the PoUW work coordination subsystem.
 *
 * - **Closed**: Normal PoUW operation. Work units are issued and verified.
 * - **Open**: Degraded mode. Traditional HTTP 429 + Retry-After. No work units issued.
 * - **Half-Open**: A single probe work unit is issued. If it succeeds, the circuit
 *   closes. If it fails, the circuit reopens.
 */
type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker for the PoUW work coordination subsystem.
 *
 * Opens after consecutive failures, periodically probes for recovery.
 *
 * State transitions:
 * ```
 * [*] --> Closed
 * Closed --> Open:     consecutiveFailures >= threshold
 * Open --> HalfOpen:   probeInterval elapsed
 * HalfOpen --> Closed: probe succeeds (recordSuccess)
 * HalfOpen --> Open:   probe fails (recordFailure)
 * ```
 *
 * @see Requirements 13.3, 13.4
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private consecutiveFailures = 0;
  private lastFailureTime: number | null = null;
  private lastProbeTime: number | null = null;

  /**
   * @param threshold - Number of consecutive failures before the circuit opens
   * @param probeIntervalMs - Milliseconds to wait before attempting a recovery probe
   */
  constructor(
    private readonly threshold: number,
    private readonly probeIntervalMs: number,
  ) {}

  /**
   * Record a successful operation.
   *
   * Resets the consecutive failure count and transitions the circuit
   * to the closed state. This is used both during normal operation
   * (to keep the circuit closed) and after a successful probe
   * (to transition from half-open back to closed).
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'closed';
  }

  /**
   * Record a failed operation.
   *
   * Increments the consecutive failure count and records the failure
   * timestamp. If the failure count meets or exceeds the threshold,
   * the circuit transitions to the open state.
   *
   * When called in the half-open state (during a probe), the circuit
   * transitions back to open.
   */
  recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.consecutiveFailures >= this.threshold) {
      this.state = 'open';
    }
  }

  /**
   * Whether the circuit is currently open (degraded mode).
   *
   * Returns `true` only when the circuit is in the `open` state.
   * In the `half-open` state, the system should issue a probe,
   * so `isOpen` returns `false` to allow the probe request through.
   */
  get isOpen(): boolean {
    return this.state === 'open';
  }

  /**
   * Check whether enough time has elapsed to attempt a recovery probe.
   *
   * If the circuit is open and the probe interval has elapsed since
   * the last failure, transitions the circuit to half-open and returns
   * `true`. The caller should then issue a single probe work unit.
   *
   * - If the probe succeeds, call `recordSuccess()` to close the circuit.
   * - If the probe fails, call `recordFailure()` to reopen the circuit.
   *
   * @returns `true` if a probe should be attempted, `false` otherwise
   */
  shouldProbe(): boolean {
    if (this.state !== 'open') {
      return false;
    }

    if (this.lastFailureTime === null) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastFailureTime >= this.probeIntervalMs) {
      this.state = 'half-open';
      this.lastProbeTime = now;
      return true;
    }

    return false;
  }
}
