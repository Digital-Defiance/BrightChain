/**
 * Auto-moderation service for BrightHub.
 *
 * Provides rules-based content filtering on post creation.
 * Checks for:
 * - Banned word patterns (configurable per hub)
 * - Excessive caps (shouting)
 * - Repetitive character spam
 * - URL spam (too many links)
 *
 * Returns a moderation decision: allow, flag for review, or reject.
 */

export type ModerationDecision = 'allow' | 'flag' | 'reject';

export interface ModerationResult {
  decision: ModerationDecision;
  reasons: string[];
}

/** Default banned word patterns (case-insensitive) */
const DEFAULT_BANNED_PATTERNS: RegExp[] = [
  // Placeholder patterns — in production these would be configurable per hub
];

/** Threshold for excessive caps (percentage of uppercase letters) */
const CAPS_THRESHOLD = 0.7;
/** Minimum content length before caps check applies */
const CAPS_MIN_LENGTH = 20;
/** Maximum number of URLs allowed in a single post */
const MAX_URLS = 5;
/** Threshold for repetitive character detection */
const _REPETITIVE_CHAR_THRESHOLD = 10;

/**
 * Check content against auto-moderation rules.
 * This is a pure function — no database access needed.
 */
export function moderateContent(
  content: string,
  customBannedPatterns?: RegExp[],
): ModerationResult {
  const reasons: string[] = [];
  const patterns = customBannedPatterns ?? DEFAULT_BANNED_PATTERNS;

  // Check banned word patterns
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      reasons.push('Content matches a banned pattern');
      break; // One match is enough
    }
  }

  // Check excessive caps (shouting)
  if (content.length >= CAPS_MIN_LENGTH) {
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length > 0) {
      const upperCount = (content.match(/[A-Z]/g) || []).length;
      const capsRatio = upperCount / letters.length;
      if (capsRatio >= CAPS_THRESHOLD) {
        reasons.push('Excessive use of capital letters');
      }
    }
  }

  // Check repetitive character spam (e.g., "aaaaaaaaaa" or "!!!!!!!!!")
  const repetitiveMatch = content.match(/(.)\1{9,}/);
  if (repetitiveMatch) {
    reasons.push('Repetitive character spam detected');
  }

  // Check URL spam
  const urlMatches = content.match(/https?:\/\/[^\s]+/g);
  if (urlMatches && urlMatches.length > MAX_URLS) {
    reasons.push(`Too many URLs (${urlMatches.length}, max ${MAX_URLS})`);
  }

  // Determine decision
  if (reasons.length === 0) {
    return { decision: 'allow', reasons: [] };
  }

  // Banned patterns → reject; other issues → flag for review
  const hasBannedPattern = reasons.some((r) => r.includes('banned pattern'));
  return {
    decision: hasBannedPattern ? 'reject' : 'flag',
    reasons,
  };
}
