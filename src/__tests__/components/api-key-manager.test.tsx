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
  generateUserApiKey: jest.fn(() => Promise.resolve({ 
    success: true, 
    apiKey: 'sk-pandora-new-key-1234567890abcdef' 
  })),
}));

jest.mock('@/lib/kairosClient', () => ({
  sendKairosEvent: jest.fn(() => Promise.resolve({ success: true, eventId: 'test-event-id' })),
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APIKeyManager } from '@/components/settings/api-key-manager';
import * as actionsModule from '@/app/actions';
import * as kairosModule from '@/lib/kairosClient';

describe('APIKeyManager Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with current key masked', () => {
    const currentKey = 'sk-pandora-test-key-1234567890abcdef';
    render(<APIKeyManager currentKey={currentKey} />);
    
    const input = screen.getByPlaceholderText(/No key generated yet/i);
    expect(input).toBeInTheDocument();
    // Key should be masked (showing first 4 and last 4 chars with • in between)
    // The actual value will be like "sk-p••••••••••••••••••••••••••••cdef"
    const value = (input as HTMLInputElement).value;
    expect(value).toMatch(/^sk-p/); // Starts with sk-p
    expect(value).toMatch(/cdef$/); // Ends with cdef
    expect(value).toContain('•'); // Contains masking character
  });

  it('should call generateUserApiKey when Generate button is clicked', async () => {
    const user = userEvent.setup();
    const onKeyUpdated = jest.fn();
    
    render(<APIKeyManager currentKey="" onKeyUpdated={onKeyUpdated} />);
    
    const generateButton = screen.getByText(/Generate/i);
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(actionsModule.generateUserApiKey).toHaveBeenCalledWith('mock-token');
    });
    
    await waitFor(() => {
      expect(onKeyUpdated).toHaveBeenCalledWith('sk-pandora-new-key-1234567890abcdef');
    });
  });

  it('should copy key to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup();
    const currentKey = 'sk-pandora-test-key-123';
    const mockWriteText = jest.fn(() => Promise.resolve());
    
    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });
    
    render(<APIKeyManager currentKey={currentKey} />);
    
    const copyButton = screen.getByTitle(/Copy API key/i);
    await user.click(copyButton);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(currentKey);
    });
  });

  it('should disable copy button when no key is present', () => {
    render(<APIKeyManager currentKey="" />);
    
    const copyButton = screen.getByTitle(/Copy API key/i);
    expect(copyButton).toBeDisabled();
  });
});

