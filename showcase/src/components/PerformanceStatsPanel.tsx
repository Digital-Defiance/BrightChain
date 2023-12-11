/**
 * @fileoverview Performance statistics panel
 * Displays FPS, memory usage, quality level, and layout information
 */

import React from 'react';
import {
  LayoutDimensions,
  MemoryStats,
  QualityLevel,
} from './PerformanceOptimizer';
import './PerformanceStatsPanel.css';

export interface PerformanceStatsPanelProps {
  averageFrameRate: number;
  currentQuality: QualityLevel | null;
  layoutDimensions: LayoutDimensions | null;
  memoryStats: MemoryStats;
  onQualityChange?: (quality: QualityLevel) => void;
  availableQualities?: QualityLevel[];
}

export const PerformanceStatsPanel: React.FC<PerformanceStatsPanelProps> = ({
  averageFrameRate,
  currentQuality,
  layoutDimensions,
  memoryStats,
  onQualityChange,
  availableQualities = [],
}) => {
  const getFpsColor = (fps: number): string => {
    if (fps >= 55) return '#10b981'; // Green
    if (fps >= 30) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getMemoryColor = (used: number, total: number): string => {
    if (total === 0) return '#6b7280';
    const percentage = (used / total) * 100;
    if (percentage < 60) return '#10b981';
    if (percentage < 80) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="performance-stats-panel">
      <h3 className="stats-header">
        <span>⚡</span>
        Performance
      </h3>

      <div className="stats-grid">
        {/* Frame Rate */}
        <div className="stat-card">
          <div className="stat-label">Frame Rate</div>
          <div
            className="stat-value"
            style={{ color: getFpsColor(averageFrameRate) }}
          >
            {averageFrameRate > 0 ? Math.round(averageFrameRate) : '-'} FPS
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill"
              style={{
                width: `${Math.min(100, (averageFrameRate / 60) * 100)}%`,
                backgroundColor: getFpsColor(averageFrameRate),
              }}
            />
          </div>
        </div>

        {/* Memory Usage */}
        <div className="stat-card">
          <div className="stat-label">Memory Usage</div>
          <div
            className="stat-value"
            style={{
              color: getMemoryColor(
                memoryStats.usedMemory,
                memoryStats.totalMemory,
              ),
            }}
          >
            {memoryStats.usedMemory > 0
              ? `${memoryStats.usedMemory} MB`
              : 'N/A'}
          </div>
          {memoryStats.totalMemory > 0 && (
            <div className="stat-bar">
              <div
                className="stat-bar-fill"
                style={{
                  width: `${(memoryStats.usedMemory / memoryStats.totalMemory) * 100}%`,
                  backgroundColor: getMemoryColor(
                    memoryStats.usedMemory,
                    memoryStats.totalMemory,
                  ),
                }}
              />
            </div>
          )}
        </div>

        {/* Quality Level */}
        {currentQuality && (
          <div className="stat-card">
            <div className="stat-label">Quality Level</div>
            <div className="stat-value quality-value">
              {currentQuality.name.toUpperCase()}
            </div>
            {availableQualities.length > 0 && onQualityChange && (
              <select
                className="quality-select"
                value={currentQuality.name}
                onChange={(e) => {
                  const selected = availableQualities.find(
                    (q) => q.name === e.target.value,
                  );
                  if (selected) onQualityChange(selected);
                }}
              >
                {availableQualities.map((quality) => (
                  <option key={quality.name} value={quality.name}>
                    {quality.name.charAt(0).toUpperCase() +
                      quality.name.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Layout Info */}
        {layoutDimensions && (
          <div className="stat-card">
            <div className="stat-label">Layout</div>
            <div className="stat-value layout-value">
              {layoutDimensions.breakpoint.toUpperCase()}
            </div>
            <div className="stat-detail">
              {layoutDimensions.width} × {layoutDimensions.height}
            </div>
            <div className="stat-detail">{layoutDimensions.orientation}</div>
          </div>
        )}

        {/* Animation Resources */}
        <div className="stat-card">
          <div className="stat-label">Animation Resources</div>
          <div className="stat-value">{memoryStats.animationResourceCount}</div>
          <div className="stat-detail">Active resources</div>
        </div>
      </div>
    </div>
  );
};
