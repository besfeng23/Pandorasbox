'use client';

import React, { useState, useRef, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Loader2 } from 'lucide-react';
import { transcribeAndProcessMessage } from '@/app/actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useConnectionStore } from '@/store/connection';

interface VoiceInputProps {
  userId: string;
  onTranscriptionStatusChange: (isTranscribing: boolean) => void;
  disabled?: boolean;
}

export function VoiceInput({ userId, onTranscriptionStatusChange, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPending, startTransition] = useTransition();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { addPendingMessage } = useConnectionStore();

  const handleStartRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = handleStop;
      mediaRecorderRef.current.start();
      setIsRecording(true);
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
    }
  };

  const handleStop = () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = [];
    setIsRecording(false);
    onTranscriptionStatusChange(true);

    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'voice-note.webm');
    formData.append('userId', userId);

    startTransition(async () => {
      const result = await transcribeAndProcessMessage(formData);
      onTranscriptionStatusChange(false);
      if (result.success && result.messageId) {
        addPendingMessage(result.messageId);
      } else if (!result.success) {
        toast({
            variant: 'destructive',
            title: 'Transcription Error',
            description: result.message || 'Could not process the audio note.',
        });
      }
    });

    // Stop all media tracks to turn off the microphone indicator
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const isProcessing = isPending || disabled;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8 text-muted-foreground', isRecording && 'text-red-500 animate-pulse')}
      onClick={isRecording ? handleStopRecording : handleStopRecording}
      disabled={isProcessing}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mic className="h-4 w-4" strokeWidth={1.5} />
      )}
    </Button>
  );
}
