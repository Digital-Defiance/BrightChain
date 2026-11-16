/**
 * An adapter with a deliberate fault, for testing the conformance machinery
 * itself. A differential runner, a shrinker and a freezer only prove
 * something if they notice a subject that is wrong, so the tests wrap a
 * correct adapter and break one behavior on purpose.
 */
import type {
  AdapterSession,
  ConformanceAdapter,
  ProfileConfig,
  StateSpec,
  Step,
  StepOutcome,
} from '../../src/lib/v2/conformance/types';

/** A fault: sees every step after the real adapter ran it and may change what happens. */
export type Fault = (
  step: Step,
  outcome: StepOutcome,
  session: AdapterSession,
) => Promise<StepOutcome>;

export class FaultyAdapter implements ConformanceAdapter {
  constructor(
    private readonly base: ConformanceAdapter,
    private readonly fault: Fault,
  ) {}

  get runtime(): ConformanceAdapter['runtime'] {
    return this.base.runtime;
  }
  get capabilities(): ReadonlySet<string> {
    return this.base.capabilities;
  }
  get profiles(): ReadonlySet<string> {
    return this.base.profiles;
  }

  async open(
    profile: ProfileConfig,
    initial?: StateSpec,
  ): Promise<AdapterSession> {
    const session = await this.base.open(profile, initial);
    return {
      run: async (step) => this.fault(step, await session.run(step), session),
      readState: (db) => session.readState(db),
      close: () => session.close(),
    };
  }
}

/** After a `replaceById`, silently delete the record, as a lossy replace would. */
export const dropOnReplace: Fault = async (step, outcome, session) => {
  if (step.op === 'replaceById') {
    await session.run({
      op: 'deleteById',
      db: step.db,
      collection: step.collection,
      args: { id: step.args?.['id'] ?? null },
    });
  }
  return outcome;
};

/**
 * After an `insertOne` on one database, silently delete the record there.
 * The step itself still reports success, so only the final state shows it.
 */
export const dropInsertsOn =
  (db: string): Fault =>
  async (step, outcome, session) => {
    if (step.op === 'insertOne' && step.db === db) {
      const document = step.args?.['document'];
      const id =
        typeof document === 'object' &&
        document !== null &&
        !Array.isArray(document)
          ? document['_id']
          : undefined;
      await session.run({
        op: 'deleteById',
        db,
        collection: step.collection,
        args: { id: id ?? null },
      });
    }
    return outcome;
  };

/** Report a root that was never saved as `Unknown`, as a disk store does for a bad digest. */
export const unsavedRootIsUnknown: Fault = async (step, outcome) =>
  step.op === 'findAt' && !outcome.ok
    ? {
        ok: false,
        error: { category: 'Unknown', message: 'unreadable root digest' },
      }
    : outcome;

/** Return a different generated id from `insertOne` than the one stored. */
export const misreportInsertedId: Fault = async (step, outcome) =>
  step.op === 'insertOne' && outcome.ok
    ? { ok: true, value: { acknowledged: true, insertedId: 'f'.repeat(32) } }
    : outcome;

/** Give every failure a code the model does not report. */
export const wrongErrorCode: Fault = async (_step, outcome) =>
  !outcome.ok && outcome.error
    ? {
        ok: false,
        error: { ...outcome.error, code: 'malformed_operand' },
      }
    : outcome;

/** Fail every `insertOne`, though the model succeeds. */
export const refuseInsert: Fault = async (step, outcome) =>
  step.op === 'insertOne' && outcome.ok
    ? { ok: false, error: { category: 'Closed', message: 'refused' } }
    : outcome;
