/**
 * @fileoverview Availability Metrics Implementation
 *
 * Tracks and exports metrics about block availability, discovery operations,
 * partition mode, and reconciliation for monitoring and observability.
 *
 * @see Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 */

/* eslint-disable @nx/enforce-module-boundaries */
import { AvailabilityState } from '@brightchain/brightchain-lib';

/**
 * Metrics for block availability tracking.
 */
export interface AvailabilityMetrics {
  /**
   * Count of blocks in each availability state
   */
  blockCounts: {
    [AvailabilityState.Local]: number;
    [AvailabilityState.Remote]: number;
    [AvailabilityState.Cached]: number;
    [AvailabilityState.Orphaned]: number;
    [AvailabilityState.Unknown]: number;
  };

  /**
   * Discovery query metrics
   */
  discovery: {
    /**
     * Total number of discovery queries
     */
    totalQueries: number;

    /**
     * Number of successful discoveries
     */
    successfulQueries: number;

    /**
     * Number of failed discoveries
     */
    failedQueries: number;

    /**
     * Average discovery latency in milliseconds
     */
    averageLatencyMs: number;

    /**
     * Minimum discovery latency in milliseconds
     */
    minLatencyMs: number;

    /**
     * Maximum discovery latency in milliseconds
     */
    maxLatencyMs: number;
  };

  /**
   * Partition mode metrics
   */
  partition: {
    /**
     * Whether currently in partition mode
     */
    inPartitionMode: boolean;

    /**
     * Total time spent in partition mode (milliseconds)
     */
    totalDurationMs: number;

    /**
     * Number of times partition mode was entered
     */
    entryCount: number;

    /**
     * Timestamp of last partition entry (ISO string)
     */
    lastEntryAt: string | null;

    /**
     * Timestamp of last partition exit (ISO string)
     */
    lastExitAt: string | null;
  };

  /**
   * Reconciliation metrics
   */
  reconciliation: {
    /**
     * Total number of reconciliation operations
     */
    totalOperations: number;

    /**
     * Number of successful reconciliations
     */
    successfulOperations: number;

    /**
     * Number of failed reconciliations
     */
    failedOperations: number;

    /**
     * Total blocks discovered during reconciliation
     */
    blocksDiscovered: number;

    /**
     * Total blocks updated during reconciliation
     */
    blocksUpdated: number;

    /**
     * Total orphans resolved during reconciliation
     */
    orphansResolved: number;

    /**
     * Total conflicts resolved during reconciliation
     */
    conflictsResolved: number;

    /**
     * Average reconciliation duration in milliseconds
     */
    averageDurationMs: number;
  };

  /**
   * Timestamp when metrics were last updated (ISO string)
   */
  lastUpdated: string;
}

/**
 * Prometheus-compatible metric format.
 */
export interface PrometheusMetric {
  /**
   * Metric name
   */
  name: string;

  /**
   * Metric type (counter, gauge, histogram, summary)
   */
  type: 'counter' | 'gauge' | 'histogram' | 'summary';

  /**
   * Help text describing the metric
   */
  help: string;

  /**
   * Metric value
   */
  value: number;

  /**
   * Optional labels for the metric
   */
  labels?: Record<string, string>;
}

/**
 * Availability Metrics Tracker
 *
 * Tracks metrics about block availability, discovery, partition mode,
 * and reconciliation operations. Provides methods to update metrics
 * and export them in Prometheus-compatible format.
 *
 * @see Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 */
export class AvailabilityMetricsTracker {
  /**
   * Block counts by state
   */
  private blockCounts: Map<AvailabilityState, number> = new Map([
    [AvailabilityState.Local, 0],
    [AvailabilityState.Remote, 0],
    [AvailabilityState.Cached, 0],
    [AvailabilityState.Orphaned, 0],
    [AvailabilityState.Unknown, 0],
  ]);

  /**
   * Discovery query tracking
   */
  private discoveryQueries = {
    total: 0,
    successful: 0,
    failed: 0,
    latencies: [] as number[],
  };

  /**
   * Partition mode tracking
   */
  private partitionData = {
    inPartitionMode: false,
    totalDurationMs: 0,
    entryCount: 0,
    lastEntryAt: null as Date | null,
    lastExitAt: null as Date | null,
    currentEntryAt: null as Date | null,
  };

  /**
   * Reconciliation tracking
   */
  private reconciliationData = {
    total: 0,
    successful: 0,
    failed: 0,
    blocksDiscovered: 0,
    blocksUpdated: 0,
    orphansResolved: 0,
    conflictsResolved: 0,
    durations: [] as number[],
  };

