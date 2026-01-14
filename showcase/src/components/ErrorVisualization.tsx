/**
 * @fileoverview Error Visualization Component
 * 
 * Provides comprehensive error visualization with modern card styling
 * and glass-morphism design for displaying animation and BrightChain errors.
 */

import React from 'react';
import './ErrorVisualization.css';

export interface ErrorInfo {
  id: string;
  type: 'animation' | 'brightchain' | 'network' | 'validation' | 'unknown';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  timestamp: number;
  recoverable: boolean;
  context?: Record<string, any>;
}

export interface ErrorVisualizationProps {
  errors: ErrorInfo[];
  onDismiss?: (errorId: string) => void;
  onRetry?: (errorId: string) => void;
  onClearAll?: () => void;
  maxVisible?: number;
}

export const ErrorVisualization: React.FC<ErrorVisualizationProps> = ({
  errors,
  onDismiss,
  onRetry,
  onClearAll,
  maxVisible = 5
}) => {
  if (errors.length === 0) {
    return null;
  }

  const visibleErrors = errors.slice(0, maxVisible);
  const hiddenCount = errors.length - maxVisible;

  const getErrorIcon = (type: ErrorInfo['type']) => {
    switch (type) {
      case 'animation': return '🎬';
      case 'brightchain': return '⛓️';
      case 'network': return '🌐';
      case 'validation': return '✅';
      default: return '⚠️';
    }
  };

  const getSeverityIcon = (severity: ErrorInfo['severity']) => {
    switch (severity) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="error-visualization-container">
      <div className="error-header">
        <div className="error-header-content">
          <span className="error-header-icon">🚨</span>
          <h3 className="error-header-title">
            {errors.length === 1 ? '1 Error' : `${errors.length} Errors`}
          </h3>
        </div>
        {onClearAll && errors.length > 0 && (
          <button 
            className="error-clear-all-btn"
            onClick={onClearAll}
            title="Clear all errors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="error-list">
        {visibleErrors.map((error) => (
          <div 
            key={error.id}
            className={`error-card ${error.severity}`}
          >
            <div className="error-card-header">
              <div className="error-icons">
                <span className="error-type-icon">{getErrorIcon(error.type)}</span>
                <span className="error-severity-icon">{getSeverityIcon(error.severity)}</span>
              </div>
              <div className="error-meta">
                <span className="error-type-label">{error.type}</span>
                <span className="error-timestamp">{formatTimestamp(error.timestamp)}</span>
              </div>
              {onDismiss && (
                <button
                  className="error-dismiss-btn"
                  onClick={() => onDismiss(error.id)}
                  title="Dismiss error"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="error-card-body">
              <p className="error-message">{error.message}</p>
              
              {error.details && (
                <details className="error-details">
                  <summary className="error-details-summary">
                    Show Details
                  </summary>
                  <pre className="error-details-content">{error.details}</pre>
                </details>
              )}

              {error.context && Object.keys(error.context).length > 0 && (
                <div className="error-context">
                  <div className="error-context-title">Context:</div>
                  <div className="error-context-items">
                    {Object.entries(error.context).map(([key, value]) => (
                      <div key={key} className="error-context-item">
                        <span className="context-key">{key}:</span>
                        <span className="context-value">
                          {typeof value === 'object' 
                            ? JSON.stringify(value, null, 2) 
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error.recoverable && onRetry && (
              <div className="error-card-footer">
                <button
                  className="error-retry-btn"
                  onClick={() => onRetry(error.id)}
                >
                  <span>🔄</span>
                  Retry
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {hiddenCount > 0 && (
        <div className="error-overflow-notice">
          + {hiddenCount} more {hiddenCount === 1 ? 'error' : 'errors'}
        </div>
      )}
    </div>
  );
};

/**
 * Error Manager Hook
 * Provides error state management and recovery mechanisms
 */
export const useErrorManager = () => {
  const [errors, setErrors] = React.useState<ErrorInfo[]>([]);

  const addError = React.useCallback((
    type: ErrorInfo['type'],
    severity: ErrorInfo['severity'],
    message: string,
    options?: {
      details?: string;
      recoverable?: boolean;
      context?: Record<string, any>;
    }
  ) => {
    const error: ErrorInfo = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      details: options?.details,
      timestamp: Date.now(),
      recoverable: options?.recoverable ?? false,
      context: options?.context
    };

    setErrors(prev => [error, ...prev]);
    return error.id;
  }, []);

  const dismissError = React.useCallback((errorId: string) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
  }, []);

  const clearAllErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  const getError = React.useCallback((errorId: string) => {
    return errors.find(e => e.id === errorId);
  }, [errors]);

  return {
    errors,
    addError,
    dismissError,
    clearAllErrors,
    getError,
    hasErrors: errors.length > 0,
    errorCount: errors.length
  };
};
