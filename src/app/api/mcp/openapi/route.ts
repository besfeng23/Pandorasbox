import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * API route to serve the MCP OpenAPI schema
 * This ensures proper Content-Type headers for ChatGPT Actions
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'openapi-mcp.yaml');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'application/x-yaml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving OpenAPI schema:', error);
    return NextResponse.json(
      { error: 'Failed to load OpenAPI schema' },
      { status: 500 }
    );
  }
}

