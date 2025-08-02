import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    const parsedFeedsPath = path.join(process.cwd(), 'data', 'parsed-feeds.json');
    
    if (!fs.existsSync(parsedFeedsPath)) {
      console.error('Parsed feeds file not found at:', parsedFeedsPath);
      return NextResponse.json({ 
        error: 'Parsed feeds not found',
        timestamp: new Date().toISOString()
      }, { 
        status: 404,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Read file with error handling
    let parsedFeedsData;
    try {
      const fileContent = fs.readFileSync(parsedFeedsPath, 'utf-8');
      parsedFeedsData = JSON.parse(fileContent);
    } catch (readError) {
      console.error('Error reading or parsing parsed-feeds.json:', readError);
      return NextResponse.json({ 
        error: 'Failed to read parsed feeds',
        timestamp: new Date().toISOString()
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    // Validate parsed feeds data structure
    if (!parsedFeedsData || !Array.isArray(parsedFeedsData.feeds)) {
      console.error('Invalid parsed feeds data structure:', parsedFeedsData);
      return NextResponse.json({ 
        error: 'Invalid parsed feeds format',
        timestamp: new Date().toISOString()
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    // Filter publisher feeds with parsed data
    const publisherFeeds = parsedFeedsData.feeds.filter((feed: any) => 
      feed.type === 'publisher' && 
      feed.parseStatus === 'success' &&
      feed.parsedData
    );
    
    const publishers = publisherFeeds.map((feed: any) => ({
      id: feed.id,
      title: feed.title,
      originalUrl: feed.originalUrl,
      parseStatus: feed.parseStatus,
      lastParsed: feed.lastParsed,
      publisherInfo: feed.parsedData?.publisherInfo || null,
      publisherItems: feed.parsedData?.publisherItems || [],
      itemCount: feed.parsedData?.publisherItems?.length || 0
    }));

    const response = {
      publishers,
      total: publishers.length,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300', // Cache for 5 minutes
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
    });
  } catch (error) {
    console.error('Unexpected error in publishers API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 