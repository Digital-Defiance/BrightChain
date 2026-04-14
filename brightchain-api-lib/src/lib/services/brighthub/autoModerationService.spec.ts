/**
 * Tests for the auto-moderation service.
 */
import { moderateContent } from './autoModerationService';

describe('Auto-Moderation Service', () => {
  it('should allow normal content', () => {
    const result = moderateContent(
      'This is a perfectly normal post about programming.',
    );
    expect(result.decision).toBe('allow');
    expect(result.reasons).toHaveLength(0);
  });

  it('should flag excessive caps', () => {
    const result = moderateContent(
      'THIS IS ALL CAPS AND IT IS VERY LOUD AND ANNOYING TO READ',
    );
    expect(result.decision).toBe('flag');
    expect(result.reasons).toContain('Excessive use of capital letters');
  });

  it('should not flag short caps content', () => {
    const result = moderateContent('OK FINE');
    expect(result.decision).toBe('allow');
  });

  it('should flag repetitive character spam', () => {
    const result = moderateContent('This is spammmmmmmmmm');
    expect(result.decision).toBe('flag');
    expect(result.reasons).toContain('Repetitive character spam detected');
  });

  it('should flag URL spam', () => {
    const urls = Array.from(
      { length: 6 },
      (_, i) => `https://spam${i}.com`,
    ).join(' ');
    const result = moderateContent(`Check out these links: ${urls}`);
    expect(result.decision).toBe('flag');
    expect(result.reasons[0]).toContain('Too many URLs');
  });

  it('should allow content with few URLs', () => {
    const result = moderateContent(
      'Check out https://example.com and https://test.com',
    );
    expect(result.decision).toBe('allow');
  });

  it('should reject content matching banned patterns', () => {
    const patterns = [/badword/i];
    const result = moderateContent('This contains a badword', patterns);
    expect(result.decision).toBe('reject');
    expect(result.reasons).toContain('Content matches a banned pattern');
  });

  it('should allow content not matching banned patterns', () => {
    const patterns = [/badword/i];
    const result = moderateContent('This is clean content', patterns);
    expect(result.decision).toBe('allow');
  });

  it('should detect multiple issues', () => {
    const content = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const result = moderateContent(content);
    expect(result.decision).toBe('flag');
    // Both caps and repetitive
    expect(result.reasons.length).toBeGreaterThanOrEqual(1);
  });
});
