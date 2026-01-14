import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface KeyboardNavigationOptions {
  enableGlobalShortcuts?: boolean;
  onEscape?: () => void;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions = {}) => {
  const { enableGlobalShortcuts = true, onEscape } = options;
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (
        enableGlobalShortcuts &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (event.target as HTMLElement).tagName,
        )
      ) {
        if (event.altKey && event.key === 'h') {
          event.preventDefault();
          navigate('/');
        }

        if (event.altKey && event.key === 'd') {
          event.preventDefault();
          navigate('/demo');
        }

        if (event.altKey && event.key === 'b') {
          event.preventDefault();
          navigate('/blog');
        }
      }
    },
    [enableGlobalShortcuts, navigate, onEscape],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    navigateToHome: () => navigate('/'),
    navigateToDemo: () => navigate('/demo'),
    navigateToBlog: () => navigate('/blog'),
  };
};
