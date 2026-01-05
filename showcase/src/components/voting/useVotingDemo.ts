import { useState } from 'react';

export const useVotingDemo = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isTallying, setIsTallying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const withTallying = async <T>(fn: () => T | Promise<T>): Promise<T> => {
    setIsTallying(true);
    try {
      return await fn();
    } finally {
      setIsTallying(false);
    }
  };

  const withSubmitting = async <T>(fn: () => T | Promise<T>): Promise<T> => {
    setIsSubmitting(true);
    try {
      return await fn();
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isInitializing,
    setIsInitializing,
    isTallying,
    isSubmitting,
    withTallying,
    withSubmitting,
  };
};
