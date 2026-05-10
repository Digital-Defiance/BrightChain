/**
 * Scheduling Portability Interfaces
 *
 * Extends the order export bundle with Schedule, Slot, Appointment,
 * and waitlist entry arrays for full-fidelity scheduling data migration.
 *
 * The canonical `ISchedulingExportBundle` definition lives in the serializer
 * module (`serializer/schedulingSerializer.ts`). This module re-exports it
 * so consumers can import from the portability path without pulling in
 * serializer-specific types.
 *
 * @see Requirements 16.1, 16.2
 * @module scheduling/portability/schedulingPortability
 */

export type { ISchedulingExportBundle } from '../serializer/schedulingSerializer';
