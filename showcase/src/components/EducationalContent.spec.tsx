import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HelpSystem, HelpButton } from './HelpSystem';
import { InteractiveTutorial, TutorialLauncher } from './InteractiveTutorial';
import { GuidedTour, TourSelector, defaultTours, Tour } from './GuidedTour';

/**
 * Test suite for Educational Content System
 * Tests help system, tutorials, and guided tours
 */

describe('HelpSystem', () => {
  describe('Help System Content Loading and Display', () => {
    it('should not render when visible is false', () => {
      const { container } = render(
        <HelpSystem visible={false} onClose={vi.fn()} />
      );
      expect(container.querySelector('.help-system-overlay')).not.toBeInTheDocument();
    });

    it('should render when visible is true', () => {
      render(<HelpSystem visible={true} onClose={vi.fn()} />);
      expect(screen.getByText(/BrightChain Help Center/i)).toBeInTheDocument();
    });

    it('should display help topics', () => {
      render(<HelpSystem visible={true} onClose={vi.fn()} />);
      
      // Check that topics are displayed
      const topicCards = document.querySelectorAll('.help-topic-card');
      expect(topicCards.length).toBeGreaterThan(0);
    });

    it('should filter topics by search term', async () => {
      render(<HelpSystem visible={true} onClose={vi.fn()} />);
      
      const searchInput = screen.getByPlaceholderText(/Search help topics/i);
      fireEvent.change(searchInput, { target: { value: 'encoding' } });

      await waitFor(() => {
        const topicCards = document.querySelectorAll('.help-topic-card');
        expect(topicCards.length).toBeGreaterThan(0);
      });
    });

    it('should filter topics by category', async () => {
      render(<HelpSystem visible={true} onClose={vi.fn()} />);
      
      const conceptsButton = screen.getByText('Concepts');
      fireEvent.click(conceptsButton);

      await waitFor(() => {
        const topicCards = document.querySelectorAll('.help-topic-card');
        expect(topicCards.length).toBeGreaterThan(0);
      });
    });

    it('should display topic details when clicked', async () => {
      render(<HelpSystem visible={true} onClose={vi.fn()} />);
      
      const topicCards = document.querySelectorAll('.help-topic-card.clickable');
      if (topicCards.length > 0) {
        fireEvent.click(topicCards[0]);
      }

      await waitFor(() => {
        expect(screen.getByText(/Back to Topics/i)).toBeInTheDocument();
      });
    });

    it('should show related topics in detail view', async () => {
      render(<HelpSystem visible={true} onClose={vi.fn()} />);
      
      const topicCards = document.querySelectorAll('.help-topic-card.clickable');
      if (topicCards.length > 0) {
        fireEvent.click(topicCards[0]);
      }

      await waitFor(() => {
        expect(screen.getByText(/Back to Topics/i)).toBeInTheDocument();
      });
    });

    it('should navigate back to topic list', async () => {
      render(<HelpSystem visible={true} onClose={vi.fn()} />);
      
      // Click a topic
      const topicCards = document.querySelectorAll('.help-topic-card.clickable');
      if (topicCards.length > 0) {
        fireEvent.click(topicCards[0]);
      }

      await waitFor(() => {
        expect(screen.getByText(/Back to Topics/i)).toBeInTheDocument();
      });

      // Click back button
      const backButton = screen.getByText(/Back to Topics/i);
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search help topics/i)).toBeInTheDocument();
      });
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<HelpSystem visible={true} onClose={onClose} />);
      
      const closeButton = screen.getByLabelText(/Close help/i);
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should display initial topic when provided', () => {
      render(
        <HelpSystem 
          visible={true} 
          onClose={vi.fn()} 
          initialTopic="what-is-brightchain"
        />
      );
      
      expect(screen.getByText(/Back to Topics/i)).toBeInTheDocument();
    });

    it('should show no results message when search has no matches', async () => {
      render(<HelpSystem visible={true} onClose={vi.fn()} />);
      
      const searchInput = screen.getByPlaceholderText(/Search help topics/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent topic xyz' } });

      await waitFor(() => {
        expect(screen.getByText(/No help topics found/i)).toBeInTheDocument();
      });
    });
  });

  describe('HelpButton', () => {
    it('should render help button', () => {
      render(<HelpButton onClick={vi.fn()} />);
      expect(screen.getByText(/Help/i)).toBeInTheDocument();
    });

    it('should call onClick when clicked', () => {
      const onClick = vi.fn();
      render(<HelpButton onClick={onClick} />);
      
      const button = screen.getByText(/Help/i);
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});

describe('InteractiveTutorial', () => {
  describe('Tutorial Progression and Completion Tracking', () => {
    it('should not render when visible is false', () => {
      const { container } = render(
        <InteractiveTutorial 
          visible={false} 
          onComplete={vi.fn()} 
          onSkip={vi.fn()} 
        />
      );
      expect(container.querySelector('.tutorial-overlay')).not.toBeInTheDocument();
    });

    it('should render when visible is true', () => {
      render(
        <InteractiveTutorial 
          visible={true} 
          onComplete={vi.fn()} 
          onSkip={vi.fn()} 
        />
      );
      expect(screen.getByText(/Welcome to BrightChain/i)).toBeInTheDocument();
    });

    it('should display current step information', () => {
      render(
        <InteractiveTutorial 
          visible={true} 
          onComplete={vi.fn()} 
          onSkip={vi.fn()} 
        />
      );
      
      expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();
      expect(screen.getByText(/Welcome to BrightChain/i)).toBeInTheDocument();
    });

    it('should advance to next step when Next is clicked', async () => {
      render(
        <InteractiveTutorial 
          visible={true} 
          onComplete={vi.fn()} 
          onSkip={vi.fn()} 
        />
      );
      
      const nextButton = screen.getByText(/Next →/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of/i)).toBeInTheDocument();
      });
    });

    it('should go back to previous step when Previous is clicked', async () => {
      render(
        <InteractiveTutorial 
          visible={true} 
          onComplete={vi.fn()} 
          onSkip={vi.fn()} 
        />
      );
      
      // Go to step 2
      const nextButton = screen.getByText(/Next →/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of/i)).toBeInTheDocument();
      });

      // Go back to step 1
      const previousButton = screen.getByText(/← Previous/i);
      fireEvent.click(previousButton);

      await waitFor(() => {
        expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument();
      });
    });

    it('should call onSkip when Skip Tutorial is clicked', () => {
      const onSkip = vi.fn();
      render(
        <InteractiveTutorial 
          visible={true} 
          onComplete={vi.fn()} 
          onSkip={onSkip} 
        />
      );
      
      const skipButton = screen.getByText(/Skip Tutorial/i);
      fireEvent.click(skipButton);

      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('should call onComplete when Finish is clicked on last step', async () => {
      const onComplete = vi.fn();
      render(
        <InteractiveTutorial 
          visible={true} 
          onComplete={onComplete} 
          onSkip={vi.fn()} 
        />
      );
      
      // Navigate to last step by clicking Next multiple times
      const nextButton = screen.getByText(/Next →/i);
      
      // Click through all steps (there are 8 steps in the default tutorial)
      for (let i = 0; i < 7; i++) {
        fireEvent.click(nextButton);
        await waitFor(() => {
          expect(screen.getByText(new RegExp(`Step ${i + 2} of`, 'i'))).toBeInTheDocument();
        });
      }

      // Now we should be on the last step
      const finishButton = screen.getByText(/Finish/i);
      fireEvent.click(finishButton);

      // Wait for completion callback
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should update progress bar as steps advance', async () => {
      const { container } = render(
        <InteractiveTutorial 
          visible={true} 
          onComplete={vi.fn()} 
          onSkip={vi.fn()} 
        />
      );
      
      const progressFill = container.querySelector('.tutorial-progress-fill');
      expect(progressFill).toBeInTheDocument();
      
      // Initial progress should be > 0
      const initialWidth = progressFill?.getAttribute('style');
      expect(initialWidth).toContain('width');

      // Advance to next step
      const nextButton = screen.getByText(/Next →/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        const newWidth = progressFill?.getAttribute('style');
        expect(newWidth).not.toBe(initialWidth);
      });
    });
  });

  describe('TutorialLauncher', () => {
    it('should render tutorial launcher button', () => {
      render(<TutorialLauncher onStart={vi.fn()} />);
      expect(screen.getByText(/Start Tutorial/i)).toBeInTheDocument();
    });

    it('should call onStart when clicked', () => {
      const onStart = vi.fn();
      render(<TutorialLauncher onStart={onStart} />);
      
      const button = screen.getByText(/Start Tutorial/i);
      fireEvent.click(button);

      expect(onStart).toHaveBeenCalledTimes(1);
    });
  });
});

