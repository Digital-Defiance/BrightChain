/**
 * SafeFaIcon — Wrapper around a raw `<i>` element for Font Awesome icons.
 *
 * The `<i>` is wrapped in a `<span>` to prevent React "removeChild" crashes.
 * Font Awesome's kit JS watches the DOM and replaces `<i>` elements with
 * `<svg>` elements. When React later tries to unmount the `<i>`, the node
 * is no longer a child of its parent (FA replaced it). By wrapping in a
 * `<span>`, React manages the `<span>` and never directly removes the `<i>`.
 *
 * Falls back to an empty `<span>` if the icon class is missing or invalid.
 */
import { CSSProperties, FC, memo, useEffect, useRef } from 'react';

export interface SafeFaIconProps {
  /** Font Awesome CSS class string, e.g. "fa-solid fa-anchor" */
  className?: string;
  /** Optional inline styles (e.g. fontSize) */
  style?: CSSProperties;
  /** data-testid for testing */
  'data-testid'?: string;
}

const SafeFaIcon: FC<SafeFaIconProps> = ({
  className,
  style,
  'data-testid': testId,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  // Render the <i> element via innerHTML so React doesn't track it as a
  // child fiber. Font Awesome's kit JS can freely replace it with <svg>
  // without conflicting with React's reconciliation.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!className || className.trim().length === 0) {
      container.innerHTML = '';
      return;
    }

    const styleAttr = style
      ? ` style="${Object.entries(style)
          .map(
            ([k, v]) =>
              `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v}`,
          )
          .join(';')}"`
      : '';
    container.innerHTML = `<i class="${className}"${styleAttr}></i>`;
  }, [className, style]);

  return (
    <span
      ref={containerRef}
      data-testid={testId}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    />
  );
};

export default memo(SafeFaIcon);
