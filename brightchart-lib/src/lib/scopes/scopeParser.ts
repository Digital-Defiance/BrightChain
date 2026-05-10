/**
 * SMART on FHIR v2 Scope Parser
 *
 * Implements parsing of SMART v2 scope strings into structured
 * definitions and formatting definitions back to scope strings.
 *
 * @module scopes/scopeParser
 */

import { ScopeContext, type ISmartScopeDefinition } from './smartScopes';

/** Valid scope context values for fast lookup */
const VALID_CONTEXTS = new Set<string>(Object.values(ScopeContext));

/** Valid individual action characters */
const VALID_ACTION_CHARS = new Set(['c', 'r', 'u', 'd', 's']);

/**
 * Parse a SMART v2 scope string into a structured definition.
 *
 * Expected format: `context/ResourceType.actions`
 *
 * @param scopeString - The scope string to parse (e.g. `patient/Patient.rs`)
 * @returns The parsed scope definition
 * @throws Error if the scope string is malformed
 */
export function parseScope(scopeString: string): ISmartScopeDefinition {
  if (!scopeString || typeof scopeString !== 'string') {
    throw new Error('Scope string must be a non-empty string');
  }

  const slashIndex = scopeString.indexOf('/');
  if (slashIndex === -1) {
    throw new Error(
      `Invalid scope format: missing '/' separator in "${scopeString}"`,
    );
  }

  const context = scopeString.substring(0, slashIndex);
  if (!VALID_CONTEXTS.has(context)) {
    throw new Error(
      `Invalid scope context "${context}". Must be one of: ${[...VALID_CONTEXTS].join(', ')}`,
    );
  }

  const remainder = scopeString.substring(slashIndex + 1);
  const dotIndex = remainder.indexOf('.');
  if (dotIndex === -1) {
    throw new Error(
      `Invalid scope format: missing '.' separator in "${scopeString}"`,
    );
  }

  const resourceType = remainder.substring(0, dotIndex);
  if (!resourceType) {
    throw new Error(
      `Invalid scope format: empty resource type in "${scopeString}"`,
    );
  }

  const actions = remainder.substring(dotIndex + 1);
  if (!actions) {
    throw new Error(`Invalid scope format: empty actions in "${scopeString}"`);
  }

  // Validate actions: must be '*' or a combination of valid action chars
  if (actions !== '*') {
    for (const ch of actions) {
      if (!VALID_ACTION_CHARS.has(ch)) {
        throw new Error(
          `Invalid action character "${ch}" in scope "${scopeString}". Valid actions: c, r, u, d, s, *`,
        );
      }
    }
  }

  return {
    context: context as ScopeContext,
    resourceType,
    actions,
  };
}

/**
 * Format a structured scope definition back into a SMART v2 scope string.
 *
 * @param scope - The scope definition to format
 * @returns The formatted scope string (e.g. `patient/Patient.rs`)
 */
export function formatScope(scope: ISmartScopeDefinition): string {
  return `${scope.context}/${scope.resourceType}.${scope.actions}`;
}
