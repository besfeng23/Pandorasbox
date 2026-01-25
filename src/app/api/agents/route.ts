import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET() {
  return NextResponse.json([
    { id: 'builder', name: 'Builder', status: 'active' },
    { id: 'universe', name: 'Universe', status: 'active' }
  ], { headers: { 'Access-Control-Allow-Origin': '*' } });
}

