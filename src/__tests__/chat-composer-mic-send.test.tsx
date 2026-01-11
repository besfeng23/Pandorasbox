import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
}));

// Mocks for app dependencies (server actions + hooks)
jest.mock('@/firebase', () => ({
  useUser: () => ({
    user: {
      uid: 'test-user',
      getIdToken: async () => 'test-token',
    },
    isLoading: false,
  }),
}));

jest.mock('@/hooks/use-chat-history', () => ({
  useChatHistory: () => ({
    messages: [],
    isLoading: false,
  }),
}));

jest.mock('@/app/actions', () => ({
  createThread: async () => 'thread-1',
  submitUserMessage: async () => ({ threadId: 'thread-1' }),
  transcribeAndProcessMessage: async () => ({ success: true, threadId: 'thread-1' }),
}));

import PandoraChatPage from '@/app/(pandora-ui)/page';

describe('Chat composer mic↔send swap', () => {
  it('shows MIC when input is empty, then swaps to SEND when text is present (trim-based)', async () => {
    const user = userEvent.setup();
    render(<PandoraChatPage />);

    // Empty input => MIC only
    expect(screen.getByLabelText(/start recording/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/send message/i)).not.toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('Ask Pandora…');
    await user.type(textarea, 'hi');

    // Text present => SEND only
    await waitFor(() => {
      expect(screen.getByLabelText(/send message/i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/start recording/i)).not.toBeInTheDocument();
  });
});


