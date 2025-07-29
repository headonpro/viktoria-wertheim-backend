/**
 * Tests for QueueMonitor Component
 * Tests the queue monitoring dashboard functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { QueueMonitor } from '../../../../../src/admin/extensions/tabellen-automatisierung/components/QueueMonitor';

// Mock Strapi design system components
jest.mock('@strapi/design-system', () => ({
  Box: ({ children, ...props }: any) => <div data-testid="box" {...props}>{children}</div>,
  Typography: ({ children, ...props }: any) => <span data-testid="typography" {...props}>{children}</span>,
  Button: ({ children, onClick, ...props }: any) => (
    <button data-testid="button" onClick={onClick} {...props}>{children}</button>
  ),
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
  Grid: ({ children, ...props }: any) => <div data-testid="grid" {...props}>{children}</div>,
  GridItem: ({ children, ...props }: any) => <div data-testid="grid-item" {...props}>{children}</div>,
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardBody: ({ children, ...props }: any) => <div data-testid="card-body" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  Table: ({ children, ...props }: any) => <table data-testid="table" {...props}>{children}</table>,
  Thead: ({ children, ...props }: any) => <thead data-testid="thead" {...props}>{children}</thead>,
  Tbody: ({ children, ...props }: any) => <tbody data-testid="tbody" {...props}>{children}</tbody>,
  Tr: ({ children, ...props }: any) => <tr data-testid="tr" {...props}>{children}</tr>,
  Th: ({ children, ...props }: any) => <th data-testid="th" {...props}>{children}</th>,
  Td: ({ children, ...props }: any) => <td data-testid="td" {...props}>{children}</td>,
  Alert: ({ children, title, ...props }: any) => (
    <div data-testid="alert" {...props}>
      <div data-testid="alert-title">{title}</div>
      {children}
    </div>
  ),
  Loader: (props: any) => <div data-testid="loader" {...props}>Loading...</div>,
  Switch: ({ onChange, selected, ...props }: any) => (
    <input 
      data-testid="switch" 
      type="checkbox" 
      checked={selected} 
      onChange={(e) => onChange(e.target.checked)}
      {...props} 
    />
  ),
  IconButton: ({ children, onClick, ...props }: any) => (
    <button data-testid="icon-button" onClick={onClick} {...props}>{children}</button>
  ),
  Flex: ({ children, ...props }: any) => <div data-testid="flex" {...props}>{children}</div>
}));

// Mock Strapi icons
jest.mock('@strapi/icons', () => ({
  Play: () => <span data-testid="play-icon">Play</span>,
  Pause: () => <span data-testid="pause-icon">Pause</span>,
  Refresh: () => <span data-testid="refresh-icon">Refresh</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">CheckCircle</span>,
  ExclamationMarkCircle: () => <span data-testid="exclamation-icon">ExclamationMarkCircle</span>,
  Information: () => <span data-testid="info-icon">Information</span>,
  Eye: () => <span data-testid="eye-icon">Eye</span>
}));

// Mock useFetchClient
const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  useFetchClient: () => ({
    get: mockGet,
    post: mockPost
  })
}));

describe('QueueMonitor Component', () => {
  const mockQueueStatus = {
    isRunning: true,
    totalJobs: 10,
    pendingJobs: 2,
    processingJobs: 1,
    completedJobs: 6,
    failedJobs: 1,
    averageProcessingTime: 5000,
    lastProcessedAt: new Date('2024-01-01T10:00:00Z'),
    currentJobs: [
      {
        id: 'job_123',
        ligaId: 1,
        saisonId: 1,
        status: 'processing',
        priority: 3,
        progress: 75,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        estimatedCompletion: new Date('2024-01-01T10:00:30Z')
      }
    ]
  };

  const mockHistory = [
    {
      id: 'job_history_1',
      ligaId: 1,
      saisonId: 1,
      trigger: 'MANUAL_TRIGGER',
      status: 'completed',
      startedAt: new Date('2024-01-01T09:00:00Z'),
      completedAt: new Date('2024-01-01T09:00:05Z'),
      duration: 5000,
      entriesUpdated: 16,
      description: 'Manual recalculation'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/tabellen/queue-status') {
        return Promise.resolve({ data: mockQueueStatus });
      } else if (url.includes('/admin/tabellen/history/')) {
        return Promise.resolve({ data: mockHistory });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    mockPost.mockResolvedValue({ data: { success: true } });

    // Mock timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should render loading state initially', () => {
    render(<QueueMonitor />);
    
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.getByText('Lade Queue-Status...')).toBeInTheDocument();
  });

  it('should fetch and display queue status', async () => {
    render(<QueueMonitor />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/admin/tabellen/queue-status');
    });

    await waitFor(() => {
      expect(screen.getByText('Queue Monitoring')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // Total jobs
      expect(screen.getByText('2')).toBeInTheDocument(); // Pending jobs
      expect(screen.getByText('1')).toBeInTheDocument(); // Processing jobs
    });
  });

  it('should display current jobs table when jobs are present', async () => {
    render(<QueueMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Aktuelle Jobs')).toBeInTheDocument();
      expect(screen.getByText('job_123...')).toBeInTheDocument();
      expect(screen.getByText('Liga 1')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  it('should display job history when showHistory is true', async () => {
    render(<QueueMonitor showHistory={true} />);

    await waitFor(() => {
      expect(screen.getByText('Berechnungshistorie')).toBeInTheDocument();
      expect(screen.getByText('job_history_1...')).toBeInTheDocument();
      expect(screen.getByText('MANUAL_TRIGGER')).toBeInTheDocument();
    });
  });

  it('should not display job history when showHistory is false', async () => {
    render(<QueueMonitor showHistory={false} />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/admin/tabellen/queue-status');
    });

    // Should not call history endpoint
    expect(mockGet).not.toHaveBeenCalledWith(
      expect.stringContaining('/admin/tabellen/history/')
    );

    await waitFor(() => {
      expect(screen.queryByText('Berechnungshistorie')).not.toBeInTheDocument();
    });
  });

  it('should handle pause/resume functionality', async () => {
    render(<QueueMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Pausieren')).toBeInTheDocument();
    });

    const pauseButton = screen.getByText('Pausieren');
    fireEvent.click(pauseButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/admin/tabellen/pause');
    });
  });

  it('should show resume button when queue is paused', async () => {
    const pausedQueueStatus = {
      ...mockQueueStatus,
      isRunning: false
    };

    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/tabellen/queue-status') {
        return Promise.resolve({ data: pausedQueueStatus });
      } else if (url.includes('/admin/tabellen/history/')) {
        return Promise.resolve({ data: mockHistory });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    render(<QueueMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Fortsetzen')).toBeInTheDocument();
    });

    const resumeButton = screen.getByText('Fortsetzen');
    fireEvent.click(resumeButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/admin/tabellen/resume');
    });
  });

  it('should handle refresh functionality', async () => {
    render(<QueueMonitor />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2); // Initial load: status + history
    });

    const refreshButton = screen.getByTestId('icon-button');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(4); // After refresh: status + history again
    });
  });

  it('should toggle auto-refresh', async () => {
    render(<QueueMonitor refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByTestId('switch')).toBeInTheDocument();
    });

    const autoRefreshSwitch = screen.getByTestId('switch');
    expect(autoRefreshSwitch).toBeChecked(); // Should be enabled by default

    // Disable auto-refresh
    fireEvent.click(autoRefreshSwitch);
    expect(autoRefreshSwitch).not.toBeChecked();

    // Fast-forward time to check that auto-refresh doesn't happen
    const initialCallCount = mockGet.mock.calls.length;
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(initialCallCount); // No additional calls
    });
  });

  it('should handle API errors gracefully', async () => {
    mockGet.mockRejectedValue(new Error('API Error'));

    render(<QueueMonitor />);

    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByText('Fehler')).toBeInTheDocument();
    });
  });

  it('should format duration correctly', async () => {
    const longDurationStatus = {
      ...mockQueueStatus,
      averageProcessingTime: 3665000 // 1h 1m 5s
    };

    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/tabellen/queue-status') {
        return Promise.resolve({ data: longDurationStatus });
      } else if (url.includes('/admin/tabellen/history/')) {
        return Promise.resolve({ data: mockHistory });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    render(<QueueMonitor />);

    await waitFor(() => {
      expect(screen.getByText('1h 1m 5s')).toBeInTheDocument();
    });
  });

  it('should respect maxHistoryItems prop', async () => {
    render(<QueueMonitor maxHistoryItems={5} />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/admin/tabellen/history/1', {
        params: { limit: 5 }
      });
    });
  });

  it('should show empty state when no history is available', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/tabellen/queue-status') {
        return Promise.resolve({ data: mockQueueStatus });
      } else if (url.includes('/admin/tabellen/history/')) {
        return Promise.resolve({ data: [] }); // Empty history
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    render(<QueueMonitor showHistory={true} />);

    await waitFor(() => {
      expect(screen.getByText('Keine Berechnungshistorie verfügbar')).toBeInTheDocument();
    });
  });
});