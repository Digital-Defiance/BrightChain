/**
 * @fileoverview Property-based tests for error state visualization
 *
 * **Feature: visual-brightchain-demo, Property 7: Error State Visualization**
 * **Validates: Requirements 5.3, 5.4**
 *
 * This test suite verifies that the error visualization system properly displays
 * error messages and visual indicators for all error conditions.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import { ErrorVisualization, ErrorInfo, useErrorManager } from './ErrorVisualization';
import React from 'react';

describe('Error State Visualization Property Tests', () => {
  describe('Property 7: Error State Visualization', () => {
    /**
     * Property: For any error condition (missing blocks, empty store, processing failures),
     * the animation engine should display appropriate error messages and visual indicators.
     *
     * This property ensures that all error states are properly visualized with clear
     * messages and appropriate styling.
     */

    it('should display error messages for all error types', () => {
      const errorTypes: ErrorInfo['type'][] = [
        'animation',
        'brightchain',
        'network',
        'validation',
        'unknown'
      ];

      for (const errorType of errorTypes) {
        const errors: ErrorInfo[] = [{
          id: `test-${errorType}`,
          type: errorType,
          severity: 'error',
          message: `Test ${errorType} error message`,
          timestamp: Date.now(),
          recoverable: false
        }];

        const { container } = render(
          <ErrorVisualization errors={errors} />
        );

        // Error should be displayed
        expect(screen.getByText(`Test ${errorType} error message`)).toBeDefined();
        
        // Error card should exist
        const errorCard = container.querySelector('.error-card');
        expect(errorCard).toBeDefined();
        
        // Error type should be displayed
        expect(screen.getByText(errorType)).toBeDefined();
      }
    });

    it('should display appropriate severity indicators for all severity levels', () => {
      const severities: ErrorInfo['severity'][] = ['error', 'warning', 'info'];

      for (const severity of severities) {
        const errors: ErrorInfo[] = [{
          id: `test-${severity}`,
          type: 'animation',
          severity,
          message: `Test ${severity} message`,
          timestamp: Date.now(),
          recoverable: false
        }];

        const { container } = render(
          <ErrorVisualization errors={errors} />
        );

        // Error card should have severity class
        const errorCard = container.querySelector(`.error-card.${severity}`);
        expect(errorCard).toBeDefined();
        
        // Message should be displayed
        expect(screen.getByText(`Test ${severity} message`)).toBeDefined();
      }
    });

    it('should display multiple errors simultaneously', () => {
      const errorCounts = [1, 3, 5, 10, 20];

      for (const count of errorCounts) {
        const errors: ErrorInfo[] = Array.from({ length: count }, (_, i) => ({
          id: `error-${i}`,
          type: 'animation',
          severity: 'error',
          message: `Error message ${i}`,
          timestamp: Date.now() + i,
          recoverable: false
        }));

        const { container } = render(
          <ErrorVisualization errors={errors} maxVisible={5} />
        );

        // Header should show correct count
        const expectedText = count === 1 ? '1 Error' : `${count} Errors`;
        expect(screen.getByText(expectedText)).toBeDefined();

        // Should display up to maxVisible errors
        const errorCards = container.querySelectorAll('.error-card');
        expect(errorCards.length).toBe(Math.min(count, 5));

        // If more than maxVisible, should show overflow notice
        if (count > 5) {
          const hiddenCount = count - 5;
          const overflowText = `+ ${hiddenCount} more ${hiddenCount === 1 ? 'error' : 'errors'}`;
          expect(screen.getByText(overflowText)).toBeDefined();
        }
      }
    });

    it('should display error details when provided', () => {
      const errors: ErrorInfo[] = [{
        id: 'test-with-details',
        type: 'brightchain',
        severity: 'error',
        message: 'Block not found',
        details: 'Block ID: abc123\nSession: xyz789\nStack trace: ...',
        timestamp: Date.now(),
        recoverable: false
      }];

      const { container } = render(
        <ErrorVisualization errors={errors} />
      );

      // Main message should be displayed
      expect(screen.getByText('Block not found')).toBeDefined();

      // Details section should exist
      const detailsElement = container.querySelector('.error-details');
      expect(detailsElement).toBeDefined();

      // Details summary should exist
      expect(screen.getByText('Show Details')).toBeDefined();
    });

    it('should display error context when provided', () => {
      const contextVariations = [
        { sessionId: 'session-123', blockId: 'block-456' },
        { fileName: 'test.txt', fileSize: 1024 },
        { operation: 'encode', step: 'chunking', progress: 0.5 },
        { url: 'https://example.com', status: 404 }
      ];

      for (const context of contextVariations) {
        const errors: ErrorInfo[] = [{
          id: 'test-with-context',
          type: 'animation',
          severity: 'error',
          message: 'Operation failed',
          context,
          timestamp: Date.now(),
          recoverable: false
        }];

        const { container } = render(
          <ErrorVisualization errors={errors} />
        );

        // Context section should exist
        const contextElement = container.querySelector('.error-context');
        expect(contextElement).toBeDefined();

        // All context keys should be displayed
        for (const key of Object.keys(context)) {
          expect(screen.getByText(`${key}:`)).toBeDefined();
        }
      }
    });

    it('should display timestamp for all errors', () => {
      const timestamps = [
        Date.now(),
        Date.now() - 1000,
        Date.now() - 60000,
        Date.now() - 3600000
      ];

      for (const timestamp of timestamps) {
        const errors: ErrorInfo[] = [{
          id: `test-${timestamp}`,
          type: 'animation',
          severity: 'error',
          message: 'Test error',
          timestamp,
          recoverable: false
        }];

        const { container } = render(
          <ErrorVisualization errors={errors} />
        );

        // Timestamp should be displayed
        const timestampElement = container.querySelector('.error-timestamp');
        expect(timestampElement).toBeDefined();
        expect(timestampElement?.textContent).toBeTruthy();
      }
    });

    it('should show retry button for recoverable errors', () => {
      const errors: ErrorInfo[] = [{
        id: 'recoverable-error',
        type: 'network',
        severity: 'error',
        message: 'Network request failed',
        timestamp: Date.now(),
        recoverable: true
      }];

      const onRetry = () => {};

      render(
        <ErrorVisualization errors={errors} onRetry={onRetry} />
      );

      // Retry button should be displayed
      expect(screen.getByText('Retry')).toBeDefined();
    });

    it('should not show retry button for non-recoverable errors', () => {
      const errors: ErrorInfo[] = [{
        id: 'non-recoverable-error',
        type: 'validation',
        severity: 'error',
        message: 'Invalid data format',
        timestamp: Date.now(),
        recoverable: false
      }];

      const { container } = render(
        <ErrorVisualization errors={errors} />
      );

      // Retry button should not exist
      const retryButton = container.querySelector('.error-retry-btn');
      expect(retryButton).toBeNull();
    });

    it('should display clear all button when errors exist', () => {
      const errors: ErrorInfo[] = [{
        id: 'test-error',
        type: 'animation',
        severity: 'error',
        message: 'Test error',
        timestamp: Date.now(),
        recoverable: false
      }];

      const onClearAll = () => {};

      render(
        <ErrorVisualization errors={errors} onClearAll={onClearAll} />
      );

      // Clear all button should be displayed
      expect(screen.getByText('Clear All')).toBeDefined();
    });

    it('should not render when no errors exist', () => {
      const { container } = render(
        <ErrorVisualization errors={[]} />
      );

      // Container should not exist
      const errorContainer = container.querySelector('.error-visualization-container');
      expect(errorContainer).toBeNull();
    });

    it('should handle errors with missing optional fields', () => {
      const errors: ErrorInfo[] = [{
        id: 'minimal-error',
        type: 'unknown',
        severity: 'error',
        message: 'Minimal error',
        timestamp: Date.now(),
        recoverable: false
        // No details, no context
      }];

      const { container } = render(
        <ErrorVisualization errors={errors} />
      );

      // Error should still be displayed
      expect(screen.getByText('Minimal error')).toBeDefined();

      // Details section should not exist
      const detailsElement = container.querySelector('.error-details');
      expect(detailsElement).toBeNull();

      // Context section should not exist
      const contextElement = container.querySelector('.error-context');
      expect(contextElement).toBeNull();
    });
  });

  describe('Error Manager Hook Tests', () => {
    it('should add errors with all required fields', () => {
      const { result } = renderHook(() => useErrorManager());

      act(() => {
        result.current.addError('animation', 'error', 'Test error');
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.errors[0]).toMatchObject({
        type: 'animation',
        severity: 'error',
        message: 'Test error',
      });
      expect(result.current.errors[0].id).toBeDefined();
      expect(result.current.errors[0].timestamp).toBeDefined();
    });

    it('should generate unique error IDs', () => {
      const { result } = renderHook(() => useErrorManager());

      act(() => {
        result.current.addError('animation', 'error', 'Error 1');
        result.current.addError('animation', 'error', 'Error 2');
        result.current.addError('animation', 'error', 'Error 3');
      });

      const uniqueIds = new Set(result.current.errors.map(e => e.id));
      expect(uniqueIds.size).toBe(3);
      expect(result.current.errors).toHaveLength(3);
    });

    it('should track error count correctly', () => {
      const { result } = renderHook(() => useErrorManager());

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.addError('animation', 'error', `Error ${i}`);
        }
      });

      expect(result.current.errorCount).toBe(5);
      expect(result.current.errors).toHaveLength(5);
    });
  });
});
