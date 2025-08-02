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
    
    const response = await fetch(`${baseUrl}/api/albums`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      console.error('Failed to fetch albums:', response.status);
      return null;
    }

    const data = await response.json();
    const albums = data.albums || [];
    
    // Try to find album by ID or title
    const decodedId = decodeURIComponent(albumId);
    const album = albums.find((a: any) => 
      a.feedId === albumId ||
      a.title.toLowerCase() === decodedId.toLowerCase() ||
      a.title.toLowerCase().replace(/\s+/g, '-') === decodedId.toLowerCase()
    );

    return album || null;
  } catch (error) {
    console.error('Error fetching album data:', error);
    return null;
  }
}

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const albumData = await getAlbumData(id);
  const albumTitle = decodeURIComponent(id).replace(/-/g, ' ');

  return <AlbumDetailClient albumTitle={albumTitle} initialAlbum={albumData} />;
}