describe('GuidedTour', () => {
  const mockTour: Tour = {
    id: 'test-tour',
    name: 'Test Tour',
    description: 'A test tour',
    category: 'beginner',
    stops: [
      {
        id: 'stop1',
        title: 'First Stop',
        description: 'This is the first stop',
        targetElement: '.test-element',
        position: 'bottom'
      },
      {
        id: 'stop2',
        title: 'Second Stop',
        description: 'This is the second stop',
        targetElement: '.test-element-2',
        position: 'top'
      }
    ]
  };

  describe('Guided Tour Navigation', () => {
    it('should not render when tour is null', () => {
      const { container } = render(
        <GuidedTour 
          tour={null} 
          onComplete={vi.fn()} 
          onExit={vi.fn()} 
        />
      );
      expect(container.querySelector('.guided-tour-overlay')).not.toBeInTheDocument();
    });

    it('should render when tour is provided', () => {
      render(
        <GuidedTour 
          tour={mockTour} 
          onComplete={vi.fn()} 
          onExit={vi.fn()} 
        />
      );
      expect(screen.getByText(/Test Tour/i)).toBeInTheDocument();
      expect(screen.getAllByText(/First Stop/i).length).toBeGreaterThan(0);
    });

    it('should display current stop information', () => {
      render(
        <GuidedTour 
          tour={mockTour} 
          onComplete={vi.fn()} 
          onExit={vi.fn()} 
        />
      );
      
      expect(screen.getByText(/Stop 1 of 2/i)).toBeInTheDocument();
      expect(screen.getAllByText(/First Stop/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/This is the first stop/i)).toBeInTheDocument();
    });

    it('should advance to next stop when Next is clicked', async () => {
      render(
        <GuidedTour 
          tour={mockTour} 
          onComplete={vi.fn()} 
          onExit={vi.fn()} 
        />
      );
      
      const nextButton = screen.getByText(/Next →/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Stop 2 of 2/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Second Stop/i).length).toBeGreaterThan(0);
      });
    });

    it('should go back to previous stop when Previous is clicked', async () => {
      render(
        <GuidedTour 
          tour={mockTour} 
          onComplete={vi.fn()} 
          onExit={vi.fn()} 
        />
      );
      
      // Go to stop 2
      const nextButton = screen.getByText(/Next →/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Stop 2 of 2/i)).toBeInTheDocument();
      });

      // Go back to stop 1
      const previousButton = screen.getByText(/← Previous/i);
      fireEvent.click(previousButton);

      await waitFor(() => {
        expect(screen.getByText(/Stop 1 of 2/i)).toBeInTheDocument();
      });
    });

    it('should disable Previous button on first stop', () => {
      render(
        <GuidedTour 
          tour={mockTour} 
          onComplete={vi.fn()} 
          onExit={vi.fn()} 
        />
      );
      
      const previousButton = screen.getByText(/← Previous/i);
      expect(previousButton).toBeDisabled();
    });

    it('should call onComplete when Finish is clicked on last stop', async () => {
      const onComplete = vi.fn();
      render(
        <GuidedTour 
          tour={mockTour} 
          onComplete={onComplete} 
          onExit={vi.fn()} 
        />
      );
      
      // Go to last stop
      const nextButton = screen.getByText(/Next →/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/Stop 2 of 2/i)).toBeInTheDocument();
      });

      // Click Finish
      const finishButton = screen.getByText(/Finish/i);
      fireEvent.click(finishButton);

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should call onExit when exit button is clicked', () => {
      const onExit = vi.fn();
      render(
        <GuidedTour 
          tour={mockTour} 
          onComplete={vi.fn()} 
          onExit={onExit} 
        />
      );
      
      const exitButton = screen.getByLabelText(/Exit tour/i);
      fireEvent.click(exitButton);

      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('should update progress bar as stops advance', async () => {
      const { container } = render(
        <GuidedTour 
          tour={mockTour} 
          onComplete={vi.fn()} 
          onExit={vi.fn()} 
        />
      );
      
      const progressFill = container.querySelector('.guided-tour-progress-fill');
      expect(progressFill).toBeInTheDocument();
      
      // Initial progress
      const initialWidth = progressFill?.getAttribute('style');
      expect(initialWidth).toContain('50%'); // 1 of 2 stops

      // Advance to next stop
      const nextButton = screen.getByText(/Next →/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        const newWidth = progressFill?.getAttribute('style');
        expect(newWidth).toContain('100%'); // 2 of 2 stops
      });
    });
  });

  describe('TourSelector', () => {
    it('should not render when visible is false', () => {
      const { container } = render(
        <TourSelector 
          tours={defaultTours} 
          onSelectTour={vi.fn()} 
          onClose={vi.fn()} 
          visible={false}
        />
      );
      expect(container.querySelector('.tour-selector-overlay')).not.toBeInTheDocument();
    });

    it('should render when visible is true', () => {
      render(
        <TourSelector 
          tours={defaultTours} 
          onSelectTour={vi.fn()} 
          onClose={vi.fn()} 
          visible={true}
        />
      );
      expect(screen.getByText(/Guided Tours/i)).toBeInTheDocument();
    });

    it('should display all tours by default', () => {
      render(
        <TourSelector 
          tours={defaultTours} 
          onSelectTour={vi.fn()} 
          onClose={vi.fn()} 
          visible={true}
        />
      );
      
      // Check for some expected tours
      expect(screen.getByText(/Quick Start Tour/i)).toBeInTheDocument();
      expect(screen.getByText(/File Encoding Deep Dive/i)).toBeInTheDocument();
    });

    it('should filter tours by category', async () => {
      render(
        <TourSelector 
          tours={defaultTours} 
          onSelectTour={vi.fn()} 
          onClose={vi.fn()} 
          visible={true}
        />
      );
      
      const beginnerButton = screen.getByText('Beginner');
      fireEvent.click(beginnerButton);

      await waitFor(() => {
        // Should show beginner tours
        expect(screen.getByText(/Quick Start Tour/i)).toBeInTheDocument();
      });
    });

    it('should call onSelectTour when a tour is clicked', () => {
      const onSelectTour = vi.fn();
      render(
        <TourSelector 
          tours={defaultTours} 
          onSelectTour={onSelectTour} 
          onClose={vi.fn()} 
          visible={true}
        />
      );
      
      const tourCard = screen.getByText(/Quick Start Tour/i).closest('.tour-card');
      if (tourCard) {
        fireEvent.click(tourCard);
      }

      expect(onSelectTour).toHaveBeenCalledTimes(1);
      expect(onSelectTour).toHaveBeenCalledWith(expect.objectContaining({
        id: 'quick-start'
      }));
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <TourSelector 
          tours={defaultTours} 
          onSelectTour={vi.fn()} 
          onClose={onClose} 
          visible={true}
        />
      );
      
      const closeButton = screen.getByLabelText(/Close tour selector/i);
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
