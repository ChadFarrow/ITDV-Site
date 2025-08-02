import { NextRequest, NextResponse } from 'next/server';

// Rate limiting for audio requests
const audioRateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_AUDIO_REQUESTS_PER_MINUTE = 30;

/**
 * Check if we're rate limited for audio requests
 */
function isAudioRateLimited(url: string): boolean {
  try {
    const domain = new URL(url).hostname;
    const now = Date.now();
    const limit = audioRateLimit.get(domain);
    
    if (!limit) {
      audioRateLimit.set(domain, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      return false;
    }
    
    if (now > limit.resetTime) {
      audioRateLimit.set(domain, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      return false;
    }
    
    if (limit.count >= MAX_AUDIO_REQUESTS_PER_MINUTE) {
      return true;
    }
    
    limit.count++;
    return false;
  } catch {
    return false;
  }
}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const audioUrl = searchParams.get('url');

  if (!audioUrl) {
    return NextResponse.json({ error: 'Audio URL parameter required' }, { status: 400 });
  }

  try {
    // Validate URL
    const url = new URL(audioUrl);
    
    // Only allow certain domains for security
    const allowedDomains = [
      'www.doerfelverse.com',
      'doerfelverse.com',
      'music.behindthesch3m3s.com',
      'thisisjdog.com',
      'www.thisisjdog.com',
      'wavlake.com',
      'ableandthewolf.com',
      'static.staticsave.com',
      'op3.dev',
      'd12wklypp119aj.cloudfront.net',
      'files.heycitizen.xyz',
      'rocknrollbreakheart.com',
      'annipowellmusic.com',
      'whiterabbitrecords.org',
      'feed.falsefinish.club',
      'f4.bcbits.com',
      'static.wixstatic.com',
      'noagendaassets.com',
      'media.rssblue.com',
      'customer-dlnbepb8zpz7h846.cloudflarestream.com'
    ];
    
    if (!allowedDomains.includes(url.hostname)) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }

    // Note: Removed in-memory caching to enable streaming
    // Browser and CDN caching will handle performance optimization

    // Check rate limiting
    if (isAudioRateLimited(audioUrl)) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    console.log(`🎵 Proxying audio: ${audioUrl}`);

    // Fetch the audio file
    const response = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'DoerfelVerse/1.0 (Music Audio Proxy)',
        'Range': request.headers.get('Range') || 'bytes=0-', // Support range requests
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout for audio
    });

    if (!response.ok) {
      console.error(`❌ Audio fetch failed: ${response.status} ${response.statusText}`);
      return NextResponse.json({ 
        error: 'Failed to fetch audio file',
        status: response.status 
      }, { status: response.status });
    }

    // Stream the response instead of buffering everything
    let contentType = response.headers.get('Content-Type') || 'audio/mpeg';
    
    // Handle HLS manifest files
    if (audioUrl.includes('.m3u8')) {
      contentType = 'application/vnd.apple.mpegurl';
    }
    
    const contentLength = response.headers.get('Content-Length');
    
    // Create response with proper headers for streaming
    const proxyResponse = new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=600', // 10 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Access-Control-Allow-Headers': 'Range',
        'Accept-Ranges': 'bytes',
      },
    });

    // Copy relevant headers from original response
    if (contentLength) {
      proxyResponse.headers.set('Content-Length', contentLength);
    }
    
    const contentRange = response.headers.get('Content-Range');
    if (contentRange) {
      proxyResponse.headers.set('Content-Range', contentRange);
    }

    console.log(`✅ Audio streamed successfully: ${audioUrl} (${contentLength || 'unknown'} bytes)`);
    return proxyResponse;

  } catch (error) {
    console.error('❌ Audio proxy error:', error);
    return NextResponse.json({ 
      error: 'Failed to proxy audio file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
} 