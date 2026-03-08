/**
 * Classification levels for inbound email spam filtering.
 *
 * @remarks
 * - Ham: Legitimate email, delivered normally
 * - ProbableSpam: Likely spam but not certain; tagged with spam flag and score,
 *   delivered to recipient's spam folder for review
 * - DefiniteSpam: Confirmed spam; rejected at SMTP time with 550 response
 *
 * @see Requirements 3.1, 3.4, 3.5, 7.2
 */
export enum SpamClassification {
  Ham = 'ham',
  ProbableSpam = 'probable_spam',
  DefiniteSpam = 'definite_spam',
}
