import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Return empty albums array since we're removing all RSS feed content
  return NextResponse.json({
    albums: [],
    timestamp: new Date().toISOString()
  });
}