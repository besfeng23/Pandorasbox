'use server';

import 'server-only';
import { z } from 'zod';

/**
 * MemoryChunkSchema - Zod schema for validating extracted memory chunks
 * Defines the structure of knowledge extracted from conversations
 */
export const MemoryChunkSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title must be a non-empty string'),
  content: z.string().min(1, 'Content must be a non-empty string'),
  tags: z.array(z.string()).default([]),
});

/**
 * Type inference from the schema
 */
export type MemoryChunk = z.infer<typeof MemoryChunkSchema>;

