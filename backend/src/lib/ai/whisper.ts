import OpenAI from 'openai';

const getOpenAI = () => new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

/**
 * Transcribes audio using OpenAI Whisper
 * @param file The audio file (Blob/File)
 * @returns The transcribed text
 */
export async function transcribeAudio(file: File | Blob): Promise<string> {
    try {
        const openai = getOpenAI();
        const transcription = await openai.audio.transcriptions.create({
            file: file as any,
            model: "whisper-1",
        });

        return transcription.text;
    } catch (error: any) {
        console.error('Whisper Transcription Error:', error);
        throw new Error(`Transcription failed: ${error.message}`);
    }
}
