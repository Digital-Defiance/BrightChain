/**
 * SMART on FHIR v2 Scope Evaluator
 *
 * Evaluates whether a set of member scopes grants access for a
 * specific context, resource type, and action.
 *
 * @module scopes/scopeEvaluator
 */

import { parseScope } from './scopeParser';
import type { SmartScope } from './smartScopes';
import { ScopeAction, ScopeContext } from './smartScopes';

/**
 * Evaluate whether the given member scopes grant access for the
 * specified context, resource type, and action.
 *
 * A scope grants access when ALL of the following match:
 * 1. The scope's context matches the required context
 * 2. The scope's resource type matches the required resource type (or is '*')
 * 3. The scope's actions include the required action (or is '*')
 *
 * @param memberScopes - Array of SMART v2 scope strings the member holds
 * @param requiredContext - The context required for the operation
 * @param resourceType - The FHIR resource type being accessed
 * @param action - The specific action being performed
 * @returns true if at least one scope grants the requested access
 */
export function evaluateScope(
  memberScopes: SmartScope[],
  requiredContext: ScopeContext,
  resourceType: string,
  action: ScopeAction,
): boolean {
  if (!memberScopes || memberScopes.length === 0) {
    return false;
  }

  for (const scopeString of memberScopes) {
    try {
      const scope = parseScope(scopeString);

      // Check context match
      if (scope.context !== requiredContext) {
        continue;
      }

      // Check resource type match (exact or wildcard)
      if (scope.resourceType !== '*' && scope.resourceType !== resourceType) {
        continue;
      }

      // Check action match (wildcard or contains the action character)
      if (scope.actions === '*' || scope.actions.includes(action)) {
        return true;
      }
    } catch {
      // Skip malformed scopes silently
      continue;
    }
  }

  return false;
}
