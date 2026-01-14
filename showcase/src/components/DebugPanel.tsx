/**
 * @fileoverview Debug Panel Component
 * 
 * Provides comprehensive debug information with glass-morphism design
 * for displaying block store status, animation state, and system diagnostics.
 */

import React from 'react';
import './DebugPanel.css';

export interface BlockStoreInfo {
  sessionId: string;
  blockCount: number;
  totalSize: number;
  blockIds: string[];
  lastOperation?: {
    type: 'store' | 'retrieve' | 'delete' | 'clear';
    timestamp: number;
    blockId?: string;
  };
}

export interface AnimationStateInfo {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  speed: number;
  currentSequence?: {
    id: string;
    type: string;
    progress: number;
  };
}

export interface PerformanceInfo {
  frameRate: number;
  averageFrameTime: number;
  droppedFrames: number;
  memoryUsage: number;
  sequenceCount: number;
  errorCount: number;
}

export interface DebugPanelProps {
  blockStoreInfo?: BlockStoreInfo;
  animationState?: AnimationStateInfo;
  performanceInfo?: PerformanceInfo;
  isVisible?: boolean;
  onToggle?: () => void;
  onClearSession?: () => void;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  blockStoreInfo,
  animationState,
  performanceInfo,
  isVisible = false,
  onToggle,
  onClearSession,
  position = 'bottom-right'
}) => {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['blockStore'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getPerformanceStatus = (frameRate: number): 'good' | 'warning' | 'poor' => {
    if (frameRate >= 30) return 'good';
    if (frameRate >= 20) return 'warning';
    return 'poor';
  };

  if (!isVisible) {
    return (
      <button 
        className={`debug-toggle-btn ${position}`}
        onClick={onToggle}
        title="Open Debug Panel"
      >
        🔧
      </button>
    );
  }

  return (
    <div className={`debug-panel ${position}`}>
      <div className="debug-panel-header">
        <div className="debug-panel-title">
          <span className="debug-icon">🔧</span>
          <h3>Debug Panel</h3>
        </div>
        <button 
          className="debug-close-btn"
          onClick={onToggle}
          title="Close Debug Panel"
        >
          ✕
        </button>
      </div>

      <div className="debug-panel-content">
        {/* Block Store Section */}
        {blockStoreInfo && (
          <div className="debug-section">
            <button
              className="debug-section-header"
              onClick={() => toggleSection('blockStore')}
            >
              <span className="section-icon">
                {expandedSections.has('blockStore') ? '▼' : '▶'}
              </span>
              <span className="section-title">Block Store</span>
              <span className="section-badge">{blockStoreInfo.blockCount}</span>
            </button>

            {expandedSections.has('blockStore') && (
              <div className="debug-section-content">
                <div className="debug-info-grid">
                  <div className="debug-info-item">
                    <span className="info-label">Session ID:</span>
                    <span className="info-value session-id">
                      {blockStoreInfo.sessionId.substring(0, 20)}...
                    </span>
                  </div>

                  <div className="debug-info-item">
                    <span className="info-label">Block Count:</span>
                    <span className="info-value">{blockStoreInfo.blockCount}</span>
                  </div>

                  <div className="debug-info-item">
                    <span className="info-label">Total Size:</span>
                    <span className="info-value">{formatBytes(blockStoreInfo.totalSize)}</span>
                  </div>

                  {blockStoreInfo.lastOperation && (
                    <div className="debug-info-item full-width">
                      <span className="info-label">Last Operation:</span>
                      <span className="info-value">
                        {blockStoreInfo.lastOperation.type} at{' '}
                        {formatTimestamp(blockStoreInfo.lastOperation.timestamp)}
                      </span>
                    </div>
                  )}
                </div>

                {blockStoreInfo.blockIds.length > 0 && (
                  <details className="block-ids-details">
                    <summary className="block-ids-summary">
                      Block IDs ({blockStoreInfo.blockIds.length})
                    </summary>
                    <div className="block-ids-list">
                      {blockStoreInfo.blockIds.map((id, index) => (
                        <div key={id} className="block-id-item">
                          <span className="block-index">#{index}</span>
                          <span className="block-id">{id}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {onClearSession && (
                  <button 
                    className="debug-action-btn danger"
                    onClick={onClearSession}
                  >
                    <span>🗑️</span>
                    Clear Session
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Animation State Section */}
        {animationState && (
          <div className="debug-section">
            <button
              className="debug-section-header"
              onClick={() => toggleSection('animation')}
            >
              <span className="section-icon">
                {expandedSections.has('animation') ? '▼' : '▶'}
              </span>
              <span className="section-title">Animation State</span>
              <span className={`section-badge ${animationState.isPlaying ? 'active' : ''}`}>
                {animationState.isPlaying ? 'Playing' : 'Paused'}
              </span>
            </button>

            {expandedSections.has('animation') && (
              <div className="debug-section-content">
                <div className="debug-info-grid">
                  <div className="debug-info-item">
                    <span className="info-label">Status:</span>
                    <span className={`info-value ${animationState.isPlaying ? 'playing' : 'paused'}`}>
                      {animationState.isPlaying ? '▶️ Playing' : '⏸️ Paused'}
                    </span>
                  </div>

                  <div className="debug-info-item">
                    <span className="info-label">Speed:</span>
                    <span className="info-value">{animationState.speed}x</span>
                  </div>

                  <div className="debug-info-item">
                    <span className="info-label">Frame:</span>
                    <span className="info-value">
                      {animationState.currentFrame} / {animationState.totalFrames}
                    </span>
                  </div>

                  {animationState.currentSequence && (
                    <>
                      <div className="debug-info-item full-width">
                        <span className="info-label">Sequence:</span>
                        <span className="info-value">{animationState.currentSequence.type}</span>
                      </div>

                      <div className="debug-info-item full-width">
                        <span className="info-label">Progress:</span>
                        <div className="progress-bar-container">
                          <div 
                            className="progress-bar-fill"
                            style={{ width: `${animationState.currentSequence.progress}%` }}
                          />
                          <span className="progress-text">
                            {animationState.currentSequence.progress.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Performance Section */}
        {performanceInfo && (
          <div className="debug-section">
            <button
              className="debug-section-header"
              onClick={() => toggleSection('performance')}
            >
              <span className="section-icon">
                {expandedSections.has('performance') ? '▼' : '▶'}
              </span>
              <span className="section-title">Performance</span>
              <span className={`section-badge ${getPerformanceStatus(performanceInfo.frameRate)}`}>
                {performanceInfo.frameRate} fps
              </span>
            </button>

            {expandedSections.has('performance') && (
              <div className="debug-section-content">
                <div className="debug-info-grid">
                  <div className="debug-info-item">
                    <span className="info-label">Frame Rate:</span>
                    <span className={`info-value ${getPerformanceStatus(performanceInfo.frameRate)}`}>
                      {performanceInfo.frameRate} fps
                    </span>
                  </div>

                  <div className="debug-info-item">
                    <span className="info-label">Frame Time:</span>
                    <span className="info-value">{performanceInfo.averageFrameTime}ms</span>
                  </div>

                  <div className="debug-info-item">
                    <span className="info-label">Dropped Frames:</span>
                    <span className="info-value">{performanceInfo.droppedFrames}</span>
                  </div>

                  {performanceInfo.memoryUsage > 0 && (
                    <div className="debug-info-item">
                      <span className="info-label">Memory:</span>
                      <span className="info-value">{performanceInfo.memoryUsage}MB</span>
                    </div>
                  )}

                  <div className="debug-info-item">
                    <span className="info-label">Sequences:</span>
                    <span className="info-value">{performanceInfo.sequenceCount}</span>
                  </div>

                  {performanceInfo.errorCount > 0 && (
                    <div className="debug-info-item">
                      <span className="info-label">Errors:</span>
                      <span className="info-value error">{performanceInfo.errorCount}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Debug Panel Hook
 * Provides debug panel state management
 */
export const useDebugPanel = () => {
  const [isVisible, setIsVisible] = React.useState(false);

  const toggle = React.useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  const show = React.useCallback(() => {
    setIsVisible(true);
  }, []);

  const hide = React.useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    toggle,
    show,
    hide
  };
};
