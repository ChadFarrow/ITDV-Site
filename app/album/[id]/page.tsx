import { Metadata } from 'next';
import AlbumDetailClient from './AlbumDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const albumTitle = decodeURIComponent(id).replace(/-/g, ' ');
  
  return {
      title: `${albumTitle} | Into the Doerfel-Verse`,
  description: `Listen to ${albumTitle} on Into the Doerfel-Verse`,
  };
}

async function getAlbumData(albumId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                   (process.env.NODE_ENV === 'production' 
                     ? 'https://itdv-site.vercel.app' 
                     : 'http://localhost:3000');
    
    // Try fast static endpoint first, fallback to RSS parsing
    let response = await fetch(`${baseUrl}/api/albums-static`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    
    if (!response.ok) {
      console.log('Static endpoint failed, falling back to RSS parsing...');
      response = await fetch(`${baseUrl}/api/albums`, {
        next: { revalidate: 60 }, // Cache for 1 minute
      });
    }

    if (!response.ok) {
      console.error('Failed to fetch albums:', response.status);
      return null;
    }

    const data = await response.json();
    const albums = data.albums || [];
    
    // Try to find album by ID or title
    const decodedId = decodeURIComponent(albumId);
    
    // Helper function to create URL slug (same as homepage)
    const createSlug = (title: string) => 
      title.toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with dashes
        .replace(/-+/g, '-')            // Replace multiple consecutive dashes with single dash
        .replace(/^-+|-+$/g, '');       // Remove leading/trailing dashes
    
    const album = albums.find((a: any) => 
      a.feedId === albumId ||
      a.title.toLowerCase() === decodedId.toLowerCase() ||
      createSlug(a.title) === decodedId.toLowerCase() ||
      // Backward compatibility: also check old format with multiple dashes
      a.title.toLowerCase().replace(/\s+/g, '-') === decodedId.toLowerCase()
    );

    return album || null;
  } catch (error) {
    console.error('Error fetching album data:', error);
    return null;
  }
}

export default async function AlbumPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const albumData = await getAlbumData(id);
  const albumTitle = decodeURIComponent(id).replace(/-/g, ' ');
  
  // Check for autoplay parameter
  const shouldAutoplay = resolvedSearchParams.autoplay === 'true';

  return <AlbumDetailClient 
    albumTitle={albumTitle} 
    initialAlbum={albumData}
    autoplay={shouldAutoplay}
  />;
}