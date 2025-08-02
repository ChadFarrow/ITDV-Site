'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAudio } from '@/contexts/AudioContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AlbumDetailSkeleton } from '@/components/AlbumSkeleton';

interface Track {
  title: string;
  duration: string;
  url: string;
  trackNumber: number;
  image?: string;
}

interface RSSFunding {
  url: string;
  message?: string;
}

interface RSSPodRoll {
  url: string;
  title?: string;
  description?: string;
}

interface Album {
  title: string;
  artist: string;
  description: string;
  coverArt: string;
  tracks: Track[];
  releaseDate: string;
  feedId: string;
  funding?: RSSFunding[];
  podroll?: RSSPodRoll[];
}

interface AlbumDetailClientProps {
  albumTitle: string;
  initialAlbum: Album | null;
}

export default function AlbumDetailClient({ albumTitle, initialAlbum }: AlbumDetailClientProps) {
  const router = useRouter();
  const { playAlbum, playTrack, currentTrack, isPlaying, pause, resume } = useAudio();
  const [album, setAlbum] = useState<Album | null>(initialAlbum);
  const [isLoading, setIsLoading] = useState(!initialAlbum);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialAlbum) {
      loadAlbum();
    }
  }, [albumTitle]);

  const loadAlbum = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/albums');
      
      if (!response.ok) {
        throw new Error('Failed to load albums');
      }

      const data = await response.json();
      const albums = data.albums || [];
      
      // Find matching album
      const foundAlbum = albums.find((a: Album) => 
        a.title.toLowerCase() === albumTitle.toLowerCase() ||
        a.title.toLowerCase().replace(/\s+/g, '-') === albumTitle.toLowerCase()
      );

      if (foundAlbum) {
        setAlbum(foundAlbum);
        setError(null);
      } else {
        setError('Album not found');
      }
    } catch (err) {
      console.error('Error loading album:', err);
      setError('Failed to load album');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAlbum = () => {
    if (!album) return;
    
    const audioTracks = album.tracks.map(track => ({
      ...track,
      artist: album.artist,
      album: album.title,
      image: track.image || album.coverArt
    }));
    
    playAlbum(audioTracks, 0, album.title);
  };

  const handlePlayTrack = (track: Track, index: number) => {
    if (!album) return;
    
    const audioTracks = album.tracks.map(t => ({
      ...t,
      artist: album.artist,
      album: album.title,
      image: t.image || album.coverArt
    }));
    
    playAlbum(audioTracks, index, album.title);
  };

  const isTrackPlaying = (track: Track) => {
    return currentTrack?.url === track.url && isPlaying;
  };

  const formatDuration = (duration: string) => {
    // Handle MM:SS or M:SS format
    return duration;
  };

  const getReleaseYear = () => {
    if (!album) return '';
    try {
      return new Date(album.releaseDate).getFullYear();
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return <AlbumDetailSkeleton />;
  }

  if (error || !album) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold mb-4">{error || 'Album not found'}</h1>
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
    <div className="min-h-screen text-white relative overflow-hidden bg-gray-900">
      {/* Album Art Background - More Prominent */}
      <div className="fixed inset-0 z-0">
        <Image
          src={album.coverArt}
          alt={`${album.title} background`}
          fill
          className="object-cover w-full h-full opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gray-900/80"></div>
      </div>

      {/* Content overlay */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b backdrop-blur-sm bg-black/30 sticky top-0 z-40" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
              Albums
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-sm font-medium truncate">{album.title}</span>
          </div>
        </div>
      </header>

      {/* Album Info Section - Exact FUCKIT Style */}
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <div className="text-center mb-4">
          {/* Album Cover - Exact size like original */}
          <div className="inline-block mb-3">
            <div className="w-48 h-48 relative overflow-hidden rounded shadow-xl mx-auto">
              <Image
                src={album.coverArt}
                alt={album.title}
                fill
                className="object-cover"
                priority
                sizes="192px"
              />
            </div>
          </div>

          {/* Album Details - Very Compact */}
          <div className="mb-3">
            <h1 className="text-2xl font-bold mb-1 text-white">{album.title}</h1>
            <p className="text-base text-gray-300 mb-2">{album.artist}</p>
            
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-3">
              <span>{getReleaseYear()}</span>
              <span>•</span>
              <span>{album.tracks.length} tracks</span>
            </div>

            {album.description && (
              <div className="bg-gray-800/80 rounded p-3 max-w-md mx-auto mb-3">
                <p className="text-gray-300 text-xs leading-tight">{album.description}</p>
              </div>
            )}
          </div>

          {/* Play Controls - Very compact */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={handlePlayAlbum}
              className="flex items-center gap-1 px-4 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-white font-medium text-xs"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span>Play Album</span>
            </button>
          </div>
        </div>
      </div>

        {/* Podroll and Funding Sections - Very Compact */}
        {(album.podroll && album.podroll.length > 0) || (album.funding && album.funding.length > 0) ? (
          <div className="container mx-auto px-4 max-w-2xl mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Podroll Section - Very compact */}
            {album.podroll && album.podroll.length > 0 && (
              <div className="bg-gray-800/90 rounded p-2">
                <h3 className="text-xs font-semibold text-white mb-1">Related Shows</h3>
                <div className="space-y-1">
                  {album.podroll.map((podrollItem, index) => (
                    <a
                      key={index}
                      href={podrollItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-1 bg-gray-700/50 hover:bg-gray-700 rounded text-xs text-blue-300 hover:text-blue-200 transition-colors truncate"
                    >
                      {podrollItem.title || 'Related Show'}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Funding Section - Very compact */}
            {album.funding && album.funding.length > 0 && (
              <div className="bg-gray-800/90 rounded p-2">
                <h3 className="text-xs font-semibold text-white mb-1">Support</h3>
                <div className="space-y-1">
                  {album.funding.map((fundingItem, index) => (
                    <a
                      key={index}
                      href={fundingItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-1 bg-gray-700/50 hover:bg-gray-700 rounded text-xs text-green-300 hover:text-green-200 transition-colors"
                    >
                      {fundingItem.message || 'Support this Artist'}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        ) : null}

        {/* Track List - Exact FUCKIT Style */}
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-gray-800/90 rounded overflow-hidden">
            <div className="p-2 border-b border-gray-700">
              <h2 className="text-base font-semibold text-center text-white">Tracks</h2>
            </div>
            
            <div className="divide-y divide-gray-700/50">
              {album.tracks.map((track, index) => {
                const isCurrentTrack = currentTrack?.url === track.url;
                const isCurrentlyPlaying = isTrackPlaying(track);
                
                return (
                  <div
                    key={track.trackNumber}
                    className={`flex items-center gap-3 p-2 hover:bg-gray-700/50 transition-colors cursor-pointer group ${
                      isCurrentTrack ? 'bg-gray-700/70' : ''
                    }`}
                    onClick={() => handlePlayTrack(track, index)}
                  >
                    {/* Track Thumbnail - Smaller */}
                    <div className="w-10 h-10 relative flex-shrink-0 rounded overflow-hidden">
                      <Image
                        src={track.image || album.coverArt}
                        alt={track.title}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>

                    {/* Track Info - Much more compact */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium truncate ${
                        isCurrentTrack ? 'text-blue-400' : 'text-gray-200'
                      }`}>
                        {track.title}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">{album.artist}</p>
                    </div>

                    {/* Track Number and Duration - Compact */}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="w-4 text-center">{track.trackNumber}</span>
                      <span className="w-8 text-right">{formatDuration(track.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* You Might Also Like Section - Compact */}
        <div className="container mx-auto px-4 max-w-2xl mt-4">
          <h2 className="text-base font-bold text-white mb-3">You Might Also Like</h2>
          {/* TODO: Add similar albums grid here */}
          <div className="text-gray-500 text-xs text-center py-4">
            Similar albums coming soon...
          </div>
        </div>

        {/* Add padding at bottom for now playing bar */}
        <div className="h-24" />
      </div>
    </div>
  );
}