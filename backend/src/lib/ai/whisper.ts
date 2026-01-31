import 'server-only';

/**
 * Transcribes audio using local Whisper service
 * @param file The audio file (Blob/File)
 * @returns The transcribed text
 */
export async function transcribeAudio(file: File | Blob): Promise<string> {
    try {
        const formData = new FormData();
        formData.append('audio_file', file);
        formData.append('task', 'transcribe');
        formData.append('output', 'json');

        // Call the local Whisper service defined in docker-compose.yml
        const response = await fetch('http://localhost:9000/asr', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Whisper service error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.text || '';
    } catch (error: any) {
        console.error('Local Whisper Transcription Error:', error);
        throw new Error(`Transcription failed: ${error.message}. Is the 'whisper' container running?`);
    }
}
