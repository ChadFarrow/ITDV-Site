import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { RSSParser } from '@/lib/rss-parser';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Load RSS feeds from feeds.json
    const feedsPath = path.join(process.cwd(), 'data', 'feeds.json');
    
    if (!fsSync.existsSync(feedsPath)) {
      return NextResponse.json({
        albums: [],
        timestamp: new Date().toISOString()
      });
    }

    const feedsData = JSON.parse(await fs.readFile(feedsPath, 'utf-8'));
    const feeds = feedsData.feeds || [];
    
    // Process each RSS feed
    const albums = [];
    for (const feed of feeds) {
      if (feed.status === 'active') {
        try {
          console.log(`🎵 Processing RSS feed: ${feed.originalUrl}`);
          const album = await RSSParser.parseAlbumFeed(feed.originalUrl);
          if (album) {
            // Add feed metadata to the album
            album.feedId = feed.id;
            album.feedUrl = feed.originalUrl;
            album.lastUpdated = feed.lastUpdated;
            albums.push(album);
            console.log(`✅ Successfully parsed album: ${album.title}`);
          }
        } catch (error) {
          console.error(`❌ Failed to parse RSS feed ${feed.originalUrl}:`, error);
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