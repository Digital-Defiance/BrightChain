import React, { useState, useEffect, useCallback } from 'react';
import './GuidedTour.css';

/**
 * Tour stop interface
 */
export interface TourStop {
  id: string;
  title: string;
  description: string;
  targetElement: string; // CSS selector
  highlightPadding?: number;
  position: 'top' | 'bottom' | 'left' | 'right';
  actions?: Array<{
    label: string;
    callback: () => void;
  }>;
}

/**
 * Tour definition interface
 */
export interface Tour {
  id: string;
  name: string;
  description: string;
  stops: TourStop[];
  category: 'beginner' | 'advanced' | 'feature';
}

/**
 * Guided tour props
 */
export interface GuidedTourProps {
  tour: Tour | null;
  onComplete: () => void;
  onExit: () => void;
}

/**
 * Default tours
 */
export const defaultTours: Tour[] = [
  {
    id: 'quick-start',
    name: 'Quick Start Tour',
    description: 'A quick overview of the main features',
    category: 'beginner',
    stops: [
      {
        id: 'welcome',
        title: 'Welcome to BrightChain',
        description: 'This tour will show you the key features of the BrightChain demo in just a few minutes.',
        targetElement: '.hero-section',
        position: 'bottom'
      },
      {
        id: 'file-upload',
        title: 'File Upload Area',
        description: 'Start here by uploading a file. You can drag and drop or click to browse. The file will be broken into blocks.',
        targetElement: '.file-upload-zone',
        position: 'bottom'
      },
      {
        id: 'soup-visualization',
        title: 'The Block Soup',
        description: 'This is where all the magic happens! Your file blocks are mixed with others in this "soup" for privacy and security.',
        targetElement: '.soup-visualization',
        position: 'top'
      },
      {
        id: 'controls',
        title: 'Control Panel',
        description: 'Use these controls to adjust animation speed, enable educational mode, and access help.',
        targetElement: '.control-panel',
        position: 'left'
      }
    ]
  },
  {
    id: 'encoding-deep-dive',
    name: 'File Encoding Deep Dive',
    description: 'Learn every step of the encoding process',
    category: 'advanced',
    stops: [
      {
        id: 'encoding-intro',
        title: 'The Encoding Process',
        description: 'File encoding transforms your file into secure, distributed blocks. Let\'s explore each step in detail.',
        targetElement: '.encoding-animation',
        position: 'right'
      },
      {
        id: 'chunking-step',
        title: 'Step 1: Chunking',
        description: 'The file is divided into fixed-size chunks. This ensures uniform block sizes for efficient storage.',
        targetElement: '.chunking-visualization',
        position: 'right'
      },
      {
        id: 'padding-step',
        title: 'Step 2: Padding',
        description: 'Random data is added to the last chunk to reach the standard block size. This prevents information leakage.',
        targetElement: '.padding-visualization',
        position: 'right'
      },
      {
        id: 'checksum-step',
        title: 'Step 3: Checksums',
        description: 'SHA-512 hashes are calculated for each block. These checksums ensure data integrity and serve as block identifiers.',
        targetElement: '.checksum-visualization',
        position: 'right'
      },
      {
        id: 'storage-step',
        title: 'Step 4: Storage',
        description: 'Blocks are added to the soup where they mix with other files\' blocks, providing anonymity.',
        targetElement: '.storage-visualization',
        position: 'right'
      },
      {
        id: 'cbl-step',
        title: 'Step 5: CBL Creation',
        description: 'A Constituent Block List is created containing the "recipe" to reconstruct your file.',
        targetElement: '.cbl-visualization',
        position: 'right'
      }
    ]
  },
  {
    id: 'soup-exploration',
    name: 'Exploring the Block Soup',
    description: 'Understand how the block soup works',
    category: 'feature',
    stops: [
      {
        id: 'soup-intro',
        title: 'The Block Soup Concept',
        description: 'The soup is a collection of blocks from many different files, all mixed together for security.',
        targetElement: '.soup-visualization',
        position: 'top'
      },
      {
        id: 'soup-can',
        title: 'Soup Cans',
        description: 'Each "soup can" represents a data block. Colors are generated from block checksums.',
        targetElement: '.soup-can:first-child',
        position: 'bottom',
        highlightPadding: 4
      },
      {
        id: 'block-connections',
        title: 'Block Relationships',
        description: 'Blocks from the same file are visually connected. Hover over blocks to see these connections.',
        targetElement: '.connection-lines',
        position: 'top'
      },
      {
        id: 'block-details',
        title: 'Block Information',
        description: 'Click any block to see detailed information including checksum, size, and file association.',
        targetElement: '.block-detail-panel',
        position: 'left'
      }
    ]
  },
  {
    id: 'reconstruction-tour',
    name: 'File Reconstruction Tour',
    description: 'Learn how files are reconstructed from blocks',
    category: 'advanced',
    stops: [
      {
        id: 'reconstruction-intro',
        title: 'File Reconstruction',
        description: 'Reconstruction is the process of reassembling your original file from the block soup using a CBL.',
        targetElement: '.reconstruction-zone',
        position: 'bottom'
      },
      {
        id: 'cbl-input',
        title: 'Provide the CBL',
        description: 'Start by pasting a magnet URL or uploading a CBL file. This contains the block list.',
        targetElement: '.cbl-input',
        position: 'bottom'
      },
      {
        id: 'block-selection',
        title: 'Block Selection',
        description: 'The system identifies and highlights all required blocks in the soup.',
        targetElement: '.block-selection-visualization',
        position: 'top'
      },
      {
        id: 'validation',
        title: 'Checksum Validation',
        description: 'Each block\'s checksum is verified to ensure data integrity before reassembly.',
        targetElement: '.validation-visualization',
        position: 'right'
      },
      {
        id: 'reassembly',
        title: 'File Reassembly',
        description: 'Blocks are combined in the correct order and padding is removed to restore the original file.',
        targetElement: '.reassembly-visualization',
        position: 'right'
      }
    ]
  },
  {
    id: 'educational-features',
    name: 'Educational Features Tour',
    description: 'Discover all the learning tools available',
    category: 'feature',
    stops: [
      {
        id: 'educational-mode',
        title: 'Educational Mode',
        description: 'Enable this mode to slow down animations and see detailed explanations for each step.',
        targetElement: '.educational-mode-toggle',
        position: 'left'
      },
      {
        id: 'tooltips',
        title: 'Contextual Tooltips',
        description: 'Click the help icons throughout the demo to get detailed explanations of technical concepts.',
        targetElement: '.contextual-help-button',
        position: 'bottom'
      },
      {
        id: 'glossary',
        title: 'Concept Glossary',
        description: 'Access the glossary to look up technical terms and concepts with detailed definitions.',
        targetElement: '.glossary-button',
        position: 'left'
      },
      {
        id: 'help-system',
        title: 'Help Center',
        description: 'The help center provides comprehensive documentation on all BrightChain features.',
        targetElement: '.help-button',
        position: 'left'
      },
      {
        id: 'debug-panel',
        title: 'Debug Panel',
        description: 'Advanced users can view internal state and diagnostic information in the debug panel.',
        targetElement: '.debug-panel-toggle',
        position: 'left'
      }
    ]
  }
];

