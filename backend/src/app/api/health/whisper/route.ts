import { NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  const whisperUrl = process.env.WHISPER_URL || 'http://localhost:9000';
  try {
    // onerahmet/openai-whisper-asr-webservice supports GET / for a simple page; /asr is POST-only.
    const res = await fetch(`${whisperUrl}/`);
    if (res.ok) {
      return NextResponse.json({ status: 'online', service: 'Whisper' }, { headers: corsHeaders() });
    }
    return NextResponse.json({ status: 'offline', error: 'Whisper returned non-200' }, { status: 503, headers: corsHeaders() });
  } catch (error: any) {
    console.error(`[Health Check] Whisper Connection Error to ${whisperUrl}:`, error.message, error.cause || '');
    return NextResponse.json({ status: 'offline', error: `Connection failed: ${error.message}` }, { status: 503, headers: corsHeaders() });
  }
}


