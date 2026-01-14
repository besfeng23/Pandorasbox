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
  exportUserData: jest.fn(() => Promise.resolve({ 
    success: true, 
    data: { 
      userId: 'test-user-123',
      threads: [],
      messages: [],
      memories: [],
      artifacts: [],
    } 
  })),
}));

jest.mock('@/lib/kairosClient', () => ({
  sendKairosEvent: jest.fn(() => Promise.resolve({ success: true, eventId: 'test-event-id' })),
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportMemoriesButton } from '@/components/settings/ExportMemoriesButton';
import * as actionsModule from '@/app/actions';

describe('ExportMemoriesButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock URL methods
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('should render export button', () => {
    render(<ExportMemoriesButton />);
    
    expect(screen.getByTestId('settings-export')).toBeInTheDocument();
  });

  it('should call exportUserData and download JSON when clicked', async () => {
    const user = userEvent.setup();
    render(<ExportMemoriesButton />);
    
    const exportButton = screen.getByTestId('settings-export');
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(actionsModule.exportUserData).toHaveBeenCalledWith('mock-token');
    });
    
    // Verify export action was called
    await waitFor(() => {
      expect(actionsModule.exportUserData).toHaveBeenCalledWith('mock-token');
    });
    
    // Verify download was triggered (URL.createObjectURL should be called)
    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('should show loading state while exporting', async () => {
    const user = userEvent.setup();
    let resolveExport: ((value: any) => void) | undefined;
    const exportPromise = new Promise<any>((resolve) => {
      resolveExport = resolve;
    });
    
    (actionsModule.exportUserData as jest.Mock).mockReturnValue(exportPromise);
    
    render(<ExportMemoriesButton />);
    
    const exportButton = screen.getByText(/Export/i);
    await user.click(exportButton);
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/Exporting/i)).toBeInTheDocument();
    });
    
    // Resolve the promise
    if (resolveExport) {
      resolveExport({ success: true, data: { userId: 'test' } });
    }
    
    await waitFor(() => {
      expect(screen.queryByText(/Exporting/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

