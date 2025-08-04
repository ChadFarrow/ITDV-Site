'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

interface Track {
  title: string;
  duration: string;
  url: string;
  trackNumber: number;
  image?: string;
}

interface Album {
  title: string;
  artist: string;
  description: string;
  coverArt: string;
  tracks: Track[];
  releaseDate: string;
  feedId: string;
  feedUrl?: string;
  funding?: any[];
  podroll?: any[];
  publisher?: {
    feedGuid: string;
    feedUrl: string;
    medium: string;
  };
}

interface Publisher {
  name: string;
  guid: string;
  feedUrl: string;
  medium: string;
  albums: Album[];
}

interface PublisherDetailClientProps {
  publisherName: string;
  initialPublisher: Publisher | null;
}

export default function PublisherDetailClient({ publisherName, initialPublisher }: PublisherDetailClientProps) {
  const [publisher, setPublisher] = useState<Publisher | null>(initialPublisher);
  const [isLoading, setIsLoading] = useState(!initialPublisher);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialPublisher) {
      loadPublisher();
    }
  }, [publisherName, initialPublisher]);

  const loadPublisher = async () => {
    try {
      setIsLoading(true);
      // Try fast static endpoint first
      let response = await fetch('/api/albums-static');
      
      if (!response.ok) {
        console.log('Static endpoint failed, falling back to RSS parsing...');
        response = await fetch('/api/albums');
      }
      
      if (!response.ok) {
        throw new Error('Failed to load albums');
      }

      const data = await response.json();
      const albums = data.albums || [];
      
      // Create slug for matching
      const createSlug = (name: string) => 
        name.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
      
      const decodedName = decodeURIComponent(publisherName);
      const nameSlug = createSlug(decodedName);
      
      // Find albums by this publisher
      const publisherAlbums = albums.filter((album: Album) => {
        if (!album.publisher) return false;
        
        const artistSlug = createSlug(album.artist);
        return artistSlug === nameSlug || album.artist.toLowerCase() === decodedName.toLowerCase();
      });

      if (publisherAlbums.length > 0) {
        const firstAlbum = publisherAlbums[0];
        const publisherInfo: Publisher = {
          name: firstAlbum.artist,
          guid: firstAlbum.publisher!.feedGuid,
          feedUrl: firstAlbum.publisher!.feedUrl,
          medium: firstAlbum.publisher!.medium,
          albums: publisherAlbums
        };
        
        setPublisher(publisherInfo);
        setError(null);
      } else {
        setError('Publisher not found');
      }
    } catch (err) {
      console.error('Error loading publisher:', err);
      setError('Failed to load publisher');
    } finally {
      setIsLoading(false);
    }
  };

  const getAlbumSlug = (album: Album) => {
    return album.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const getReleaseYear = (releaseDate: string) => {
    try {
      return new Date(releaseDate).getFullYear();
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !publisher) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold mb-4">{error || 'Publisher not found'}</h1>
        <Link 
          href="/"
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          ← Back to albums
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        {/* Use first album's cover art as background */}
        {publisher.albums[0]?.coverArt && (
          <Image
            src={publisher.albums[0].coverArt}
            alt={`${publisher.name} background`}
            fill
            className="object-cover w-full h-full"
            priority
          />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-black/90 to-gray-900/95"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                  title="Back to albums"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </Link>
                
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                    Into the Doerfel-Verse
                  </Link>
                  <span className="text-gray-600">/</span>
                  <span className="font-medium truncate max-w-[200px]">{publisher.name}</span>
                </div>
              </div>

              {/* Desktop Info */}
              <div className="hidden sm:block text-xs text-gray-400">
                {publisher.albums.length} albums
              </div>
            </div>
          </div>
        </header>

        {/* Publisher Hero Section */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Publisher Artwork */}
              <div className="flex-shrink-0 mx-auto lg:mx-0">
                <div className="w-64 h-64 lg:w-80 lg:h-80 relative rounded-xl shadow-2xl overflow-hidden border border-white/20">
                  <Image
                    src={publisher.albums[0]?.coverArt || '/placeholder-episode.jpg'}
                    alt={publisher.name}
                    fill
                    className="object-cover"
                    priority
                    sizes="(min-width: 1024px) 320px, 256px"
                  />
                </div>
              </div>

              {/* Publisher Info */}
              <div className="flex-1 text-center lg:text-left">
                <div className="mb-6">
                  <h1 className="text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {publisher.name}
                  </h1>
                  <p className="text-xl lg:text-2xl text-gray-300 mb-4">Publisher</p>
                  
                  <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-gray-400 mb-6">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      {publisher.albums.length} albums
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w2 h-2 bg-green-400 rounded-full"></span>
                      {publisher.medium}
                    </span>
                  </div>

                  <div className="max-w-2xl mx-auto lg:mx-0 mb-6">
                    <p className="text-gray-300 leading-relaxed">
                      All albums published by {publisher.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Albums Grid */}
        <div className="container mx-auto px-4 pb-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Albums</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {publisher.albums.map((album, index) => (
                <Link
                  key={`${album.feedId}-${index}`}
                  href={`/album/${getAlbumSlug(album)}`}
                  className="group block"
                >
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 hover:bg-white/10 transition-colors border border-white/10">
                    <div className="aspect-square mb-3 rounded overflow-hidden">
                      <Image
                        src={album.coverArt}
                        alt={album.title}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 truncate group-hover:text-blue-400 transition-colors">
                      {album.title}
                    </h3>
                    <p className="text-xs text-gray-400 truncate">{album.artist}</p>
                    {album.releaseDate && (
                      <p className="text-xs text-gray-500 mt-1">{getReleaseYear(album.releaseDate)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom spacing for audio player */}
        <div className="h-24" />
      </div>
    </div>
  );
}