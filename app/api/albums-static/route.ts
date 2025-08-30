import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// In-memory cache for generated data
let generatedData: any = null;
let lastGenerated = 0;
const GENERATION_TTL = 10 * 60 * 1000; // 10 minutes

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try to serve pre-generated static file first
    const staticDataPath = path.join(process.cwd(), 'public', 'static-albums.json');
    
    if (fs.existsSync(staticDataPath)) {
      const staticData = JSON.parse(fs.readFileSync(staticDataPath, 'utf8'));
      
      const response = NextResponse.json({
        ...staticData,
        static: true,
        loadTime: 'instant'
      });
      
      // Aggressive caching for static data
      response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
      return response;
    }
    
    // Check in-memory cache
    const now = Date.now();
    if (generatedData && (now - lastGenerated) < GENERATION_TTL) {
      console.log('📦 Serving cached generated data');
      const response = NextResponse.json({
        ...generatedData,
        static: false,
        cached: true,
        loadTime: 'cached'
      });
      
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
      return response;
    }
    
    // Generate data on-demand by calling the RSS parsing endpoint
    console.log('🔄 Generating static data on-demand...');
    
    try {
      // Import and use RSS parser directly to avoid HTTP overhead
      const { FeedManager } = await import('@/lib/feed-manager');
      const { RSSParser } = await import('@/lib/rss-parser');
      
      console.log('🔄 Parsing albums without database dependency...');
      
      // Get feeds directly from FeedManager (uses feeds.json, no database)
      const feeds = FeedManager.getActiveFeeds();
      const albumFeeds = feeds.filter(feed => feed.type === 'album');
      
      console.log(`📡 Processing ${albumFeeds.length} album feeds...`);
      
      const albums = [];
      const errors = [];
      
      for (const feed of albumFeeds.slice(0, 20)) { // Limit to first 20 to avoid rate limiting
        try {
          console.log(`🎵 Parsing: ${feed.title}`);
          const albumData = await RSSParser.parseAlbumFeed(feed.originalUrl);
          
          if (albumData) {
            // Add feed metadata
            const enrichedAlbum = {
              ...albumData,
              feedId: feed.id,
              feedUrl: feed.originalUrl,
              lastUpdated: feed.lastUpdated
            };
            
            albums.push(enrichedAlbum);
            console.log(`✅ Parsed: ${albumData.title}`);
          } else {
            console.warn(`⚠️ No data returned for ${feed.title}`);
            errors.push({
              feedId: feed.id,
              error: 'No album data returned'
            });
          }
        } catch (error) {
          console.error(`❌ Error parsing ${feed.title}:`, error);
          errors.push({
            feedId: feed.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      console.log(`🎉 Successfully parsed ${albums.length} albums for static generation`);
      
      const albumsData = {
        albums,
        count: albums.length,
        errors,
        timestamp: new Date().toISOString(),
        source: 'direct-static-parsing'
      };
      
      // Cache in memory
      generatedData = {
        ...albumsData,
        generated: true,
        generatedAt: new Date().toISOString()
      };
      lastGenerated = now;
      
      // Try to save to file for next time
      try {
        fs.writeFileSync(staticDataPath, JSON.stringify(generatedData, null, 2));
        console.log('💾 Saved generated data to static file');
      } catch (writeError) {
        console.warn('⚠️ Could not save static file:', writeError instanceof Error ? writeError.message : writeError);
      }
      
      const response = NextResponse.json({
        ...generatedData,
        static: false,
        generated: true,
        loadTime: 'on-demand'
      });
      
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
      return response;
    } catch (generationError) {
      console.warn('⚠️ Could not generate data:', generationError instanceof Error ? generationError.message : generationError);
    }
    
    // Fallback to minimal hardcoded data if no static file exists
    const fallbackAlbums = [
      {
        title: "Bloodshot Lies",
        artist: "Doerfel Family",
        description: "The album",
        coverArt: "/bloodshot-lies-big.png",
        tracks: [
          {
            title: "Bloodshot Lies",
            duration: "3:45",
            url: "https://www.doerfelverse.com/audio/bloodshot-lies.mp3",
            trackNumber: 1
          }
        ],
        releaseDate: "2024-01-01",
        feedId: "fallback"
      }
    ];
    
    const response = NextResponse.json({
      albums: fallbackAlbums,
      count: fallbackAlbums.length,
      timestamp: new Date().toISOString(),
      static: false,
      fallback: true
    });
    
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    return response;
    
  } catch (error) {
    console.error('Error serving static albums:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load albums',
        albums: [],
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}