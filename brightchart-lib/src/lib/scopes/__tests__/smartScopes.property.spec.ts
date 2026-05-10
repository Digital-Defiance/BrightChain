/**
 * Property-Based Tests for SMART on FHIR v2 Scopes
 *
 * Verifies:
 * (a) parseScope∘formatScope round-trip is identity
 * (b) scope evaluation grants access only when context, resource type, and action all match
 * (c) `system/*.*` scope grants universal access
 * (d) a scope with no matching action denies access
 *
 * **Validates: Requirements 7.1, 7.2**
 *
 * @module scopes/__tests__/smartScopes.property.spec
 */

import fc from 'fast-check';
import { evaluateScope } from '../scopeEvaluator';
import { formatScope, parseScope } from '../scopeParser';
import type { ISmartScopeDefinition } from '../smartScopes';
import { ScopeAction, ScopeContext } from '../smartScopes';

jest.setTimeout(30000);

// --- Smart Generators ---

const scopeContextArb: fc.Arbitrary<ScopeContext> = fc.constantFrom(
  ...Object.values(ScopeContext),
);

const scopeActionArb: fc.Arbitrary<ScopeAction> = fc.constantFrom(
  ...Object.values(ScopeAction),
);

/** Generate a valid FHIR resource type name (PascalCase alpha string) or '*' */
const resourceTypeArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant('*'),
  fc.constantFrom(
    'Patient',
    'Observation',
    'Encounter',
    'Condition',
    'Procedure',
    'MedicationRequest',
    'AllergyIntolerance',
    'DiagnosticReport',
    'Immunization',
    'CarePlan',
  ),
);

/** Generate a non-wildcard FHIR resource type */
const concreteResourceTypeArb: fc.Arbitrary<string> = fc.constantFrom(
  'Patient',
  'Observation',
  'Encounter',
  'Condition',
  'Procedure',
  'MedicationRequest',
  'AllergyIntolerance',
  'DiagnosticReport',
  'Immunization',
  'CarePlan',
);

/**
 * Generate a valid actions string: either '*' or a non-empty subset of {c,r,u,d,s}.
 * Actions are deduplicated and sorted to produce a canonical form.
 */
const actionsArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant('*'),
  fc
    .subarray(['c', 'r', 'u', 'd', 's'] as const, { minLength: 1 })
    .map((chars) => [...new Set(chars)].sort().join('')),
);

/** Generate a valid ISmartScopeDefinition with canonical (sorted, deduped) actions */
const scopeDefinitionArb: fc.Arbitrary<ISmartScopeDefinition> = fc.record({
  context: scopeContextArb,
  resourceType: resourceTypeArb,
  actions: actionsArb,
});

// --- Property Tests ---

