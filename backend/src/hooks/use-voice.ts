
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export function useVoice() {
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const startRecording = useCallback(async (onTranscriptionComplete?: (text: string) => void) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('file', audioBlob);

                // Send to backend
                const res = await fetch('/api/audio/transcribe', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.text) {
                    console.log('Transcribed:', data.text);
                    if (onTranscriptionComplete) {
                        onTranscriptionComplete(data.text);
                    } else {
                        toast.success('Transcribed: ' + data.text.slice(0, 20) + '...');
                    }
                }
            };

            mediaRecorder.start();
            setIsRecording(true);

            // Allow stopping via a return function
            return () => {
                mediaRecorder.stop();
                setIsRecording(false);
                stream.getTracks().forEach(track => track.stop());
            };
        } catch (e) {
            console.error('Mic access denied', e);
            toast.error('Microphone access denied');
            return null;
        }
    }, []);

    const speak = useCallback(async (text: string) => {
        setIsSpeaking(true);
        try {
            const res = await fetch('/api/audio/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            const data = await res.json();
            if (data.audioUrl) {
                const audio = new Audio(data.audioUrl);
                audio.onended = () => setIsSpeaking(false);
                await audio.play();
            }
        } catch (e) {
            console.error(e);
            setIsSpeaking(false);
        }
    }, []);

    return { isRecording, startRecording, isSpeaking, speak };
}
