/**
 * ═══════════════════════════════════════════════════════════════════════════
 * useGroqWhisper Hook
 * React hook for fast speech-to-text using Groq's Whisper API
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 *   - Record audio from microphone
 *   - Auto-transcribe on stop
 *   - Fast callback for immediate UI updates
 *   - Auto-trigger dispatcher after transcription
 */

'use client';

import { useState, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface WhisperHookOptions {
  onTranscript?: (text: string) => void;      // Called when transcription is ready
  onError?: (error: string) => void;          // Called on error
  autoDispatch?: boolean;                      // Auto-trigger dispatcher after transcription
  language?: string;                           // ISO-639-1 language code
}

export interface WhisperHookState {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string | null;
  error: string | null;
  duration: number;
}

export interface WhisperHookReturn extends WhisperHookState {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
  clearTranscript: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export function useGroqWhisper(options: WhisperHookOptions = {}): WhisperHookReturn {
  const { onTranscript, onError, language } = options;
  
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript(null);
      chunksRef.current = [];
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      
      streamRef.current = stream;
      
      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDuration(0);
      
      // Update duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      
      console.log('[useGroqWhisper] Recording started');
      
    } catch (err: any) {
      const errorMsg = err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone permissions.'
        : `Failed to start recording: ${err.message}`;
      
      setError(errorMsg);
      onError?.(errorMsg);
      console.error('[useGroqWhisper] Start error:', err);
    }
  }, [onError]);
  
  /**
   * Stop recording and transcribe
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }
      
      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      
      const mediaRecorder = mediaRecorderRef.current;
      
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        
        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());
        
        // Create audio blob
        const audioBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType
        });
        
        console.log('[useGroqWhisper] Recording stopped, size:', audioBlob.size);
        
        // Skip if too short (less than 0.5s of audio)
        if (audioBlob.size < 5000) {
          setError('Recording too short');
          resolve(null);
          return;
        }
        
        // Transcribe
        setIsTranscribing(true);
        
        try {
          const formData = new FormData();
          
          // Determine file extension from MIME type
          const extension = mediaRecorder.mimeType.includes('webm') ? 'webm' : 'm4a';
          formData.append('audio', audioBlob, `recording.${extension}`);
          
          if (language) {
            formData.append('language', language);
          }
          
          const response = await fetch('/api/speech/transcribe', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Transcription failed: ${response.status}`);
          }
          
          const result = await response.json();
          
          if (result.success && result.text) {
            setTranscript(result.text);
            onTranscript?.(result.text);
            console.log('[useGroqWhisper] Transcription:', result.text.slice(0, 50) + '...');
            resolve(result.text);
          } else {
            throw new Error('No transcription text returned');
          }
          
        } catch (err: any) {
          const errorMsg = `Transcription error: ${err.message}`;
          setError(errorMsg);
          onError?.(errorMsg);
          console.error('[useGroqWhisper] Transcription error:', err);
          resolve(null);
        } finally {
          setIsTranscribing(false);
        }
      };
      
      // Stop the recorder
      mediaRecorder.stop();
    });
  }, [isRecording, language, onTranscript, onError]);
  
  /**
   * Cancel recording without transcribing
   */
  const cancelRecording = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    streamRef.current?.getTracks().forEach(track => track.stop());
    
    setIsRecording(false);
    setIsTranscribing(false);
    chunksRef.current = [];
    
    console.log('[useGroqWhisper] Recording cancelled');
  }, [isRecording]);
  
  /**
   * Clear the transcript
   */
  const clearTranscript = useCallback(() => {
    setTranscript(null);
    setError(null);
  }, []);
  
  return {
    isRecording,
    isTranscribing,
    transcript,
    error,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    clearTranscript
  };
}

export default useGroqWhisper;
