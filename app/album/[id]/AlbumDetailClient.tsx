'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import dynamic from 'next/dynamic';

// Dynamic import for ControlsBar
const ControlsBar = dynamic(() => import('@/components/ControlsBar'), {
  loading: () => (
    <div className="mb-8 p-4 bg-gray-800/20 rounded-lg animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-8 bg-gray-700/50 rounded w-24"></div>
        <div className="h-8 bg-gray-700/50 rounded w-20"></div>
        <div className="h-8 bg-gray-700/50 rounded w-16"></div>
        <div className="h-8 bg-gray-700/50 rounded w-20"></div>
      </div>
    </div>
  ),
  ssr: true
});

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
  const [album, setAlbum] = useState<Album | null>(initialAlbum);
  const [isLoading, setIsLoading] = useState(!initialAlbum);
  const [error, setError] = useState<string | null>(null);
  const [relatedAlbums, setRelatedAlbums] = useState<Album[]>([]);
  
  // Global audio context
  const { 
    playAlbum: globalPlayAlbum, 
    currentTrack,
    isPlaying: globalIsPlaying,
    pause: globalPause,
    resume: globalResume,
    toggleShuffle
  } = useAudio();
  
  // Background state
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const preloadAttemptedRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
    
    const checkDevice = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Load album data if not provided
  useEffect(() => {
    if (!initialAlbum) {
      loadAlbum();
    } else {
      // Preload background image for desktop
      if (isDesktop && !preloadAttemptedRef.current) {
        preloadAttemptedRef.current = true;
        preloadBackgroundImage(initialAlbum);
      }
      loadRelatedAlbums();
    }
  }, [albumTitle, initialAlbum, isDesktop]);

  const preloadBackgroundImage = async (albumData: Album) => {
    if (!albumData.coverArt) return;
    
    try {
      console.log('🎨 Preloading background image for desktop:', albumData.coverArt);
      
      const img = new window.Image();
      img.onload = () => {
        console.log('✅ Background image preloaded successfully');
        setBackgroundImage(albumData.coverArt);
        setBackgroundLoaded(true);
      };
      img.onerror = () => {
        console.error('❌ Background image preload failed');
        setBackgroundImage(null);
        setBackgroundLoaded(true);
      };
      
      img.decoding = 'async';
      img.src = albumData.coverArt;
    } catch (error) {
      console.error('❌ Error preloading background image:', error);
      setBackgroundImage(null);
      setBackgroundLoaded(true);
    }
  };

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
      const decodedTitle = decodeURIComponent(albumTitle);
      const createSlug = (title: string) => 
        title.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
      
      const foundAlbum = albums.find((a: Album) => 
        a.title.toLowerCase() === decodedTitle.toLowerCase() ||
        createSlug(a.title) === decodedTitle.toLowerCase()
      );

      if (foundAlbum) {
        setAlbum(foundAlbum);
        setError(null);
        
        if (isDesktop && !preloadAttemptedRef.current) {
          preloadAttemptedRef.current = true;
          preloadBackgroundImage(foundAlbum);
        }
        
        loadRelatedAlbums();
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

  const loadRelatedAlbums = async () => {
    try {
      const response = await fetch('/api/albums');
      if (response.ok) {
        const data = await response.json();
        const albums = data.albums || [];
        
        // Get random albums for "You might also like"
        const otherAlbums = albums.filter((a: Album) => a.title !== album?.title);
        const shuffled = otherAlbums.sort(() => 0.5 - Math.random());
        setRelatedAlbums(shuffled.slice(0, 4));
      }
    } catch (error) {
      console.error('Error loading related albums:', error);
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
    
    globalPlayAlbum(audioTracks, 0, album.title);
  };

  const handlePlayTrack = (track: Track, index: number) => {
    if (!album) return;
    
    const audioTracks = album.tracks.map(t => ({
      ...t,
      artist: album.artist,
      album: album.title,
      image: t.image || album.coverArt
    }));
    
    globalPlayAlbum(audioTracks, index, album.title);
  };

  const isTrackPlaying = (track: Track) => {
    return currentTrack?.url === track.url && globalIsPlaying;
  };

  const formatDuration = (duration: string): string => {
    if (!duration) return '0:00';
    if (duration.includes(':')) return duration;
    
    const seconds = parseInt(duration);
    if (!isNaN(seconds)) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
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

  const getAlbumSlug = (albumData: Album) => {
    return albumData.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
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
      {/* Dynamic Background with Bloodshot Lies fallback */}
      <div className="fixed inset-0 z-0">
        {/* Primary album background */}
        {backgroundImage && backgroundLoaded ? (
          <Image
            src={backgroundImage}
            alt={`${album.title} background`}
            fill
            className="object-cover w-full h-full"
            priority
          />
        ) : (
          /* Fallback to Bloodshot Lies background */
          <Image
            src="https://re.podtards.com/optimized/bloodshot-lies-the-album_500x500.webp"
            alt="Bloodshot Lies background"
            fill
            className="object-cover w-full h-full"
            priority
          />
        )}
        
        {/* Dynamic overlay based on album */}
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
                    Project StableKraft
                  </Link>
                  <span className="text-gray-600">/</span>
                  <span className="font-medium truncate max-w-[200px]">{album.title}</span>
                </div>
              </div>

              {/* Desktop Version Info */}
              <div className="hidden sm:block text-xs text-gray-400">
                {album.tracks.length} tracks • {getReleaseYear()}
              </div>
            </div>
          </div>
        </header>

        {/* Album Hero Section */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Album Artwork */}
              <div className="flex-shrink-0 mx-auto lg:mx-0">
                <div className="w-64 h-64 lg:w-80 lg:h-80 relative rounded-xl shadow-2xl overflow-hidden border border-white/20">
                  <Image
                    src={album.coverArt}
                    alt={album.title}
                    fill
                    className="object-cover"
                    priority
                    sizes="(min-width: 1024px) 320px, 256px"
                  />
                </div>
              </div>

              {/* Album Info */}
              <div className="flex-1 text-center lg:text-left">
                <div className="mb-6">
                  <h1 className="text-4xl lg:text-5xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {album.title}
                  </h1>
                  <p className="text-xl lg:text-2xl text-gray-300 mb-4">{album.artist}</p>
                  
                  <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-gray-400 mb-6">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      {getReleaseYear()}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      {album.tracks.length} tracks
                    </span>
                  </div>

                  {album.description && (
                    <div className="max-w-2xl mx-auto lg:mx-0 mb-6">
                      <p className="text-gray-300 leading-relaxed">{album.description}</p>
                    </div>
                  )}
                </div>

                {/* Play Controls */}
                <div className="flex items-center justify-center lg:justify-start gap-4 mb-8">
                  <button
                    onClick={handlePlayAlbum}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Play className="w-5 h-5" />
                    <span className="font-semibold">Play Album</span>
                  </button>
                  
                  <button
                    onClick={() => toggleShuffle()}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm border border-white/20"
                    title="Shuffle"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.83 13.41L13.42 14.82L16.55 17.95L14.5 20H20V14.5L17.96 16.54L14.83 13.41M14.5 4L16.54 6.04L4 18.59L5.41 20L17.96 7.46L20 9.5V4M10.59 9.17L5.41 4L4 5.41L9.17 10.58L10.59 9.17Z"/>
                    </svg>
                  </button>
                </div>

                {/* Funding Information - Support This Artist */}
                {album.funding && album.funding.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-3 text-white text-center lg:text-left">Support This Artist</h3>
                    <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                      {album.funding.map((funding, index) => (
                        <a
                          key={index}
                          href={funding.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all transform hover:scale-105 flex items-center gap-2"
                        >
                          💝 {funding.message || 'Support'}
                        </a>
                      ))}
                    </div>
                  </div>
                )}


              </div>
            </div>
          </div>
        </div>

        {/* Track List */}
        <div className="container mx-auto px-4 pb-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold">Tracks</h2>
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
                      {/* Track Number / Play Icon */}
                      <div className="w-8 flex items-center justify-center">
                        {isCurrentlyPlaying ? (
                          <div className="w-4 h-4 flex items-center justify-center">
                            <div className="w-1 h-3 bg-blue-400 animate-pulse mr-0.5"></div>
                            <div className="w-1 h-2 bg-blue-400 animate-pulse delay-75 mr-0.5"></div>
                            <div className="w-1 h-4 bg-blue-400 animate-pulse delay-150"></div>
                          </div>
                        ) : (
                          <span className={`text-sm font-medium ${isCurrentTrack ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'}`}>
                            {track.trackNumber}
                          </span>
                        )}
                      </div>

                      {/* Track Artwork */}
                      <div className="w-12 h-12 relative flex-shrink-0 rounded overflow-hidden">
                        <Image
                          src={track.image || album.coverArt}
                          alt={track.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium truncate ${
                          isCurrentTrack ? 'text-blue-400' : 'text-white'
                        }`}>
                          {track.title}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">{album.artist}</p>
                      </div>

                      {/* Duration */}
                      <div className="text-sm text-gray-400 font-mono">
                        {formatDuration(track.duration)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Related Albums */}
        {relatedAlbums.length > 0 && (
          <div className="container mx-auto px-4 pb-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">You Might Also Like</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedAlbums.map((relatedAlbum, index) => (
                  <Link
                    key={index}
                    href={`/album/${getAlbumSlug(relatedAlbum)}`}
                    className="group block"
                  >
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 hover:bg-white/10 transition-colors border border-white/10">
                      <div className="aspect-square mb-3 rounded overflow-hidden">
                        <Image
                          src={relatedAlbum.coverArt}
                          alt={relatedAlbum.title}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <h3 className="font-semibold text-sm mb-1 truncate group-hover:text-blue-400 transition-colors">
                        {relatedAlbum.title}
                      </h3>
                      <p className="text-xs text-gray-400 truncate">{relatedAlbum.artist}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Podroll Information - Related Shows */}
        {album?.podroll && album.podroll.length > 0 && (
          <div className="container mx-auto px-4 pb-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Related Shows</h2>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                {album.podroll.map((podrollItem, index) => (
                  <a
                    key={index}
                    href={podrollItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-full text-sm font-medium transition-all transform hover:scale-105 flex items-center gap-2"
                  >
                    🎙️ {podrollItem.title || `Feed ${podrollItem.url.substring(0, 8)}...`}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}


        {/* Bottom spacing for audio player */}
        <div className="h-24" />
      </div>
    </div>
  );
}