/**
 * Guided Tour Component
 */
export const GuidedTour: React.FC<GuidedTourProps> = ({
  tour,
  onComplete,
  onExit
}) => {
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const currentStop = tour?.stops[currentStopIndex];
  const progress = tour ? ((currentStopIndex + 1) / tour.stops.length) * 100 : 0;

  // Highlight target element
  useEffect(() => {
    if (!tour || !currentStop) {
      setHighlightedElement(null);
      return;
    }

    const element = document.querySelector(currentStop.targetElement) as HTMLElement;
    if (element) {
      setHighlightedElement(element);
      
      // Calculate tooltip position
      const rect = element.getBoundingClientRect();
      const padding = currentStop.highlightPadding || 8;
      let x = rect.left + rect.width / 2;
      let y = rect.top + rect.height / 2;

      switch (currentStop.position) {
        case 'top':
          y = rect.top - padding - 20;
          break;
        case 'bottom':
          y = rect.bottom + padding + 20;
          break;
        case 'left':
          x = rect.left - padding - 20;
          break;
        case 'right':
          x = rect.right + padding + 20;
          break;
      }

      setTooltipPosition({ x, y });

      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [tour, currentStop, currentStopIndex]);

  const handleNext = useCallback(() => {
    if (!tour) return;

    if (currentStopIndex < tour.stops.length - 1) {
      setCurrentStopIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  }, [tour, currentStopIndex, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStopIndex > 0) {
      setCurrentStopIndex(prev => prev - 1);
    }
  }, [currentStopIndex]);

  const handleExit = useCallback(() => {
    onExit();
  }, [onExit]);

  const handleStopClick = useCallback((index: number) => {
    setCurrentStopIndex(index);
  }, []);

  if (!tour || !currentStop) return null;

  return (
    <>
      {/* Overlay with highlight */}
      <div className="guided-tour-overlay">
        {highlightedElement && (
          <div
            className="guided-tour-highlight"
            style={{
              top: highlightedElement.getBoundingClientRect().top - (currentStop.highlightPadding || 8),
              left: highlightedElement.getBoundingClientRect().left - (currentStop.highlightPadding || 8),
              width: highlightedElement.getBoundingClientRect().width + (currentStop.highlightPadding || 8) * 2,
              height: highlightedElement.getBoundingClientRect().height + (currentStop.highlightPadding || 8) * 2,
            }}
          />
        )}
      </div>

      {/* Tour tooltip */}
      <div
        className={`guided-tour-tooltip ${currentStop.position}`}
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
        }}
      >
        <div className="guided-tour-header">
          <div className="guided-tour-info">
            <div className="guided-tour-name">{tour.name}</div>
            <div className="guided-tour-stop-indicator">
              Stop {currentStopIndex + 1} of {tour.stops.length}
            </div>
          </div>
          <button
            className="guided-tour-exit"
            onClick={handleExit}
            aria-label="Exit tour"
          >
            ×
          </button>
        </div>

        <div className="guided-tour-progress-bar">
          <div
            className="guided-tour-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="guided-tour-content">
          <h3 className="guided-tour-title">{currentStop.title}</h3>
          <p className="guided-tour-description">{currentStop.description}</p>

          {currentStop.actions && currentStop.actions.length > 0 && (
            <div className="guided-tour-actions-list">
              {currentStop.actions.map((action, index) => (
                <button
                  key={index}
                  className="guided-tour-action-button"
                  onClick={action.callback}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="guided-tour-navigation">
          <button
            className="guided-tour-nav-button"
            onClick={handlePrevious}
            disabled={currentStopIndex === 0}
          >
            ← Previous
          </button>

          <div className="guided-tour-dots">
            {tour.stops.map((_, index) => (
              <button
                key={index}
                className={`guided-tour-dot ${index === currentStopIndex ? 'active' : ''} ${index < currentStopIndex ? 'completed' : ''}`}
                onClick={() => handleStopClick(index)}
                aria-label={`Go to stop ${index + 1}`}
              />
            ))}
          </div>

          <button
            className="guided-tour-nav-button primary"
            onClick={handleNext}
          >
            {currentStopIndex === tour.stops.length - 1 ? 'Finish' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  );
};

/**
 * Tour Selector Component
 */
export interface TourSelectorProps {
  tours: Tour[];
  onSelectTour: (tour: Tour) => void;
  onClose: () => void;
  visible: boolean;
}

export const TourSelector: React.FC<TourSelectorProps> = ({
  tours,
  onSelectTour,
  onClose,
  visible
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTours = selectedCategory === 'all'
    ? tours
    : tours.filter(t => t.category === selectedCategory);

  if (!visible) return null;

  return (
    <div className="tour-selector-overlay" onClick={onClose}>
      <div className="tour-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tour-selector-header">
          <h2>🗺️ Guided Tours</h2>
          <button
            className="tour-selector-close"
            onClick={onClose}
            aria-label="Close tour selector"
          >
            ×
          </button>
        </div>

        <div className="tour-selector-content">
          <div className="tour-category-filters">
            <button
              className={`tour-category-filter ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Tours
            </button>
            <button
              className={`tour-category-filter ${selectedCategory === 'beginner' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('beginner')}
            >
              Beginner
            </button>
            <button
              className={`tour-category-filter ${selectedCategory === 'advanced' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('advanced')}
            >
              Advanced
            </button>
            <button
              className={`tour-category-filter ${selectedCategory === 'feature' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('feature')}
            >
              Features
            </button>
          </div>

          <div className="tour-list">
            {filteredTours.map(tour => (
              <div
                key={tour.id}
                className="tour-card"
                onClick={() => onSelectTour(tour)}
              >
                <div className={`tour-category-badge ${tour.category}`}>
                  {tour.category}
                </div>
                <h3>{tour.name}</h3>
                <p>{tour.description}</p>
                <div className="tour-meta">
                  <span>{tour.stops.length} stops</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
