/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SPEECH TRANSCRIPTION API ENDPOINT
 * Fast audio-to-text using Groq Whisper
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * POST /api/speech/transcribe
 * 
 * Accepts:
 *   - multipart/form-data with 'audio' file
 *   - application/json with 'audio' as base64 string
 * 
 * Returns:
 *   - { text: string, language: string, duration: number, processingTimeMs: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGroqWhisper } from '@/lib/hybrid/whisper-service';
import { handleOptions, corsHeaders } from '@/lib/cors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max for audio processing

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/speech/transcribe
 * Transcribe audio to text using Groq Whisper
 */
export async function POST(request: NextRequest) {
  try {
    const whisperService = getGroqWhisper();
    
    // Check if service is available
    if (!whisperService.isAvailable()) {
      return NextResponse.json(
        { error: 'Transcription service unavailable', message: 'GROQ_API_KEY not configured' },
        { status: 503, headers: corsHeaders() }
      );
    }
    
    const contentType = request.headers.get('content-type') || '';
    
    let audioBuffer: Buffer;
    let filename: string;
    let language: string | undefined;
    let prompt: string | undefined;
    
    // Handle multipart/form-data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const audioFile = formData.get('audio') as File | null;
      
      if (!audioFile) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'No audio file provided' },
          { status: 400, headers: corsHeaders() }
        );
      }
      
      audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      filename = audioFile.name || 'audio.webm';
      language = formData.get('language') as string || undefined;
      prompt = formData.get('prompt') as string || undefined;
      
    // Handle application/json (base64 audio)
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      
      if (!body.audio) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'No audio data provided' },
          { status: 400, headers: corsHeaders() }
        );
      }
      
      // Remove data URL prefix if present
      const base64Data = body.audio.replace(/^data:audio\/\w+;base64,/, '');
      audioBuffer = Buffer.from(base64Data, 'base64');
      filename = body.filename || 'audio.webm';
      language = body.language;
      prompt = body.prompt;
      
    } else {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Unsupported content type. Use multipart/form-data or application/json' },
        { status: 400, headers: corsHeaders() }
      );
    }
    
    // Validate audio size (max 25MB - Groq limit)
    const maxSize = 25 * 1024 * 1024;
    if (audioBuffer.length > maxSize) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Audio file too large. Maximum size is 25MB, received ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB` },
        { status: 400, headers: corsHeaders() }
      );
    }
    
    console.log('[Transcribe API] Processing audio:', {
      size: audioBuffer.length,
      filename,
      language: language || 'auto'
    });
    
    // Perform transcription
    const result = await whisperService.transcribe(audioBuffer, filename, {
      language,
      prompt
    });
    
    return NextResponse.json({
      success: true,
      text: result.text,
      language: result.language,
      duration: result.duration,
      processingTimeMs: result.processingTimeMs
    }, { headers: corsHeaders() });
    
  } catch (error: any) {
    console.error('[Transcribe API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Transcription failed',
        message: error.message
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}
