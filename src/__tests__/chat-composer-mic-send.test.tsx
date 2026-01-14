import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
}));

// Mock firebase/firestore functions
const mockUnsubscribe = jest.fn();
const mockOnSnapshot = jest.fn((ref, callback) => {
  // Call callback immediately with mock data
  callback({
    exists: () => false,
    data: () => ({ suggestions: [] }),
  });
  return mockUnsubscribe;
});

const mockDoc = jest.fn((firestore, ...pathSegments) => {
  return {
    path: pathSegments.join('/'),
  };
});

jest.mock('firebase/firestore', () => {
  const mockUnsub = jest.fn();
  // Don't call the callback to avoid state updates that cause infinite loops
  // The test doesn't need the suggestions functionality
  const mockOnSnap = jest.fn((ref, callback) => {
    // Return unsubscribe function without calling callback
    return mockUnsub;
  });

  const mockDocFn = jest.fn((firestore, ...pathSegments) => {
    return {
      path: pathSegments.join('/'),
    };
  });

  return {
    doc: mockDocFn,
    onSnapshot: mockOnSnap,
  };
});

// Create a stable Firestore mock instance
const mockFirestoreInstance = {
  type: 'firestore',
};

// Mocks for app dependencies (server actions + hooks)
jest.mock('@/firebase', () => ({
  useUser: () => ({
    user: {
      uid: 'test-user',
      getIdToken: async () => 'test-token',
    },
    isLoading: false,
  }),
  useFirestore: () => mockFirestoreInstance,
}));

jest.mock('@/hooks/use-chat-history', () => ({
  useChatHistory: () => ({
    messages: [],
    isLoading: false,
  }),
}));

jest.mock('@/app/actions', () => ({
  createThread: async () => 'thread-1',
  createThreadAuthed: async () => 'thread-1',
  submitUserMessage: async () => ({ threadId: 'thread-1' }),
  transcribeAndProcessMessage: async () => ({ success: true, threadId: 'thread-1' }),
}));

import PandoraChatPage from '@/app/(pandora-ui)/page';

describe('Chat composer mic↔send swap', () => {
  it('shows MIC when input is empty, then swaps to SEND when text is present (trim-based)', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <PandoraChatPage />
      </TooltipProvider>
    );

    // Empty input => MIC only
    expect(screen.getByLabelText(/start recording/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/send message/i)).not.toBeInTheDocument();

    const textarea = await screen.findByPlaceholderText(/pandora/i);
    await user.type(textarea, 'hi');

    // Text present => SEND only
    await waitFor(() => {
      expect(screen.getByLabelText(/send message/i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/start recording/i)).not.toBeInTheDocument();
  });
});


