import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const statusPath = path.join(process.cwd(), 'docs', 'status.json');
    const statusData = fs.readFileSync(statusPath, 'utf-8');
    const status = JSON.parse(statusData);
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error reading Kairos status:', error);
    return NextResponse.json(
      { error: 'Status data not available' },
      { status: 404 }
    );
  }
}

