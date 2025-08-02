import { NextRequest, NextResponse } from 'next/server';
import { getAllFeeds, addFeed, removeFeed, initializeDatabase, seedDefaultFeeds } from '@/lib/db';

export async function GET() {
  try {
    // Initialize database schema if needed (but don't auto-seed)
    await initializeDatabase();
    
    const dbFeeds = await getAllFeeds();
    
    // Convert DB format to API format for compatibility
    const apiFeeds = dbFeeds.map(feed => ({
      id: feed.id,
      originalUrl: feed.original_url,
      type: feed.type,
      title: feed.title,
      priority: feed.priority,
      status: feed.status,
      addedAt: feed.added_at.toISOString(),
      lastUpdated: feed.last_updated.toISOString()
    }));
    
    return NextResponse.json({
      success: true,
      feeds: apiFeeds,
      count: apiFeeds.length
    });
  } catch (error) {
    console.error('Error fetching feeds:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch feeds',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, type = 'album', title } = body;

    // Validate inputs
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    if (!['album', 'publisher'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be "album" or "publisher"' },
        { status: 400 }
      );
    }

    // Add feed to database
    const result = await addFeed(url, type, title);
    
    if (result.success && result.feed) {
      // Convert DB format to API format
      const apiFeed = {
        id: result.feed.id,
        originalUrl: result.feed.original_url,
        type: result.feed.type,
        title: result.feed.title,
        priority: result.feed.priority,
        status: result.feed.status,
        addedAt: result.feed.added_at.toISOString(),
        lastUpdated: result.feed.last_updated.toISOString()
      };
      
      return NextResponse.json({
        success: true,
        feed: apiFeed,
        message: 'Feed added successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to add feed' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error adding feed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add feed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedId } = body;

    if (!feedId) {
      return NextResponse.json(
        { success: false, error: "Feed ID is required" },
        { status: 400 }
      );
    }

    // Remove feed from database
    const result = await removeFeed(feedId);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Feed removed successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to remove feed' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error removing feed:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to remove feed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
