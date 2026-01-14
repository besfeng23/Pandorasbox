
'use client';

import React, { useState, useRef, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Loader2, X, Check } from 'lucide-react';
import { transcribeAndProcessMessage } from '@/app/actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useConnectionStore } from '@/store/connection';

interface VoiceInputProps {
  userId: string;
  onTranscriptionStatusChange: (isTranscribing: boolean) => void;
  disabled?: boolean;
  onAudioSubmit: (formData: FormData) => void;
}

export function VoiceInput({ userId, onTranscriptionStatusChange, disabled, onAudioSubmit }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setElapsedSeconds(0);
      setShowConfirm(false);
      setAudioBlob(null);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = handleStop;
      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast({
        title: 'Recording started',
        description: 'Click the microphone again to stop recording.',
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        variant: 'destructive',
        title: 'Microphone Access Denied',
        description: 'Please enable microphone permissions in your browser settings.',
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleStop = () => {
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    setAudioBlob(blob);
    setShowConfirm(true);
    
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleCancel = () => {
    setAudioBlob(null);
    setShowConfirm(false);
    setElapsedSeconds(0);
    audioChunksRef.current = [];
  };

  const handleConfirm = () => {
    if (!audioBlob) return;
    
    setShowConfirm(false);
    onTranscriptionStatusChange(true);

    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'voice-note.webm');
    formData.append('userId', userId);
    formData.append('source', 'voice');

    onAudioSubmit(formData);
    setAudioBlob(null);
    setElapsedSeconds(0);
    // Note: onTranscriptionStatusChange(false) will be called by parent when transcription completes
  };

  // Show confirmation buttons
  if (showConfirm && audioBlob) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/70">{formatDuration(elapsedSeconds)}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:h-8 sm:w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 touch-manipulation"
          onClick={handleCancel}
          aria-label="Cancel recording"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:h-8 sm:w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10 touch-manipulation"
          onClick={handleConfirm}
          aria-label="Confirm and send recording"
        >
          <Check className="h-4 w-4" strokeWidth={1.5} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isRecording && (
        <span className="text-xs text-red-400 font-mono">{formatDuration(elapsedSeconds)}</span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground touch-manipulation',
          isRecording && 'text-red-500 animate-pulse bg-red-500/10'
        )}
        onMouseDown={handleStartRecording}
        onMouseUp={handleStopRecording}
        onTouchStart={handleStartRecording}
        onTouchEnd={handleStopRecording}
        disabled={disabled}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        data-testid="chat-mic"
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mic className="h-4 w-4" strokeWidth={1.5} />
        )}
      </Button>
    </div>
  );
}
