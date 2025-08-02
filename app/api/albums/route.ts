import { NextResponse } from 'next/server';
import { RSSParser } from '@/lib/rss-parser';
import { getAllFeeds, initializeDatabase, seedDefaultFeeds } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Initialize database and seed default feeds if needed
    await initializeDatabase();
    await seedDefaultFeeds();
    
    // Load RSS feeds from database
    const dbFeeds = await getAllFeeds();
    
    // Process each RSS feed
    const albums = [];
    for (const feed of dbFeeds) {
      if (feed.status === 'active') {
        try {
          console.log(`🎵 Processing RSS feed: ${feed.original_url}`);
          const album = await RSSParser.parseAlbumFeed(feed.original_url);
          if (album) {
            // Add feed metadata to the album
            album.feedId = feed.id;
            album.feedUrl = feed.original_url;
            album.lastUpdated = feed.last_updated.toISOString();
            albums.push(album);
            console.log(`✅ Successfully parsed album: ${album.title}`);
          }
        } catch (error) {
          console.error(`❌ Failed to parse RSS feed ${feed.original_url}:`, error);
          // Continue processing other feeds
        }
      }
    }

    return NextResponse.json({
      albums,
      count: albums.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing RSS feeds:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process RSS feeds',
        albums: [],
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}