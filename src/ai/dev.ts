import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-long-chat.ts';
import '@/ai/flows/suggest-follow-up-questions.ts';
import '@/ai/flows/run-memory-lane';
import '@/ai/flows/run-answer-lane';
import '@/ai/flows/run-chat-lane';
