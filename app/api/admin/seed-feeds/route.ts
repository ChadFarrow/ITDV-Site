import { NextResponse } from 'next/server';
import { initializeDatabase, seedDefaultFeeds } from '@/lib/db';

export async function POST() {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Force seed default feeds (ignoring existing check)
    await seedDefaultFeeds();
    
    return NextResponse.json({
      success: true,
      message: 'Default feeds seeded successfully'
    });
  } catch (error) {
    console.error('Error seeding feeds:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed feeds',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}