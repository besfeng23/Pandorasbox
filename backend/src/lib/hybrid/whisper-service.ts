/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GROQ WHISPER SERVICE
 * Fast speech-to-text using Groq's Whisper Large V3
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 *   - Blazing fast transcription via Groq
 *   - Supports multiple audio formats
 *   - Returns text immediately for auto-dispatch
 */

import Groq from 'groq-sdk';
import { GroqModels } from './provider-factory';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  processingTimeMs: number;
}

export interface TranscriptionOptions {
  language?: string;    // ISO-639-1 code (e.g., 'en', 'es', 'fr')
  prompt?: string;      // Optional context to improve transcription
  temperature?: number; // 0-1, lower = more deterministic
}

// ═══════════════════════════════════════════════════════════════════════════
// GROQ WHISPER SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class GroqWhisperService {
  private groqClient: Groq | null = null;
  private readonly model = GroqModels.WHISPER;
  
  constructor() {
    this.initializeClient();
  }
  
  private initializeClient(): void {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.groqClient = new Groq({ apiKey });
      console.log('[GroqWhisper] Service initialized');
    } else {
      console.warn('[GroqWhisper] GROQ_API_KEY not set');
    }
  }
  
  /**
   * Transcribe audio buffer to text
   * @param audioBuffer - Raw audio data (WAV, MP3, M4A, WEBM, etc.)
   * @param filename - Original filename with extension
   * @param options - Transcription options
   */
  async transcribe(
    audioBuffer: Buffer,
    filename: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    if (!this.groqClient) {
      throw new Error('Groq client not initialized - GROQ_API_KEY required');
    }
    
    const startTime = Date.now();
    
    // Create a File-like object for Groq SDK
    const audioFile = new File([audioBuffer], filename, {
      type: this.getMimeType(filename)
    });
    
    console.log('[GroqWhisper] Starting transcription:', {
      filename,
      size: audioBuffer.length,
      mimeType: this.getMimeType(filename)
    });
    
    try {
      const response = await this.groqClient.audio.transcriptions.create({
        file: audioFile,
        model: this.model,
        language: options.language,
        prompt: options.prompt,
        temperature: options.temperature ?? 0,
        response_format: 'verbose_json'
      });
      
      const processingTime = Date.now() - startTime;
      
      console.log('[GroqWhisper] Transcription complete:', {
        textLength: response.text.length,
        language: response.language,
        duration: response.duration,
        processingTimeMs: processingTime
      });
      
      return {
        text: response.text,
        language: response.language,
        duration: response.duration,
        processingTimeMs: processingTime
      };
      
    } catch (error: any) {
      console.error('[GroqWhisper] Transcription failed:', error.message);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }
  
  /**
   * Transcribe from a base64-encoded audio string
   */
  async transcribeBase64(
    base64Audio: string,
    filename: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    // Remove data URL prefix if present
    const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');
    
    return this.transcribe(audioBuffer, filename, options);
  }
  
  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return this.groqClient !== null;
  }
  
  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || 'wav';
    const mimeTypes: Record<string, string> = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'm4a': 'audio/m4a',
      'webm': 'audio/webm',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac'
    };
    return mimeTypes[ext] || 'audio/wav';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

let whisperInstance: GroqWhisperService | null = null;

export function getGroqWhisper(): GroqWhisperService {
  if (!whisperInstance) {
    whisperInstance = new GroqWhisperService();
  }
  return whisperInstance;
}

export default GroqWhisperService;
