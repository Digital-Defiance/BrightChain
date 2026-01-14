/**
 * @fileoverview Visual component for file processing queue
 * Displays queue status, progress indicators, and file processing information
 */

import React from 'react';
import { FileQueueItem } from './PerformanceOptimizer';
import './FileQueueVisualization.css';

export interface FileQueueVisualizationProps {
  queueItems: FileQueueItem[];
  onClearCompleted?: () => void;
}

export const FileQueueVisualization: React.FC<FileQueueVisualizationProps> = ({
  queueItems,
  onClearCompleted,
}) => {
  const getStatusIcon = (status: FileQueueItem['status']) => {
    switch (status) {
      case 'queued':
        return '⏸️';
      case 'processing':
        return '⚙️';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
    }
  };

  const getStatusColor = (status: FileQueueItem['status']) => {
    switch (status) {
      case 'queued':
        return '#6b7280';
      case 'processing':
        return '#3b82f6';
      case 'complete':
        return '#10b981';
      case 'error':
        return '#ef4444';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDuration = (item: FileQueueItem): string => {
    if (!item.startTime) return '-';
    const endTime = item.endTime || Date.now();
    const duration = (endTime - item.startTime) / 1000;
    return `${duration.toFixed(1)}s`;
  };

  const hasCompleted = queueItems.some((item) => item.status === 'complete');

  if (queueItems.length === 0) {
    return null;
  }

  return (
    <div className="file-queue-visualization">
      <div className="queue-header">
        <h3>
          <span>📋</span>
          Processing Queue
        </h3>
        {hasCompleted && onClearCompleted && (
          <button onClick={onClearCompleted} className="clear-completed-btn">
            Clear Completed
          </button>
        )}
      </div>

      <div className="queue-items">
        {queueItems.map((item) => (
          <div key={item.id} className={`queue-item ${item.status}`}>
            <div className="queue-item-header">
              <span className="status-icon">{getStatusIcon(item.status)}</span>
              <div className="file-info">
                <div className="file-name">{item.file.name}</div>
                <div className="file-meta">
                  {formatFileSize(item.file.size)} • {formatDuration(item)}
                </div>
              </div>
            </div>

            {item.status === 'processing' && (
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${item.progress}%`,
                    backgroundColor: getStatusColor(item.status),
                  }}
                />
                <div className="progress-text">{Math.round(item.progress)}%</div>
              </div>
            )}

            {item.status === 'error' && item.error && (
              <div className="error-message">{item.error}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
