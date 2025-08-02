'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getVersionString } from '@/lib/version';
import { useAudio } from '@/contexts/AudioContext';
import { toast } from '@/components/Toast';
import dynamic from 'next/dynamic';

// Dynamic imports for heavy components
const AlbumCard = dynamic(() => import('@/components/AlbumCardLazy'), {
  loading: () => (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 animate-pulse">
      <div className="aspect-square bg-gray-800/50 rounded-lg mb-3"></div>
      <div className="h-4 bg-gray-700/50 rounded mb-2"></div>
      <div className="h-3 bg-gray-700/50 rounded w-2/3"></div>
    </div>
  ),
  ssr: true
});

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

// Import types from the ControlsBar component
import type { FilterType, ViewType, SortType } from '@/components/ControlsBar';

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


export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [totalFeedsCount, setTotalFeedsCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Progressive loading states
  const [criticalAlbums, setCriticalAlbums] = useState<Album[]>([]);
  const [enhancedAlbums, setEnhancedAlbums] = useState<Album[]>([]);
  const [isCriticalLoaded, setIsCriticalLoaded] = useState(false);
  const [isEnhancedLoaded, setIsEnhancedLoaded] = useState(false);
  
  // Global audio context
  const { playAlbum: globalPlayAlbum, toggleShuffle } = useAudio();
  const hasLoadedRef = useRef(false);
  
  // Static background state
  const [backgroundImageLoaded, setBackgroundImageLoaded] = useState(false);

  // Controls state
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [sortType, setSortType] = useState<SortType>('name');

  // Shuffle functionality
  const handleShuffle = () => {
    try {
      console.log('🎲 Shuffle button clicked - toggling shuffle mode');
      toggleShuffle();
      toast.success('🎲 Shuffle toggled!');
    } catch (error) {
      console.error('Error toggling shuffle:', error);
      toast.error('Error toggling shuffle');
    }
  };

  useEffect(() => {
    setIsClient(true);
    
    // Add scroll detection for mobile
    let scrollTimer: NodeJS.Timeout;
    const handleScroll = () => {
      document.body.classList.add('is-scrolling');
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        document.body.classList.remove('is-scrolling');
      }, 150);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      clearTimeout(scrollTimer);
    };
  }, []);

  useEffect(() => {
    // Prevent multiple loads
    if (hasLoadedRef.current) {
      return;
    }
    
    hasLoadedRef.current = true;
    
    // Clear cache to force fresh data load
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cachedAlbums');
      localStorage.removeItem('albumsCacheTimestamp');
    }
    
    // Progressive loading: Load critical data first, then enhance
    loadCriticalAlbums();
  }, []); // Run only once on mount

  // Static background loading
  useEffect(() => {
    // Set a small delay to ensure the background image has time to load
    const timer = setTimeout(() => {
      setBackgroundImageLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Progressive loading: Load critical albums first (core feeds only)
  const loadCriticalAlbums = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setLoadingProgress(0);
      
      // Load critical albums first (core feeds)
      const criticalAlbums = await loadAlbumsData('core');
      setCriticalAlbums(criticalAlbums);
      setIsCriticalLoaded(true);
      setLoadingProgress(30);
      
      // Start loading enhanced data in background
      loadEnhancedAlbums();
      
    } catch (error) {
      setError('Failed to load critical albums');
      setIsLoading(false);
    }
  };

  // Progressive loading: Load enhanced albums (all feeds)
  const loadEnhancedAlbums = async () => {
    try {
      // Load all albums in background
      const allAlbums = await loadAlbumsData('all');
      setEnhancedAlbums(allAlbums);
      setAlbums(allAlbums); // Set main albums state
      setIsEnhancedLoaded(true);
      setLoadingProgress(100);
      setIsLoading(false);
      
    } catch (error) {
      console.warn('Failed to load enhanced albums, using critical albums only');
      setAlbums(criticalAlbums); // Fallback to critical albums
      setIsLoading(false);
    }
  };

  const loadAlbumsData = async (loadTier: 'core' | 'extended' | 'lowPriority' | 'all' = 'all') => {
    try {
      // Try fast static endpoint first
      let response = await fetch('/api/albums-static');
      let data;
      
      if (response.ok) {
        data = await response.json();
        console.log('📦 Using static album data');
      } else {
        // Fallback to slow RSS parsing endpoint
        console.log('🔄 Static data failed, falling back to RSS parsing...');
        response = await fetch('/api/albums');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch albums: ${response.status} ${response.statusText}`);
        }
        
        data = await response.json();
      }
      
      const albums = data.albums || [];
      
      setLoadingProgress(75);
      
      // Deduplicate albums
      const albumMap = new Map<string, Album>();
      
      albums.forEach((album: Album) => {
        const key = `${album.title.toLowerCase()}|${album.artist.toLowerCase()}`;
        if (!albumMap.has(key)) {
          albumMap.set(key, album);
        }
      });
      
      const uniqueAlbums = Array.from(albumMap.values());
      
      // Cache the results
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cachedAlbums', JSON.stringify(uniqueAlbums));
          localStorage.setItem('albumsCacheTimestamp', Date.now().toString());
        } catch (error) {
          console.warn('⚠️ Failed to cache albums:', error);
        }
      }
      
      return uniqueAlbums;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error loading album data: ${errorMessage}`);
      toast.error(`Failed to load albums: ${errorMessage}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const playAlbum = async (album: Album, e: React.MouseEvent | React.TouchEvent) => {
    // Only prevent default/propagation for the play button, not the entire card
    e.stopPropagation();
    
    // Find the first playable track
    const firstTrack = album.tracks.find(track => track.url);
    
    if (!firstTrack || !firstTrack.url) {
      console.warn('Cannot play album: missing track');
      setError('No playable tracks found in this album');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      console.log('🎵 Attempting to play:', album.title, 'Track URL:', firstTrack.url);
      
      // Use global audio context to play album
      const audioTracks = album.tracks.map(track => ({
        ...track,
        artist: album.artist,
        album: album.title,
        image: track.image || album.coverArt
      }));
      
      globalPlayAlbum(audioTracks, 0, album.title);
      console.log('✅ Successfully started playback');
    } catch (error) {
      let errorMessage = 'Unable to play audio - please try again';
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'Tap the play button again to start playback';
            break;
          case 'NotSupportedError':
            errorMessage = 'Audio format not supported on this device';
            break;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      
      setTimeout(() => setError(null), 5000);
    }
  };

  // Helper functions for filtering and sorting
  const getFilteredAlbums = () => {
    // Use progressive loading: show critical albums first, then enhanced
    const albumsToUse = isEnhancedLoaded ? enhancedAlbums : (criticalAlbums.length > 0 ? criticalAlbums : albums);
    
    // Universal sorting function that implements hierarchical order: Albums → EPs → Singles
    const sortWithHierarchy = (albums: Album[]) => {
      return albums.sort((a, b) => {
        // Hierarchical sorting: Albums (7+ tracks) → EPs (2-6 tracks) → Singles (1 track)
        const aIsAlbum = a.tracks.length > 6;
        const bIsAlbum = b.tracks.length > 6;
        const aIsEP = a.tracks.length > 1 && a.tracks.length <= 6;
        const bIsEP = b.tracks.length > 1 && b.tracks.length <= 6;
        const aIsSingle = a.tracks.length === 1;
        const bIsSingle = b.tracks.length === 1;
        
        // Albums come first
        if (aIsAlbum && !bIsAlbum) return -1;
        if (!aIsAlbum && bIsAlbum) return 1;
        
        // EPs come second (if both are not albums)
        if (aIsEP && !bIsEP) return -1;
        if (!aIsEP && bIsEP) return 1;
        
        // Singles come last (if both are not albums or EPs)
        if (aIsSingle && !bIsSingle) return -1;
        if (!aIsSingle && bIsSingle) return 1;
        
        // If same type, sort by title
        return a.title.localeCompare(b.title);
      });
    };
    
    // Apply filtering based on active filter
    let filtered = albumsToUse;
    
    switch (activeFilter) {
      case 'albums':
        filtered = albumsToUse.filter(album => album.tracks.length > 6);
        break;
      case 'eps':
        filtered = albumsToUse.filter(album => album.tracks.length > 1 && album.tracks.length <= 6);
        break;
      case 'singles':
        filtered = albumsToUse.filter(album => album.tracks.length === 1);
        break;
      default: // 'all'
        filtered = albumsToUse;
    }

    // Apply hierarchical sorting to filtered results
    return sortWithHierarchy(filtered);
  };

  const filteredAlbums = getFilteredAlbums();
  
  // Show loading state for progressive loading
  const showProgressiveLoading = isCriticalLoaded && !isEnhancedLoaded && filteredAlbums.length > 0;


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
            
            {/* Loading/Error Status */}
            {isClient && (
              <div className="flex items-center gap-2 text-sm">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                    <span className="text-yellow-400">
                      {isCriticalLoaded ? 'Loading more albums...' : 'Loading albums...'}
                      {loadingProgress > 0 && ` (${Math.round(loadingProgress)}%)`}
                    </span>
                  </div>
                ) : showProgressiveLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                    <span className="text-blue-400">
                      Loading more albums... ({filteredAlbums.length} loaded)
                    </span>
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    <span className="text-red-400">{error}</span>
                  </div>
                ) : null}
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
          {isLoading && !isCriticalLoaded ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <LoadingSpinner 
                size="large"
                text="Loading music feeds..."
                showProgress={false}
              />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4 text-red-400">Error Loading Albums</h2>
              <p className="text-gray-400">{error}</p>
              <button 
                onClick={() => loadCriticalAlbums()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : filteredAlbums.length > 0 ? (
            <div className="max-w-7xl mx-auto">
              {/* Controls Bar */}
              <ControlsBar
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                sortType={sortType}
                onSortChange={setSortType}
                viewType={viewType}
                onViewChange={setViewType}
                showShuffle={true}
                onShuffle={handleShuffle}
                resultCount={filteredAlbums.length}
                resultLabel={activeFilter === 'all' ? 'Releases' : 
                  activeFilter === 'albums' ? 'Albums' :
                  activeFilter === 'eps' ? 'EPs' : 
                  activeFilter === 'singles' ? 'Singles' : 'Releases'}
                className="mb-8"
              />

              {/* Progressive Loading Indicator */}
              {showProgressiveLoading && (
                <div className="mb-6 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-blue-300 text-sm">
                      Loading more albums in the background... ({filteredAlbums.length} loaded so far)
                    </span>
                  </div>
                </div>
              )}

              {/* Albums Display */}
              {activeFilter === 'all' ? (
                // Original sectioned layout for "All" filter
                <>
                  {/* Albums Grid */}
                  {(() => {
                    const albumsWithMultipleTracks = filteredAlbums.filter(album => album.tracks.length > 6);
                    return albumsWithMultipleTracks.length > 0 && (
                      <div className="mb-12">
                        <h2 className="text-2xl font-bold mb-6">Albums</h2>
                        {viewType === 'grid' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                            {albumsWithMultipleTracks.map((album, index) => (
                              <AlbumCard
                                key={`album-${index}`}
                                album={album}
                                onPlay={playAlbum}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {albumsWithMultipleTracks.map((album, index) => (
                              <Link
                                key={`album-${index}`}
                                href={`/album/${encodeURIComponent(album.title.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, ''))}`}
                                className="group flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10 transition-all duration-200 border border-white/10 hover:border-white/20"
                              >
                                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                  <Image 
                                    src={album.coverArt} 
                                    alt={album.title}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-lg group-hover:text-blue-400 transition-colors truncate">
                                    {album.title}
                                  </h3>
                                  <p className="text-gray-400 text-sm truncate">{album.artist}</p>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                  <span>{new Date(album.releaseDate).getFullYear()}</span>
                                  <span>{album.tracks.length} tracks</span>
                                  <span className="px-2 py-1 bg-white/10 rounded text-xs">Album</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  
                  {/* EPs and Singles Grid */}
                  {(() => {
                    const epsAndSingles = filteredAlbums.filter(album => album.tracks.length <= 6);
                    return epsAndSingles.length > 0 && (
                      <div>
                        <h2 className="text-2xl font-bold mb-6">EPs and Singles</h2>
                        {viewType === 'grid' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                            {epsAndSingles.map((album, index) => (
                              <AlbumCard
                                key={`ep-single-${index}`}
                                album={album}
                                onPlay={playAlbum}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {epsAndSingles.map((album, index) => (
                              <Link
                                key={`ep-single-${index}`}
                                href={`/album/${encodeURIComponent(album.title.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, ''))}`}
                                className="group flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10 transition-all duration-200 border border-white/10 hover:border-white/20"
                              >
                                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                  <Image 
                                    src={album.coverArt} 
                                    alt={album.title}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-lg group-hover:text-blue-400 transition-colors truncate">
                                    {album.title}
                                  </h3>
                                  <p className="text-gray-400 text-sm truncate">{album.artist}</p>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                  <span>{new Date(album.releaseDate).getFullYear()}</span>
                                  <span>{album.tracks.length} tracks</span>
                                  <span className="px-2 py-1 bg-white/10 rounded text-xs">
                                    {album.tracks.length === 1 ? 'Single' : 'EP'}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              ) : (
                // Unified layout for specific filters (Albums, EPs, Singles)
                viewType === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                    {filteredAlbums.map((album, index) => (
                      <AlbumCard
                        key={`${album.title}-${index}`}
                        album={album}
                        onPlay={playAlbum}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAlbums.map((album, index) => (
                      <Link
                        key={`${album.title}-${index}`}
                        href={`/album/${encodeURIComponent(album.title.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, ''))}`}
                        className="group flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10 transition-all duration-200 border border-white/10 hover:border-white/20"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <Image 
                            src={album.coverArt} 
                            alt={album.title}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg group-hover:text-blue-400 transition-colors truncate">
                            {album.title}
                          </h3>
                          <p className="text-gray-400 text-sm truncate">{album.artist}</p>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>{new Date(album.releaseDate).getFullYear()}</span>
                          <span>{album.tracks.length} tracks</span>
                          <span className="px-2 py-1 bg-white/10 rounded text-xs">
                            {album.tracks.length <= 6 ? (album.tracks.length === 1 ? 'Single' : 'EP') : 'Album'}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4">No Albums Found</h2>
              <p className="text-gray-400">
                {isCriticalLoaded ? 'Unable to load additional album information.' : 'Unable to load any album information from the RSS feeds.'}
              </p>
              {isCriticalLoaded && (
                <button 
                  onClick={() => loadEnhancedAlbums()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Load More Albums
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}