import { Metadata } from 'next';
import { RSSAlbum } from '@/lib/rss-parser';
import AlbumDetailClient from './AlbumDetailClient';
import { generateAlbumSlug } from '@/lib/url-utils';

// Dynamic generation - disable static generation for now
// export async function generateStaticParams() {
//   // Disabled due to build-time RSS fetching issues
//   return [];
// }

// Generate metadata for each album
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  // Handle both URL-encoded and slug formats
  let albumTitle: string;
  try {
    // First try to decode URL-encoded characters (e.g., %20 -> space)
    albumTitle = decodeURIComponent(id);
  } catch (error) {
    // If decoding fails, use the original id
    albumTitle = id;
  }
  
  // Convert hyphens to spaces for slug format (e.g., "stay-awhile" -> "stay awhile")
  albumTitle = albumTitle.replace(/-/g, ' ');
  
  // Use fallback metadata to prevent server-side rendering issues
  return {
    title: `${albumTitle} | DoerfelVerse`,
    description: `Listen to ${albumTitle} on DoerfelVerse`,
    openGraph: {
      title: albumTitle,
      description: `Listen to ${albumTitle} on DoerfelVerse`,
    },
  };
}

// Server-side data fetching - use pre-parsed data API
async function getAlbumData(albumTitle: string): Promise<RSSAlbum | null> {
  try {
    // Only attempt server-side fetching in development or if explicitly enabled
    if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_SERVER_SIDE_FETCH) {
      console.log('Skipping server-side album fetch in production');
      return null;
    }
    
    // Fetch pre-parsed album data - use relative URL for production compatibility
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.NODE_ENV === 'production' ? 'https://re.podtards.com' : 'http://localhost:3000');
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${baseUrl}/api/albums`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn('Failed to fetch albums for metadata:', response.status);
      return null;
    }
    
    const data = await response.json();
    const albums = data.albums || [];
    
    // Find the matching album
    const foundAlbum = albums.find((album: any) => {
      const albumTitleLower = album.title.toLowerCase();
      const searchTitleLower = albumTitle.toLowerCase();
      
      // Exact match
      if (album.title === albumTitle) return true;
      
      // Case-insensitive match
      if (albumTitleLower === searchTitleLower) return true;
      
      // Contains match
      if ((typeof albumTitleLower === 'string' && albumTitleLower.includes(searchTitleLower)) || 
          (typeof searchTitleLower === 'string' && searchTitleLower.includes(albumTitleLower))) return true;
      
      // Normalized match
      const normalizedAlbum = albumTitleLower.replace(/[^a-z0-9]/g, '');
      const normalizedSearch = searchTitleLower.replace(/[^a-z0-9]/g, '');
      if (normalizedAlbum === normalizedSearch) return true;
      
      return false;
    });
    
    return foundAlbum || null;
  } catch (error) {
    console.error('Error fetching album data for metadata:', error);
    return null;
  }
}

export default async function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Handle both URL-encoded and slug formats
  let albumTitle: string;
  try {
    // First try to decode URL-encoded characters (e.g., %20 -> space)
    albumTitle = decodeURIComponent(id);
  } catch (error) {
    // If decoding fails, use the original id
    albumTitle = id;
  }
  
  // Convert hyphens to spaces for slug format (e.g., "stay-awhile" -> "stay awhile")
  albumTitle = albumTitle.replace(/-/g, ' ');
  
  console.log(`🔍 Album page: id="${id}" -> albumTitle="${albumTitle}"`);
  
  // Skip server-side data fetching to prevent RSC payload issues
  // Let the client component handle data loading
  const album = null;
  
  return <AlbumDetailClient albumTitle={albumTitle} initialAlbum={album} />;
}