  /**
   * Set the count of blocks in a specific state.
   *
   * @param state - Availability state
   * @param count - Number of blocks in this state
   */
  setBlockCount(state: AvailabilityState, count: number): void {
    this.blockCounts.set(state, count);
  }

  /**
   * Increment the count of blocks in a specific state.
   *
   * @param state - Availability state
   * @param delta - Amount to increment (default: 1)
   */
  incrementBlockCount(state: AvailabilityState, delta = 1): void {
    const current = this.blockCounts.get(state) || 0;
    this.blockCounts.set(state, current + delta);
  }

  /**
   * Decrement the count of blocks in a specific state.
   *
   * @param state - Availability state
   * @param delta - Amount to decrement (default: 1)
   */
  decrementBlockCount(state: AvailabilityState, delta = 1): void {
    const current = this.blockCounts.get(state) || 0;
    this.blockCounts.set(state, Math.max(0, current - delta));
  }

  /**
   * Record a discovery query.
   *
   * @param success - Whether the query was successful
   * @param latencyMs - Query latency in milliseconds
   */
  recordDiscoveryQuery(success: boolean, latencyMs: number): void {
    this.discoveryQueries.total++;
    if (success) {
      this.discoveryQueries.successful++;
    } else {
      this.discoveryQueries.failed++;
    }
    this.discoveryQueries.latencies.push(latencyMs);

    // Keep only last 1000 latencies to prevent unbounded growth
    if (this.discoveryQueries.latencies.length > 1000) {
      this.discoveryQueries.latencies.shift();
    }
  }

  /**
   * Record entering partition mode.
   */
  enterPartitionMode(): void {
    if (!this.partitionData.inPartitionMode) {
      this.partitionData.inPartitionMode = true;
      this.partitionData.entryCount++;
      this.partitionData.currentEntryAt = new Date();
      this.partitionData.lastEntryAt = this.partitionData.currentEntryAt;
    }
  }

  /**
   * Record exiting partition mode.
   */
  exitPartitionMode(): void {
    if (this.partitionData.inPartitionMode) {
      this.partitionData.inPartitionMode = false;
      this.partitionData.lastExitAt = new Date();

      // Calculate duration if we have an entry timestamp
      if (this.partitionData.currentEntryAt) {
        const duration =
          this.partitionData.lastExitAt.getTime() -
          this.partitionData.currentEntryAt.getTime();
        this.partitionData.totalDurationMs += duration;
        this.partitionData.currentEntryAt = null;
      }
    }
  }

  /**
   * Record a reconciliation operation.
   *
   * @param success - Whether the reconciliation was successful
   * @param durationMs - Reconciliation duration in milliseconds
   * @param blocksDiscovered - Number of blocks discovered
   * @param blocksUpdated - Number of blocks updated
   * @param orphansResolved - Number of orphans resolved
   * @param conflictsResolved - Number of conflicts resolved
   */
  recordReconciliation(
    success: boolean,
    durationMs: number,
    blocksDiscovered: number,
    blocksUpdated: number,
    orphansResolved: number,
    conflictsResolved: number,
  ): void {
    this.reconciliationData.total++;
    if (success) {
      this.reconciliationData.successful++;
    } else {
      this.reconciliationData.failed++;
    }
    this.reconciliationData.blocksDiscovered += blocksDiscovered;
    this.reconciliationData.blocksUpdated += blocksUpdated;
    this.reconciliationData.orphansResolved += orphansResolved;
    this.reconciliationData.conflictsResolved += conflictsResolved;
    this.reconciliationData.durations.push(durationMs);

    // Keep only last 100 durations to prevent unbounded growth
    if (this.reconciliationData.durations.length > 100) {
      this.reconciliationData.durations.shift();
    }
  }

