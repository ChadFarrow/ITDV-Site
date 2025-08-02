'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import AlbumSkeleton from '@/components/AlbumSkeleton';
import { getVersionString } from '@/lib/version';
import { useAudio } from '@/contexts/AudioContext';

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

type FilterType = 'all' | 'albums' | 'eps' | 'singles';
type ViewMode = 'grid' | 'list';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [filteredAlbums, setFilteredAlbums] = useState<Album[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  const { playAlbum, playTrack } = useAudio();

  useEffect(() => {
    setIsClient(true);
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/albums');
      if (response.ok) {
        const data = await response.json();
        const sortedAlbums = sortAlbums(data.albums || []);
        setAlbums(sortedAlbums);
        setError(null);
      } else {
        setError('Failed to load albums');
      }
    } catch (err) {
      setError('Failed to load albums');
      console.error('Error loading albums:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sortAlbums = (albumList: Album[]) => {
    // Sort by release date (newest first), then by title
    return albumList.sort((a, b) => {
      const dateA = new Date(a.releaseDate).getTime();
      const dateB = new Date(b.releaseDate).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return a.title.localeCompare(b.title);
    });
  };

  const getAlbumType = (trackCount: number): FilterType => {
    if (trackCount === 1) return 'singles';
    if (trackCount >= 2 && trackCount <= 6) return 'eps';
    return 'albums';
  };

  const getFilteredAlbums = () => {
    if (activeFilter === 'all') return albums;
    return albums.filter(album => getAlbumType(album.tracks.length) === activeFilter);
  };

  const getFilterCounts = () => {
    const counts = {
      all: albums.length,
      albums: albums.filter(album => album.tracks.length >= 7).length,
      eps: albums.filter(album => album.tracks.length >= 2 && album.tracks.length <= 6).length,
      singles: albums.filter(album => album.tracks.length === 1).length,
    };
    return counts;
  };

  const getReleaseYear = (releaseDate: string) => {
    try {
      return new Date(releaseDate).getFullYear();
    } catch {
      return '';
    }
  };

  // Update filtered albums when albums or filter changes
  useEffect(() => {
    setFilteredAlbums(getFilteredAlbums());
  }, [albums, activeFilter]);

  const handlePlayAlbum = (album: Album, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Convert album tracks to audio context format
    const audioTracks = album.tracks.map(track => ({
      ...track,
      artist: album.artist,
      album: album.title,
      image: track.image || album.coverArt
    }));
    
    playAlbum(audioTracks, 0, album.title);
  };

  const getAlbumUrl = (album: Album) => {
    // Create URL-friendly slug from album title
    const slug = album.title.toLowerCase().replace(/\s+/g, '-');
    return `/album/${encodeURIComponent(slug)}`;
  };

  const handlePlayTrack = (track: Track, album: Album) => {
    const audioTrack = {
      ...track,
      artist: album.artist,
      album: album.title,
      image: track.image || album.coverArt
    };
    
    playTrack(audioTrack, album.title);
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Bloodshot Lies Album Art Background */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/bloodshot-lies-big.png"
          alt="Bloodshot Lies Album Art"
          fill
          className="object-cover w-full h-full"
          priority
        />
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Content overlay */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b backdrop-blur-sm bg-black/30 pt-6" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="container mx-auto px-6 py-2">
            {/* Mobile Header */}
            <div className="block sm:hidden mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                    aria-label="Toggle menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div className="w-10 h-10 relative border border-gray-700 rounded-lg overflow-hidden">
                    <Image 
                      src="/logo.webp" 
                      alt="Doerfelverse Logo" 
                      width={40} 
                      height={40}
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
                <Link 
                  href="/about" 
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span className="text-sm">About</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Link>
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold mb-1">Into the Doerfel-Verse</h1>
                <div className="text-xs bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-500/30">
                  Beta - Admin interface available at /admin/feeds
                </div>
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden sm:block mb-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute left-0 flex items-center gap-4">
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                    aria-label="Toggle menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div className="w-10 h-10 relative border border-gray-700 rounded-lg overflow-hidden">
                    <Image 
                      src="/logo.webp" 
                      alt="Doerfelverse Logo" 
                      width={40} 
                      height={40}
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
                <div className="text-center">
                  <h1 className="text-3xl font-bold mb-1">Into the Doerfel-Verse</h1>
                  <div className="text-xs bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-500/30 inline-block">
                    Beta - Admin interface available at /admin/feeds
                  </div>
                </div>
                <div className="absolute right-0">
                  <Link 
                    href="/about" 
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline">About this site</span>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Status */}
            {isClient && (
              <div className="flex items-center gap-2 text-sm">
                {error ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    <span className="text-red-400">{error}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    <span className="text-green-400">Site ready - admin features available</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        
        {/* Sidebar */}
        <div className={`fixed top-0 left-0 h-full w-80 bg-gray-900/95 backdrop-blur-sm transform transition-transform duration-300 z-30 border-r border-gray-700 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 pt-16 flex flex-col h-full">
            <h2 className="text-lg font-bold mb-4">Menu</h2>
            
            <div className="mb-4 space-y-1">
              <Link 
                href="/about" 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">About & Support</span>
              </Link>
              
              <Link 
                href="/admin/feeds" 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm">Admin Panel</span>
              </Link>
            </div>
            
            <div className="mt-auto pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Version</span>
                <span className="text-xs text-gray-400 font-mono">{getVersionString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Main Content */}
        <div className="container mx-auto px-3 sm:px-6 py-6 sm:py-8 pb-28">
          {isLoading ? (
            <div className="max-w-7xl mx-auto">
              {/* Filter skeleton */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="h-8 bg-gray-600 rounded-lg w-20"></div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-gray-600 rounded-lg"></div>
                  <div className="h-8 w-8 bg-gray-600 rounded-lg"></div>
                </div>
              </div>
              
              {/* Album skeleton */}
              <AlbumSkeleton count={12} viewMode={viewMode} />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4 text-red-400">Error Loading Albums</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <div className="max-w-md mx-auto">
                <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
                  <p className="text-yellow-200 text-sm">
                    No RSS feeds configured yet. Use the admin panel to add music feeds.
                  </p>
                </div>
                <Link 
                  href="/admin/feeds"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Go to Admin Panel
                </Link>
              </div>
            </div>
          ) : albums.length === 0 ? (
            <div className="max-w-7xl mx-auto text-center py-12">
              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-8 border border-white/10">
                <h2 className="text-2xl font-bold mb-4">No Albums Yet</h2>
                <p className="text-gray-300 mb-6">Add RSS feeds to display music here.</p>
                <Link 
                  href="/admin/feeds"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600/80 hover:bg-blue-600 backdrop-blur-sm rounded-lg transition-colors border border-blue-500/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Your First RSS Feed
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              {/* Album Section Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Albums</h2>
              </div>

              {/* Large Album Cards - Horizontal Layout like Original FUCKIT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAlbums.map((album, index) => (
                  <Link 
                    key={album.feedId || index}
                    href={getAlbumUrl(album)}
                    className="group block"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg border border-white/10 group-hover:border-white/30 transition-all duration-200">
                      <Image
                        src={album.coverArt}
                        alt={album.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      />
                      
                      {/* Track count overlay */}
                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
                        <span className="text-xs text-white font-medium">
                          {album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {/* Play button overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <button
                          className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors pointer-events-auto"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePlayAlbum(album, e);
                          }}
                        >
                          <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </button>
                      </div>
                      
                      {/* Title overlay at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                        <h3 className="text-lg font-bold text-white mb-1">{album.title}</h3>
                        <p className="text-sm text-gray-300">{album.artist}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* Album count info */}
              <div className="mt-8 text-center">
                <p className="text-gray-400 text-sm">
                  Showing {filteredAlbums.length} of {albums.length} release{albums.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}