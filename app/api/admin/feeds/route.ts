import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

export async function GET() {
  try {
    const feedsPath = path.join(process.cwd(), 'data', 'feeds.json');
    
    if (!fsSync.existsSync(feedsPath)) {
      // In production, return default feeds if file doesn't exist
      const defaultFeeds = {
        feeds: [
          {
            id: "www-doerfelverse-com-feeds-bloodshot-lies-album-xml",
            originalUrl: "https://www.doerfelverse.com/feeds/bloodshot-lies-album.xml",
            type: "album",
            title: "Bloodshot Lies - The Album",
            priority: "core",
            status: "active",
            addedAt: "2025-08-02T05:00:00.000Z",
            lastUpdated: "2025-08-02T05:00:00.000Z"
          },
          {
            id: "www-doerfelverse-com-feeds-think-ep-xml",
            originalUrl: "https://www.doerfelverse.com/feeds/think-ep.xml", 
            type: "album",
            title: "Think EP",
            priority: "core",
            status: "active",
            addedAt: "2025-08-02T05:00:00.000Z",
            lastUpdated: "2025-08-02T05:00:00.000Z"
          },
          {
            id: "www-doerfelverse-com-feeds-ben-doerfel-xml",
            originalUrl: "https://www.doerfelverse.com/feeds/ben-doerfel.xml",
            type: "publisher", 
            title: "Ben Doerfel Music",
            priority: "core",
            status: "active",
            addedAt: "2025-08-02T05:00:00.000Z",
            lastUpdated: "2025-08-02T05:00:00.000Z"
          }
        ],
        lastUpdated: new Date().toISOString(),
        version: 2
      };
      
      return NextResponse.json({
        success: true,
        feeds: defaultFeeds.feeds,
        count: defaultFeeds.feeds.length
      });
    }

    const feedsData = JSON.parse(await fs.readFile(feedsPath, 'utf-8'));
    
    return NextResponse.json({
      success: true,
      feeds: feedsData.feeds || [],
      count: feedsData.feeds?.length || 0
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
    const { url, type = 'album' } = body;

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

    // In production, we can't persistently store feeds due to read-only file system
    // For now, return a message explaining this limitation
    return NextResponse.json({
      success: false,
      error: 'Feed management is currently in read-only mode',
      message: 'Due to Vercel\'s serverless architecture, dynamic feed management requires a database solution. Currently displaying default feeds only.'
    }, { status: 400 });

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

    // In production, we can't persistently modify feeds due to read-only file system
    return NextResponse.json({
      success: false,
      error: 'Feed management is currently in read-only mode',
      message: 'Due to Vercel\'s serverless architecture, dynamic feed management requires a database solution. Currently displaying default feeds only.'
    }, { status: 400 });

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