  /**
   * Get current metrics snapshot.
   *
   * @returns Current availability metrics
   */
  getMetrics(): AvailabilityMetrics {
    // Calculate average discovery latency
    const avgDiscoveryLatency =
      this.discoveryQueries.latencies.length > 0
        ? this.discoveryQueries.latencies.reduce((a, b) => a + b, 0) /
          this.discoveryQueries.latencies.length
        : 0;

    // Calculate min/max discovery latency
    const minDiscoveryLatency =
      this.discoveryQueries.latencies.length > 0
        ? Math.min(...this.discoveryQueries.latencies)
        : 0;
    const maxDiscoveryLatency =
      this.discoveryQueries.latencies.length > 0
        ? Math.max(...this.discoveryQueries.latencies)
        : 0;

    // Calculate average reconciliation duration
    const avgReconciliationDuration =
      this.reconciliationData.durations.length > 0
        ? this.reconciliationData.durations.reduce((a, b) => a + b, 0) /
          this.reconciliationData.durations.length
        : 0;

    // Calculate total partition duration including current session if in partition mode
    let totalPartitionDuration = this.partitionData.totalDurationMs;
    if (
      this.partitionData.inPartitionMode &&
      this.partitionData.currentEntryAt
    ) {
      totalPartitionDuration +=
        Date.now() - this.partitionData.currentEntryAt.getTime();
    }

    return {
      blockCounts: {
        [AvailabilityState.Local]: this.blockCounts.get(
          AvailabilityState.Local,
        )!,
        [AvailabilityState.Remote]: this.blockCounts.get(
          AvailabilityState.Remote,
        )!,
        [AvailabilityState.Cached]: this.blockCounts.get(
          AvailabilityState.Cached,
        )!,
        [AvailabilityState.Orphaned]: this.blockCounts.get(
          AvailabilityState.Orphaned,
        )!,
        [AvailabilityState.Unknown]: this.blockCounts.get(
          AvailabilityState.Unknown,
        )!,
      },
      discovery: {
        totalQueries: this.discoveryQueries.total,
        successfulQueries: this.discoveryQueries.successful,
        failedQueries: this.discoveryQueries.failed,
        averageLatencyMs: avgDiscoveryLatency,
        minLatencyMs: minDiscoveryLatency,
        maxLatencyMs: maxDiscoveryLatency,
      },
      partition: {
        inPartitionMode: this.partitionData.inPartitionMode,
        totalDurationMs: totalPartitionDuration,
        entryCount: this.partitionData.entryCount,
        lastEntryAt: this.partitionData.lastEntryAt?.toISOString() || null,
        lastExitAt: this.partitionData.lastExitAt?.toISOString() || null,
      },
      reconciliation: {
        totalOperations: this.reconciliationData.total,
        successfulOperations: this.reconciliationData.successful,
        failedOperations: this.reconciliationData.failed,
        blocksDiscovered: this.reconciliationData.blocksDiscovered,
        blocksUpdated: this.reconciliationData.blocksUpdated,
        orphansResolved: this.reconciliationData.orphansResolved,
        conflictsResolved: this.reconciliationData.conflictsResolved,
        averageDurationMs: avgReconciliationDuration,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Export metrics in Prometheus-compatible format.
   *
   * @returns Array of Prometheus metrics
   */
  exportPrometheus(): PrometheusMetric[] {
    const metrics: PrometheusMetric[] = [];

    // Block count metrics
    for (const [state, count] of this.blockCounts.entries()) {
      metrics.push({
        name: 'brightchain_blocks_total',
        type: 'gauge',
        help: 'Total number of blocks by availability state',
        value: count,
        labels: { state },
      });
    }

    // Discovery metrics
    metrics.push(
      {
        name: 'brightchain_discovery_queries_total',
        type: 'counter',
        help: 'Total number of discovery queries',
        value: this.discoveryQueries.total,
      },
      {
        name: 'brightchain_discovery_queries_successful_total',
        type: 'counter',
        help: 'Total number of successful discovery queries',
        value: this.discoveryQueries.successful,
      },
      {
        name: 'brightchain_discovery_queries_failed_total',
        type: 'counter',
        help: 'Total number of failed discovery queries',
        value: this.discoveryQueries.failed,
      },
      {
        name: 'brightchain_discovery_latency_ms',
        type: 'summary',
        help: 'Discovery query latency in milliseconds',
        value:
          this.discoveryQueries.latencies.length > 0
            ? this.discoveryQueries.latencies.reduce((a, b) => a + b, 0) /
              this.discoveryQueries.latencies.length
            : 0,
      },
    );

    // Partition mode metrics
    let totalPartitionDuration = this.partitionData.totalDurationMs;
    if (
      this.partitionData.inPartitionMode &&
      this.partitionData.currentEntryAt
    ) {
      totalPartitionDuration +=
        Date.now() - this.partitionData.currentEntryAt.getTime();
    }

    metrics.push(
      {
        name: 'brightchain_partition_mode',
        type: 'gauge',
        help: 'Whether currently in partition mode (1 = yes, 0 = no)',
        value: this.partitionData.inPartitionMode ? 1 : 0,
      },
      {
        name: 'brightchain_partition_duration_ms_total',
        type: 'counter',
        help: 'Total time spent in partition mode in milliseconds',
        value: totalPartitionDuration,
      },
      {
        name: 'brightchain_partition_entries_total',
        type: 'counter',
        help: 'Total number of times partition mode was entered',
        value: this.partitionData.entryCount,
      },
    );

    // Reconciliation metrics
    metrics.push(
      {
        name: 'brightchain_reconciliation_operations_total',
        type: 'counter',
        help: 'Total number of reconciliation operations',
        value: this.reconciliationData.total,
      },
      {
        name: 'brightchain_reconciliation_operations_successful_total',
        type: 'counter',
        help: 'Total number of successful reconciliation operations',
        value: this.reconciliationData.successful,
      },
      {
        name: 'brightchain_reconciliation_operations_failed_total',
        type: 'counter',
        help: 'Total number of failed reconciliation operations',
        value: this.reconciliationData.failed,
      },
      {
        name: 'brightchain_reconciliation_blocks_discovered_total',
        type: 'counter',
        help: 'Total blocks discovered during reconciliation',
        value: this.reconciliationData.blocksDiscovered,
      },
      {
        name: 'brightchain_reconciliation_blocks_updated_total',
        type: 'counter',
        help: 'Total blocks updated during reconciliation',
        value: this.reconciliationData.blocksUpdated,
      },
      {
        name: 'brightchain_reconciliation_orphans_resolved_total',
        type: 'counter',
        help: 'Total orphans resolved during reconciliation',
        value: this.reconciliationData.orphansResolved,
      },
      {
        name: 'brightchain_reconciliation_conflicts_resolved_total',
        type: 'counter',
        help: 'Total conflicts resolved during reconciliation',
        value: this.reconciliationData.conflictsResolved,
      },
      {
        name: 'brightchain_reconciliation_duration_ms',
        type: 'summary',
        help: 'Reconciliation operation duration in milliseconds',
        value:
          this.reconciliationData.durations.length > 0
            ? this.reconciliationData.durations.reduce((a, b) => a + b, 0) /
              this.reconciliationData.durations.length
            : 0,
      },
    );

    return metrics;
  }

  /**
   * Format Prometheus metrics as text.
   *
   * @returns Prometheus text format
   */
  formatPrometheusText(): string {
    const metrics = this.exportPrometheus();
    const lines: string[] = [];

    // Group metrics by name for proper formatting
    const metricsByName = new Map<string, PrometheusMetric[]>();
    for (const metric of metrics) {
      if (!metricsByName.has(metric.name)) {
        metricsByName.set(metric.name, []);
      }
      metricsByName.get(metric.name)!.push(metric);
    }

    // Format each metric group
    for (const [name, metricGroup] of metricsByName.entries()) {
      const firstMetric = metricGroup[0];

      // Add HELP and TYPE lines
      lines.push(`# HELP ${name} ${firstMetric.help}`);
      lines.push(`# TYPE ${name} ${firstMetric.type}`);

      // Add metric values
      for (const metric of metricGroup) {
        let metricLine = name;
        if (metric.labels && Object.keys(metric.labels).length > 0) {
          const labelPairs = Object.entries(metric.labels)
            .map(([key, value]) => `${key}="${value}"`)
            .join(',');
          metricLine += `{${labelPairs}}`;
        }
        metricLine += ` ${metric.value}`;
        lines.push(metricLine);
      }

      lines.push(''); // Empty line between metric groups
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics to initial state.
   */
  reset(): void {
    this.blockCounts.clear();
    this.blockCounts.set(AvailabilityState.Local, 0);
    this.blockCounts.set(AvailabilityState.Remote, 0);
    this.blockCounts.set(AvailabilityState.Cached, 0);
    this.blockCounts.set(AvailabilityState.Orphaned, 0);
    this.blockCounts.set(AvailabilityState.Unknown, 0);

    this.discoveryQueries = {
      total: 0,
      successful: 0,
      failed: 0,
      latencies: [],
    };

    this.partitionData = {
      inPartitionMode: false,
      totalDurationMs: 0,
      entryCount: 0,
      lastEntryAt: null,
      lastExitAt: null,
      currentEntryAt: null,
    };

    this.reconciliationData = {
      total: 0,
      successful: 0,
      failed: 0,
      blocksDiscovered: 0,
      blocksUpdated: 0,
      orphansResolved: 0,
      conflictsResolved: 0,
      durations: [],
    };
  }
}