describe('SMART on FHIR v2 Scopes - Property Tests', () => {
  /**
   * Property (a): parseScope∘formatScope round-trip is identity.
   *
   * For any valid scope definition, formatting it to a string and parsing
   * it back produces the same definition.
   *
   * **Validates: Requirements 7.1**
   */
  describe('parseScope∘formatScope round-trip', () => {
    it('format then parse produces the original definition', () => {
      fc.assert(
        fc.property(scopeDefinitionArb, (def: ISmartScopeDefinition) => {
          const formatted = formatScope(def);
          const parsed = parseScope(formatted);
          expect(parsed.context).toBe(def.context);
          expect(parsed.resourceType).toBe(def.resourceType);
          expect(parsed.actions).toBe(def.actions);
        }),
        { numRuns: 200 },
      );
    });

    it('parse then format produces the original string', () => {
      fc.assert(
        fc.property(scopeDefinitionArb, (def: ISmartScopeDefinition) => {
          const scopeString = formatScope(def);
          const parsed = parseScope(scopeString);
          const reformatted = formatScope(parsed);
          expect(reformatted).toBe(scopeString);
        }),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property (b): scope evaluation grants access only when context,
   * resource type, and action all match.
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  describe('scope evaluation requires all dimensions to match', () => {
    it('grants access when context, resource type, and action all match exactly', () => {
      fc.assert(
        fc.property(
          scopeContextArb,
          concreteResourceTypeArb,
          scopeActionArb,
          (ctx, resType, action) => {
            const scope = formatScope({
              context: ctx,
              resourceType: resType,
              actions: action,
            });
            expect(evaluateScope([scope], ctx, resType, action)).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('denies access when context does not match', () => {
      fc.assert(
        fc.property(
          scopeContextArb,
          scopeContextArb,
          concreteResourceTypeArb,
          scopeActionArb,
          (scopeCtx, requiredCtx, resType, action) => {
            fc.pre(scopeCtx !== requiredCtx);
            const scope = formatScope({
              context: scopeCtx,
              resourceType: resType,
              actions: action,
            });
            expect(evaluateScope([scope], requiredCtx, resType, action)).toBe(
              false,
            );
          },
        ),
        { numRuns: 200 },
      );
    });

    it('denies access when resource type does not match (non-wildcard)', () => {
      fc.assert(
        fc.property(
          scopeContextArb,
          concreteResourceTypeArb,
          concreteResourceTypeArb,
          scopeActionArb,
          (ctx, scopeResType, requiredResType, action) => {
            fc.pre(scopeResType !== requiredResType);
            const scope = formatScope({
              context: ctx,
              resourceType: scopeResType,
              actions: action,
            });
            expect(evaluateScope([scope], ctx, requiredResType, action)).toBe(
              false,
            );
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property (c): `system/*.*` scope grants universal access.
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  describe('system/*.* grants universal access', () => {
    it('system/*.* grants access for any resource type and action under system context', () => {
      fc.assert(
        fc.property(
          concreteResourceTypeArb,
          scopeActionArb,
          (resType, action) => {
            expect(
              evaluateScope(
                ['system/*.*'],
                ScopeContext.System,
                resType,
                action,
              ),
            ).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('wildcard resource type grants access for any resource under matching context', () => {
      fc.assert(
        fc.property(
          scopeContextArb,
          concreteResourceTypeArb,
          scopeActionArb,
          (ctx, resType, action) => {
            const scope = formatScope({
              context: ctx,
              resourceType: '*',
              actions: '*',
            });
            expect(evaluateScope([scope], ctx, resType, action)).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property (d): a scope with no matching action denies access.
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  describe('no matching action denies access', () => {
    it('denies access when the required action is not in the scope actions', () => {
      const allActions = Object.values(ScopeAction);

      fc.assert(
        fc.property(
          scopeContextArb,
          concreteResourceTypeArb,
          scopeActionArb,
          (ctx, resType, requiredAction) => {
            // Build an actions string that excludes the required action
            const otherActions = allActions
              .filter((a) => a !== requiredAction)
              .join('');
            // Only test when there are other actions to form a valid scope
            fc.pre(otherActions.length > 0);

            const scope = formatScope({
              context: ctx,
              resourceType: resType,
              actions: otherActions,
            });
            expect(evaluateScope([scope], ctx, resType, requiredAction)).toBe(
              false,
            );
          },
        ),
        { numRuns: 200 },
      );
    });

    it('empty scope set denies all access', () => {
      fc.assert(
        fc.property(
          scopeContextArb,
          concreteResourceTypeArb,
          scopeActionArb,
          (ctx, resType, action) => {
            expect(evaluateScope([], ctx, resType, action)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Additional correctness property: scope evaluation is monotonic
   * (adding scopes never reduces access).
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  describe('monotonicity — adding scopes never reduces access', () => {
    it('if access is granted with a scope set, it is still granted with a superset', () => {
      fc.assert(
        fc.property(
          fc.array(scopeDefinitionArb, { minLength: 1, maxLength: 5 }),
          scopeDefinitionArb,
          scopeContextArb,
          concreteResourceTypeArb,
          scopeActionArb,
          (baseDefs, extraDef, ctx, resType, action) => {
            const baseScopes = baseDefs.map(formatScope);
            const supersetScopes = [...baseScopes, formatScope(extraDef)];

            const baseResult = evaluateScope(baseScopes, ctx, resType, action);
            const supersetResult = evaluateScope(
              supersetScopes,
              ctx,
              resType,
              action,
            );

            // If base grants access, superset must also grant access
            if (baseResult) {
              expect(supersetResult).toBe(true);
            }
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
