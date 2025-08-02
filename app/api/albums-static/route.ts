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
      // Call our own RSS parsing endpoint
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
        
      const albumsResponse = await fetch(`${baseUrl}/api/albums`, {
        headers: {
          'User-Agent': 'ITDV-StaticGenerator/1.0'
        }
      });
      
      if (albumsResponse.ok) {
        const albumsData = await albumsResponse.json();
        
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
          console.warn('⚠️ Could not save static file:', writeError.message);
        }
        
        const response = NextResponse.json({
          ...generatedData,
          static: false,
          generated: true,
          loadTime: 'on-demand'
        });
        
        response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
        return response;
      }
    } catch (generationError) {
      console.warn('⚠️ Could not generate data:', generationError.message);
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