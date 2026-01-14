// Mock dependencies BEFORE imports
jest.mock('@/firebase', () => ({
  useUser: jest.fn(() => ({
    user: {
      uid: 'test-user-123',
      getIdToken: jest.fn(() => Promise.resolve('mock-token')),
    },
    isLoading: false,
  })),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

jest.mock('@/app/actions', () => ({
  clearMemory: jest.fn(() => Promise.resolve({ 
    success: true, 
    message: 'Memory cleared successfully.' 
  })),
}));

jest.mock('@/lib/kairosClient', () => ({
  sendKairosEvent: jest.fn(() => Promise.resolve({ success: true, eventId: 'test-event-id' })),
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClearMemoryButton } from '@/components/settings/clear-memory-button';
import * as actionsModule from '@/app/actions';

describe('ClearMemoryButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render clear button with confirmation dialog', () => {
    render(<ClearMemoryButton />);
    
    expect(screen.getByText(/Clear all data/i)).toBeInTheDocument();
  });

  it('should open confirmation dialog when button is clicked', async () => {
    const user = userEvent.setup();
    render(<ClearMemoryButton />);
    
    const clearButton = screen.getByText(/Clear all data/i);
    await user.click(clearButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Clear all data\?/i)).toBeInTheDocument();
      expect(screen.getByText(/This will permanently delete/i)).toBeInTheDocument();
    });
  });

  it('should call clearMemory when confirmed', async () => {
    const user = userEvent.setup();
    render(<ClearMemoryButton />);
    
    // Open dialog
    const clearButton = screen.getByText(/Clear all data/i);
    await user.click(clearButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Yes, delete everything/i)).toBeInTheDocument();
    });
    
    // Confirm deletion
    const confirmButton = screen.getByText(/Yes, delete everything/i);
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(actionsModule.clearMemory).toHaveBeenCalledWith('mock-token');
    });
  });

  it('should close dialog when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ClearMemoryButton />);
    
    // Open dialog
    const clearButton = screen.getByText(/Clear all data/i);
    await user.click(clearButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
    });
    
    // Cancel
    const cancelButton = screen.getByText(/Cancel/i);
    await user.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/Clear all data\?/i)).not.toBeInTheDocument();
    });
    
    // Should not have called clearMemory
    expect(actionsModule.clearMemory).not.toHaveBeenCalled();
  });
});

