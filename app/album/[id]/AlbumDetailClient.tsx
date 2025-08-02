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

      {/* Album Info Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-8 border border-white/10 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Album Cover */}
          <div className="md:col-span-1">
            <div className="aspect-square relative overflow-hidden rounded-xl border border-white/10 shadow-2xl">
              <Image
                src={album.coverArt}
                alt={album.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
          </div>

          {/* Album Details */}
          <div className="md:col-span-2 flex flex-col justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{album.title}</h1>
              <p className="text-xl text-gray-400 mb-4">{album.artist}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                <span>{getReleaseYear()}</span>
                <span>•</span>
                <span>{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</span>
              </div>

              {album.description && (
                <p className="text-gray-300 mb-6 max-w-2xl">{album.description}</p>
              )}
            </div>

            {/* Play Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayAlbum}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600/80 hover:bg-blue-600 backdrop-blur-sm rounded-full transition-colors border border-blue-500/30"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span className="font-medium">Play Album</span>
              </button>

              <button
                onClick={() => {/* TODO: Implement shuffle */}}
                className="p-3 bg-black/30 border border-white/20 hover:border-white/40 hover:bg-black/50 backdrop-blur-sm rounded-full transition-colors"
                title="Shuffle play"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Podroll and Funding Sections */}
        {(album.podroll && album.podroll.length > 0) || (album.funding && album.funding.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Podroll Section */}
            {album.podroll && album.podroll.length > 0 && (
              <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <h3 className="text-lg font-semibold text-white">Related Shows</h3>
                </div>
                <div className="space-y-3">
                  {album.podroll.map((podrollItem, index) => (
                    <div key={index} className="group">
                      <a
                        href={podrollItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-black/20 hover:bg-black/40 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                              {podrollItem.title || 'Related Show'}
                            </h4>
                            {podrollItem.description && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                {podrollItem.description}
                              </p>
                            )}
                          </div>
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-300 transition-colors ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Funding Section */}
            {album.funding && album.funding.length > 0 && (
              <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <h3 className="text-lg font-semibold text-white">Support</h3>
                </div>
                <div className="space-y-3">
                  {album.funding.map((fundingItem, index) => (
                    <div key={index} className="group">
                      <a
                        href={fundingItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-black/20 hover:bg-black/40 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white group-hover:text-green-300 transition-colors">
                              {fundingItem.message || 'Support this Artist'}
                            </h4>
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {fundingItem.url}
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-green-300 transition-colors ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Track List */}
        <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold">Tracks</h2>
          </div>
          
          <div className="divide-y divide-white/5">
            {album.tracks.map((track, index) => {
              const isCurrentTrack = currentTrack?.url === track.url;
              const isCurrentlyPlaying = isTrackPlaying(track);
              
              return (
                <div
                  key={track.trackNumber}
                  className={`flex items-center gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer group ${
                    isCurrentTrack ? 'bg-white/10' : ''
                  }`}
                  onClick={() => handlePlayTrack(track, index)}
                >
                  {/* Track Number / Play Button */}
                  <div className="w-10 text-center">
                    {isCurrentlyPlaying ? (
                      <div className="flex items-center justify-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                      </div>
                    ) : (
                      <span className="text-gray-500 group-hover:hidden">{track.trackNumber}</span>
                    )}
                    <button className="hidden group-hover:block p-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>

                  {/* Track Title */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium truncate ${
                      isCurrentTrack ? 'text-blue-400' : 'text-white'
                    }`}>
                      {track.title}
                    </h3>
                  </div>

                  {/* Duration */}
                  <div className="text-sm text-gray-500">
                    {formatDuration(track.duration)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add padding at bottom for now playing bar */}
      <div className="h-24" />
      </div>
    </div>
  );
}