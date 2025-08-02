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
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Album Art Background */}
      <div className="fixed inset-0 z-0">
        <Image
          src={album.coverArt}
          alt={`${album.title} background`}
          fill
          className="object-cover w-full h-full opacity-15"
          priority
        />
        <div className="absolute inset-0 bg-black/60"></div>
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

      {/* Album Info Section - Centered FUCKIT Style */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          {/* Album Cover - Centered and Larger */}
          <div className="inline-block mb-6">
            <div className="w-80 h-80 relative overflow-hidden rounded-lg border border-white/20 shadow-2xl mx-auto">
              <Image
                src={album.coverArt}
                alt={album.title}
                fill
                className="object-cover"
                priority
                sizes="320px"
              />
            </div>
          </div>

          {/* Album Details - Centered */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2 text-white">{album.title}</h1>
            <p className="text-xl text-gray-300 mb-4">{album.artist}</p>
            
            <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-6">
              <span>{getReleaseYear()}</span>
              <span>•</span>
              <span>{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</span>
            </div>

            {album.description && (
              <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 border border-white/10 max-w-2xl mx-auto mb-6">
                <p className="text-gray-300 text-sm leading-relaxed">{album.description}</p>
              </div>
            )}
          </div>

          {/* Play Controls - Centered */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={handlePlayAlbum}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors text-white font-medium"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <span>Play Album</span>
            </button>

            <button
              onClick={() => {/* TODO: Implement shuffle */}}
              className="p-3 bg-black/40 border border-white/20 hover:border-white/40 hover:bg-black/60 rounded-full transition-colors"
              title="Shuffle play"
            >
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

        {/* Podroll and Funding Sections - More Compact */}
        {(album.podroll && album.podroll.length > 0) || (album.funding && album.funding.length > 0) ? (
          <div className="container mx-auto px-4 max-w-4xl mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Podroll Section - Compact */}
            {album.podroll && album.podroll.length > 0 && (
              <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <h3 className="text-sm font-semibold text-white">Related Shows</h3>
                </div>
                <div className="space-y-2">
                  {album.podroll.map((podrollItem, index) => (
                    <a
                      key={index}
                      href={podrollItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 bg-black/30 hover:bg-black/50 rounded border border-white/10 hover:border-blue-400/30 transition-all text-xs group"
                    >
                      <div className="text-blue-300 group-hover:text-blue-200 font-medium truncate">
                        {podrollItem.title || 'Related Show'}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Funding Section - Compact */}
            {album.funding && album.funding.length > 0 && (
              <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <h3 className="text-sm font-semibold text-white">Support</h3>
                </div>
                <div className="space-y-2">
                  {album.funding.map((fundingItem, index) => (
                    <a
                      key={index}
                      href={fundingItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2 bg-black/30 hover:bg-black/50 rounded border border-white/10 hover:border-green-400/30 transition-all text-xs group"
                    >
                      <div className="text-green-300 group-hover:text-green-200 font-medium">
                        {fundingItem.message || 'Support this Artist'}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        ) : null}

        {/* Track List - FUCKIT Style */}
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-center text-white">Tracks</h2>
            </div>
            
            <div className="p-2">
              {album.tracks.map((track, index) => {
                const isCurrentTrack = currentTrack?.url === track.url;
                const isCurrentlyPlaying = isTrackPlaying(track);
                
                return (
                  <div
                    key={track.trackNumber}
                    className={`flex items-center gap-3 p-3 m-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group ${
                      isCurrentTrack ? 'bg-white/15' : 'bg-black/20'
                    }`}
                    onClick={() => handlePlayTrack(track, index)}
                  >
                    {/* Track Number / Play Button */}
                    <div className="w-8 text-center flex-shrink-0">
                      {isCurrentlyPlaying ? (
                        <div className="flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm group-hover:hidden">{track.trackNumber}</span>
                      )}
                      <button className="hidden group-hover:block p-1">
                        <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </button>
                    </div>

                    {/* Track Title */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium truncate ${
                        isCurrentTrack ? 'text-blue-300' : 'text-gray-200'
                      }`}>
                        {track.title}
                      </h3>
                    </div>

                    {/* Duration */}
                    <div className="text-xs text-gray-500 flex-shrink-0">
                      {formatDuration(track.duration)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add padding at bottom for now playing bar */}
      <div className="h-24" />
      </div>
    </div>
  );
}