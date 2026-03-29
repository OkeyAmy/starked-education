import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import VirtualLabSimulation from '../VirtualLabSimulation';
import InteractiveDiagram from '../InteractiveDiagram';
import DragDropActivity from '../DragDropActivity';
import GamificationEngine from '../GamificationEngine';
import InteractiveTimelineMap from '../InteractiveTimelineMap';
import CollaborativeWhiteboard from '../CollaborativeWhiteboard';
import ProgressVisualization from '../ProgressVisualization';
import InteractiveQuiz from '../InteractiveQuiz';
import AccessibilityProvider from '../AccessibilityProvider';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock canvas context
const mockCanvasContext = {
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  rect: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  font: '',
  textAlign: 'center' as CanvasTextAlign,
  textBaseline: 'middle' as CanvasTextBaseline,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'round' as CanvasLineCap,
  lineJoin: 'round' as CanvasLineJoin,
  setLineDash: jest.fn(),
};

HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvasContext);

describe('Interactive Learning Components', () => {
  describe('VirtualLabSimulation', () => {
    const mockProps = {
      labType: 'chemistry' as const,
      title: 'Chemistry Lab',
      description: 'Test chemistry experiment',
      onExperimentComplete: jest.fn(),
    };

    it('renders lab simulation with correct title and description', () => {
      render(<VirtualLabSimulation {...mockProps} />);
      
      expect(screen.getByText('Chemistry Lab')).toBeInTheDocument();
      expect(screen.getByText('Test chemistry experiment')).toBeInTheDocument();
    });

    it('displays experiment steps', () => {
      render(<VirtualLabSimulation {...mockProps} />);
      
      expect(screen.getByText('Setup Equipment')).toBeInTheDocument();
      expect(screen.getByText('Conduct Experiment')).toBeInTheDocument();
      expect(screen.getByText('Observe Results')).toBeInTheDocument();
      expect(screen.getByText('Analyze Data')).toBeInTheDocument();
    });

    it('handles experiment step actions', async () => {
      const user = userEvent.setup();
      render(<VirtualLabSimulation {...mockProps} />);
      
      const startButton = screen.getByText('setup');
      await user.click(startButton);
      
      expect(mockProps.onExperimentComplete).not.toHaveBeenCalled();
    });

    it('shows and hides hints', async () => {
      const user = userEvent.setup();
      render(<VirtualLabSimulation {...mockProps} />);
      
      const hintButton = screen.getByText('Show Hint');
      await user.click(hintButton);
      
      expect(screen.getByText('Hide Hint')).toBeInTheDocument();
      expect(screen.getByText(/Hint:/)).toBeInTheDocument();
    });

    it('resets experiment correctly', async () => {
      const user = userEvent.setup();
      render(<VirtualLabSimulation {...mockProps} />);
      
      const resetButton = screen.getByText('Reset');
      await user.click(resetButton);
      
      expect(screen.getByText('Setup Equipment')).toBeInTheDocument();
    });
  });

  describe('InteractiveDiagram', () => {
    const mockDiagramData = {
      nodes: [
        { id: '1', label: 'Node 1', x: 100, y: 100, type: 'start' as const },
        { id: '2', label: 'Node 2', x: 200, y: 200, type: 'process' as const },
      ],
      connections: [
        { id: 'c1', from: '1', to: '2', type: 'solid' as const },
      ],
    };

    const mockProps = {
      diagramType: 'flowchart' as const,
      title: 'Test Diagram',
      data: mockDiagramData,
    };

    it('renders diagram with correct title', () => {
      render(<InteractiveDiagram {...mockProps} />);
      
      expect(screen.getByText('Test Diagram')).toBeInTheDocument();
      expect(screen.getByText('Interactive flowchart diagram')).toBeInTheDocument();
    });

    it('displays control buttons', () => {
      render(<InteractiveDiagram {...mockProps} />);
      
      expect(screen.getByText('Hide Labels')).toBeInTheDocument();
      expect(screen.getByText('Reset View')).toBeInTheDocument();
      expect(screen.getByText('Export as Image')).toBeInTheDocument();
    });

    it('toggles labels visibility', async () => {
      const user = userEvent.setup();
      render(<InteractiveDiagram {...mockProps} />);
      
      const labelsButton = screen.getByText('Hide Labels');
      await user.click(labelsButton);
      
      expect(screen.getByText('Show Labels')).toBeInTheDocument();
    });

    it('shows instructions', () => {
      render(<InteractiveDiagram {...mockProps} />);
      
      expect(screen.getByText('Instructions:')).toBeInTheDocument();
      expect(screen.getByText(/Click on nodes to select and view details/)).toBeInTheDocument();
    });
  });

  describe('DragDropActivity', () => {
    const mockItems = [
      { id: 'item1', content: 'Item 1', correctTarget: 'target1' },
      { id: 'item2', content: 'Item 2', correctTarget: 'target2' },
    ];

    const mockTargets = [
      { id: 'target1', label: 'Target 1' },
      { id: 'target2', label: 'Target 2' },
    ];

    const mockProps = {
      activityType: 'matching' as const,
      title: 'Test Activity',
      instructions: 'Test instructions',
      items: mockItems,
      targets: mockTargets,
      onActivityComplete: jest.fn(),
    };

    it('renders activity with correct title and instructions', () => {
      render(<DragDropActivity {...mockProps} />);
      
      expect(screen.getByText('Test Activity')).toBeInTheDocument();
      expect(screen.getByText('Test instructions')).toBeInTheDocument();
    });

    it('displays draggable items', () => {
      render(<DragDropActivity {...mockProps} />);
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('displays drop targets', () => {
      render(<DragDropActivity {...mockProps} />);
      
      expect(screen.getByText('Target 1')).toBeInTheDocument();
      expect(screen.getByText('Target 2')).toBeInTheDocument();
    });

    it('shows progress indicator', () => {
      render(<DragDropActivity {...mockProps} />);
      
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('0 / 2 items placed')).toBeInTheDocument();
    });

    it('shows accessibility instructions when enabled', () => {
      render(<DragDropActivity {...mockProps} accessibilityMode={true} />);
      
      expect(screen.getByText('Accessibility Instructions:')).toBeInTheDocument();
      expect(screen.getByText(/Use Tab to navigate between items and drop targets/)).toBeInTheDocument();
    });
  });

  describe('GamificationEngine', () => {
    const mockProps = {
      userId: 'user123',
      showPoints: true,
      showBadges: true,
      showLeaderboard: true,
      showStreaks: true,
    };

    it('renders gamification dashboard', () => {
      render(<GamificationEngine {...mockProps} />);
      
      expect(screen.getByText('Total Points')).toBeInTheDocument();
      expect(screen.getByText('Your Badges')).toBeInTheDocument();
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      expect(screen.getByText('Learning Streak')).toBeInTheDocument();
    });

    it('displays points information', () => {
      render(<GamificationEngine {...mockProps} />);
      
      expect(screen.getByText('This Week')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
      expect(screen.getByText('Course')).toBeInTheDocument();
    });

    it('switches between tabs', async () => {
      const user = userEvent.setup();
      render(<GamificationEngine {...mockProps} />);
      
      const badgesTab = screen.getByText('Badges');
      await user.click(badgesTab);
      
      expect(screen.getByText('Your Badges')).toBeInTheDocument();
    });

    it('shows achievement popup when milestone reached', async () => {
      render(<GamificationEngine {...mockProps} />);
      
      // The component should show achievement popup for mock data
      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
      });
    });
  });

  describe('InteractiveTimelineMap', () => {
    const mockTimelineData = {
      events: [
        {
          id: 'event1',
          title: 'Event 1',
          description: 'Description 1',
          date: new Date('2024-01-01'),
          category: 'History',
          importance: 'high' as const,
        },
      ],
      categories: ['History'],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    };

    const mockProps = {
      contentType: 'timeline' as const,
      title: 'Test Timeline',
      description: 'Test timeline description',
      data: mockTimelineData,
    };

    it('renders timeline with correct title', () => {
      render(<InteractiveTimelineMap {...mockProps} />);
      
      expect(screen.getByText('Test Timeline')).toBeInTheDocument();
      expect(screen.getByText('Test timeline description')).toBeInTheDocument();
    });

    it('displays view mode toggles', () => {
      render(<InteractiveTimelineMap {...mockProps} />);
      
      expect(screen.getByText('Timeline')).toBeInTheDocument();
      expect(screen.getByText('Map')).toBeInTheDocument();
      expect(screen.getByText('Both')).toBeInTheDocument();
    });

    it('shows controls for timeline', () => {
      render(<InteractiveTimelineMap {...mockProps} />);
      
      expect(screen.getByText('Play')).toBeInTheDocument();
      expect(screen.getByText('Reset View')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('displays instructions', () => {
      render(<InteractiveTimelineMap {...mockProps} />);
      
      expect(screen.getByText('Instructions:')).toBeInTheDocument();
      expect(screen.getByText(/Click on events or locations to view details/)).toBeInTheDocument();
    });
  });

  describe('CollaborativeWhiteboard', () => {
    const mockProps = {
      whiteboardId: 'wb123',
      userId: 'user123',
      title: 'Test Whiteboard',
      collaborationEnabled: true,
    };

    it('renders whiteboard with correct title', () => {
      render(<CollaborativeWhiteboard {...mockProps} />);
      
      expect(screen.getByText('Test Whiteboard')).toBeInTheDocument();
    });

    it('displays drawing tools', () => {
      render(<CollaborativeWhiteboard {...mockProps} />);
      
      expect(screen.getByTitle('Pen')).toBeInTheDocument();
      expect(screen.getByTitle('Line')).toBeInTheDocument();
      expect(screen.getByTitle('Rectangle')).toBeInTheDocument();
      expect(screen.getByTitle('Circle')).toBeInTheDocument();
    });

    it('shows active users when collaboration enabled', () => {
      render(<CollaborativeWhiteboard {...mockProps} />);
      
      expect(screen.getByText('Active Users:')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('displays zoom controls', () => {
      render(<CollaborativeWhiteboard {...mockProps} />);
      
      expect(screen.getByText('Zoom:')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('shows instructions', () => {
      render(<CollaborativeWhiteboard {...mockProps} />);
      
      expect(screen.getByText('Instructions:')).toBeInTheDocument();
      expect(screen.getByText(/Select a tool and start drawing on the canvas/)).toBeInTheDocument();
    });
  });

  describe('ProgressVisualization', () => {
    const mockProgressData = {
      overallProgress: 75,
      courseProgress: [
        {
          courseId: 'course1',
          courseName: 'Test Course',
          progress: 80,
          completedLessons: 8,
          totalLessons: 10,
          estimatedTimeRemaining: 120,
          lastAccessed: new Date(),
        },
      ],
      weeklyProgress: [
        { week: 'Week 1', hoursSpent: 5, lessonsCompleted: 3, quizzesPassed: 2, pointsEarned: 150 },
      ],
      skillsProgress: [
        {
          skillName: 'JavaScript',
          category: 'Programming',
          currentLevel: 3,
          maxLevel: 5,
          experiencePoints: 750,
          nextLevelXP: 1000,
          progressPercentage: 75,
        },
      ],
      timeSpent: {
        totalTime: 3600,
        todayTime: 120,
        weekTime: 600,
        monthTime: 1800,
        averageSession: 45,
      },
      streakData: {
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: new Date(),
        streakHistory: [],
      },
    };

    const mockAchievements = [
      {
        id: 'achievement1',
        title: 'First Steps',
        description: 'Complete your first lesson',
        icon: '🎯',
        category: 'Progress',
        rarity: 'common' as const,
        unlockedAt: new Date(),
        progress: 1,
        maxProgress: 1,
        pointsAwarded: 50,
      },
    ];

    const mockProps = {
      userId: 'user123',
      progressData: mockProgressData,
      achievements: mockAchievements,
    };

    it('renders progress visualization with tabs', () => {
      render(<ProgressVisualization {...mockProps} />);
      
      expect(screen.getByText('Progress & Achievements')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Courses')).toBeInTheDocument();
      expect(screen.getByText('Skills')).toBeInTheDocument();
    });

    it('displays overall progress', () => {
      render(<ProgressVisualization {...mockProps} />);
      
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('shows quick stats', () => {
      render(<ProgressVisualization {...mockProps} />);
      
      expect(screen.getByText("Today's Progress")).toBeInTheDocument();
      expect(screen.getByText('This Week')).toBeInTheDocument();
      expect(screen.getByText('Current Streak')).toBeInTheDocument();
    });

    it('displays recent achievements', () => {
      render(<ProgressVisualization {...mockProps} />);
      
      expect(screen.getByText('Recent Achievements')).toBeInTheDocument();
      expect(screen.getByText('First Steps')).toBeInTheDocument();
    });
  });

  describe('InteractiveQuiz', () => {
    const mockQuestions = [
      {
        id: 'q1',
        type: 'multiple-choice' as const,
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        explanation: '2 + 2 = 4',
        difficulty: 'easy' as const,
        category: 'Math',
        points: 10,
      },
      {
        id: 'q2',
        type: 'true-false' as const,
        question: 'The sky is blue',
        correctAnswer: 'true',
        difficulty: 'easy' as const,
        category: 'General',
        points: 5,
      },
    ];

    const mockProps = {
      quizId: 'quiz123',
      title: 'Test Quiz',
      description: 'Test quiz description',
      questions: mockQuestions,
      onQuizComplete: jest.fn(),
    };

    it('renders quiz with correct title and description', () => {
      render(<InteractiveQuiz {...mockProps} />);
      
      expect(screen.getByText('Test Quiz')).toBeInTheDocument();
      expect(screen.getByText('Test quiz description')).toBeInTheDocument();
    });

    it('displays first question', () => {
      render(<InteractiveQuiz {...mockProps} />);
      
      expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
      expect(screen.getByText('A. 3')).toBeInTheDocument();
      expect(screen.getByText('B. 4')).toBeInTheDocument();
      expect(screen.getByText('C. 5')).toBeInTheDocument();
      expect(screen.getByText('D. 6')).toBeInTheDocument();
    });

    it('shows progress bar', () => {
      render(<InteractiveQuiz {...mockProps} />);
      
      expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('50% Complete')).toBeInTheDocument();
    });

    it('handles answer selection', async () => {
      const user = userEvent.setup();
      render(<InteractiveQuiz {...mockProps} />);
      
      const optionB = screen.getByText('B. 4');
      await user.click(optionB);
      
      expect(screen.getByText('B. 4')).toHaveClass('border-blue-500');
    });

    it('provides immediate feedback', async () => {
      const user = userEvent.setup();
      render(<InteractiveQuiz {...mockProps} />);
      
      const correctOption = screen.getByText('B. 4');
      await user.click(correctOption);
      
      await waitFor(() => {
        expect(screen.getByText('✅ Correct! Well done!')).toBeInTheDocument();
      });
    });

    it('navigates between questions', async () => {
      const user = userEvent.setup();
      render(<InteractiveQuiz {...mockProps} />);
      
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);
      
      expect(screen.getByText('The sky is blue')).toBeInTheDocument();
    });

    it('shows quiz results when completed', async () => {
      const user = userEvent.setup();
      render(<InteractiveQuiz {...mockProps} />);
      
      // Answer first question correctly
      const correctOption = screen.getByText('B. 4');
      await user.click(correctOption);
      
      // Go to next question
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);
      
      // Answer second question correctly
      const trueButton = screen.getByText('True');
      await user.click(trueButton);
      
      // Submit quiz
      const submitButton = screen.getByText('Submit Quiz');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Quiz Complete!')).toBeInTheDocument();
        expect(mockProps.onQuizComplete).toHaveBeenCalled();
      });
    });

    it('shows question navigation when review is enabled', () => {
      render(<InteractiveQuiz {...mockProps} allowReview={true} />);
      
      expect(screen.getByText('Quick Navigation:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('AccessibilityProvider', () => {
    const mockProps = {
      children: <div>Test Content</div>,
    };

    it('renders accessibility toolbar', () => {
      render(<AccessibilityProvider {...mockProps} />);
      
      const toolbarButton = screen.getByLabelText('Accessibility settings (Alt+A)');
      expect(toolbarButton).toBeInTheDocument();
    });

    it('opens settings panel when toolbar button is clicked', async () => {
      const user = userEvent.setup();
      render(<AccessibilityProvider {...mockProps} />);
      
      const toolbarButton = screen.getByLabelText('Accessibility settings (Alt+A)');
      await user.click(toolbarButton);
      
      expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
    });

    it('displays all accessibility setting categories', async () => {
      const user = userEvent.setup();
      render(<AccessibilityProvider {...mockProps} />);
      
      const toolbarButton = screen.getByLabelText('Accessibility settings (Alt+A)');
      await user.click(toolbarButton);
      
      expect(screen.getByText('Text Settings')).toBeInTheDocument();
      expect(screen.getByText('Visual Settings')).toBeInTheDocument();
      expect(screen.getByText('Interaction Settings')).toBeInTheDocument();
      expect(screen.getByText('Screen Reader & Audio')).toBeInTheDocument();
      expect(screen.getByText('Interface Settings')).toBeInTheDocument();
    });

    it('can reset settings to defaults', async () => {
      const user = userEvent.setup();
      render(<AccessibilityProvider {...mockProps} />);
      
      const toolbarButton = screen.getByLabelText('Accessibility settings (Alt+A)');
      await user.click(toolbarButton);
      
      const resetButton = screen.getByText('Reset to defaults');
      expect(resetButton).toBeInTheDocument();
    });

    it('closes settings panel when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<AccessibilityProvider {...mockProps} />);
      
      const toolbarButton = screen.getByLabelText('Accessibility settings (Alt+A)');
      await user.click(toolbarButton);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(screen.queryByText('Accessibility Settings')).not.toBeInTheDocument();
    });
  });
});

// Integration tests
describe('Component Integration', () => {
  it('renders multiple interactive components together', () => {
    const mockProps = {
      userId: 'user123',
      progressData: {
        overallProgress: 50,
        courseProgress: [],
        weeklyProgress: [],
        skillsProgress: [],
        timeSpent: {
          totalTime: 1800,
          todayTime: 60,
          weekTime: 300,
          monthTime: 900,
          averageSession: 30,
        },
        streakData: {
          currentStreak: 3,
          longestStreak: 7,
          lastActivityDate: new Date(),
          streakHistory: [],
        },
      },
      achievements: [],
    };

    render(
      <div>
        <GamificationEngine {...mockProps} />
        <ProgressVisualization {...mockProps} />
      </div>
    );

    expect(screen.getByText('Total Points')).toBeInTheDocument();
    expect(screen.getByText('Progress & Achievements')).toBeInTheDocument();
  });

  it('handles accessibility provider with child components', () => {
    render(
      <AccessibilityProvider>
        <div>
          <h1>Accessible Content</h1>
          <button>Test Button</button>
        </div>
      </AccessibilityProvider>
    );

    expect(screen.getByText('Accessible Content')).toBeInTheDocument();
    expect(screen.getByText('Test Button')).toBeInTheDocument();
    expect(screen.getByLabelText('Accessibility settings (Alt+A)')).toBeInTheDocument();
  });
});

// Performance tests
describe('Performance Tests', () => {
  it('renders large number of diagram nodes efficiently', () => {
    const largeDiagramData = {
      nodes: Array.from({ length: 100 }, (_, i) => ({
        id: `node${i}`,
        label: `Node ${i}`,
        x: Math.random() * 800,
        y: Math.random() * 600,
        type: 'process' as const,
      })),
      connections: Array.from({ length: 50 }, (_, i) => ({
        id: `conn${i}`,
        from: `node${i}`,
        to: `node${i + 1}`,
        type: 'solid' as const,
      })),
    };

    const startTime = performance.now();
    
    render(
      <InteractiveDiagram
        diagramType="flowchart"
        title="Large Diagram"
        data={largeDiagramData}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('handles many quiz questions efficiently', () => {
    const manyQuestions = Array.from({ length: 50 }, (_, i) => ({
      id: `q${i}`,
      type: 'multiple-choice' as const,
      question: `Question ${i}`,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
      difficulty: 'easy' as const,
      category: 'Test',
      points: 1,
    }));

    const startTime = performance.now();
    
    render(
      <InteractiveQuiz
        quizId="large-quiz"
        title="Large Quiz"
        description="Test quiz with many questions"
        questions={manyQuestions}
        onQuizComplete={jest.fn()}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 200ms
    expect(renderTime).toBeLessThan(200);
  });
});

// Error boundary tests
describe('Error Handling', () => {
  it('handles missing props gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    expect(() => {
      render(<VirtualLabSimulation 
        labType="chemistry"
        title=""
        description=""
        onExperimentComplete={jest.fn()}
      />);
    }).not.toThrow();

    consoleSpy.mockRestore();
  });

  it('handles invalid data gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    expect(() => {
      render(<InteractiveDiagram
        diagramType="flowchart"
        title="Test"
        data={{
          nodes: [],
          connections: [],
        }}
      />);
    }).not.toThrow();

    consoleSpy.mockRestore();
  });
});
