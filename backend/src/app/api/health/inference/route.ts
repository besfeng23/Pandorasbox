import { NextResponse } from 'next/server';

export async function GET() {
  const inferenceUrl = process.env.INFERENCE_URL || 'http://localhost:8000/v1';
  try {
    const res = await fetch(`${inferenceUrl}/models`);
    if (res.ok) {
      return NextResponse.json({ status: 'online', service: 'vLLM' });
    }
    return NextResponse.json({ status: 'offline', error: 'vLLM returned non-200' }, { status: 503 });
  } catch (error) {
    return NextResponse.json({ status: 'offline', error: 'Connection failed' }, { status: 503 });
  }
}

