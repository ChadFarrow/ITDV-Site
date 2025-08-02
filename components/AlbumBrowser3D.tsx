'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Play, Pause, Maximize, Minimize, X } from 'lucide-react';

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
}

interface AlbumBrowser3DProps {
  albums: Album[];
  onPlay: (album: Album, e: React.MouseEvent | React.TouchEvent) => void;
  onExitFullscreen?: () => void;
}

export default function AlbumBrowser3D({ albums, onPlay, onExitFullscreen }: AlbumBrowser3DProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (albums.length > 0) {
      setSelectedAlbum(albums[currentIndex]);
    }
  }, [albums, currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : albums.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < albums.length - 1 ? prev + 1 : 0));
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      // Enter fullscreen
      try {
        if (containerRef.current) {
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          } else if ((containerRef.current as any).webkitRequestFullscreen) {
            await (containerRef.current as any).webkitRequestFullscreen();
          } else if ((containerRef.current as any).msRequestFullscreen) {
            await (containerRef.current as any).msRequestFullscreen();
          }
          setIsFullscreen(true);
        }
      } catch (error) {
        console.error('Error entering fullscreen:', error);
      }
    } else {
      // Exit fullscreen
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        setIsFullscreen(false);
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
      }
    }
  };

  const handleKeyboard = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    } else if (e.key === 'Escape' && isFullscreen) {
      toggleFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  if (!albums.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">No albums to display</p>
      </div>
    );
  }

  const getVisibleAlbums = () => {
    const visible = [];
    const totalVisible = 5; // Show 5 albums at once
    const halfVisible = Math.floor(totalVisible / 2);
    
    for (let i = -halfVisible; i <= halfVisible; i++) {
      let index = currentIndex + i;
      if (index < 0) index = albums.length + index;
      if (index >= albums.length) index = index - albums.length;
      
      visible.push({
        album: albums[index],
        position: i,
        index
      });
    }
    
    return visible;
  };

  const visibleAlbums = getVisibleAlbums();

  return (
    <div 
      ref={containerRef}
      className={`w-full text-white overflow-hidden ${
        isFullscreen ? 'h-screen bg-black fixed inset-0 z-50' : 'h-screen bg-black'
      }`}
    >
      {/* 3D Album Browser */}
      <div className="relative h-2/3 flex items-center justify-center" style={{ perspective: '1000px' }}>
        <div className="relative w-full max-w-4xl h-80 flex items-center justify-center">
          {visibleAlbums.map(({ album, position, index }) => {
            const isCenter = position === 0;
            const translateX = position * 150; // Spacing between albums
            const translateZ = isCenter ? 0 : -100; // Depth
            const rotateY = position * 15; // Rotation angle
            const scale = isCenter ? 1 : 0.8; // Scale down side albums
            const opacity = Math.abs(position) > 2 ? 0 : 1 - Math.abs(position) * 0.2;

            return (
              <div
                key={`${album.feedId}-${index}`}
                className="absolute transition-all duration-500 ease-out cursor-pointer"
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity: opacity,
                  zIndex: isCenter ? 10 : 5 - Math.abs(position)
                }}
                onClick={() => setCurrentIndex(index)}
              >
                <div className="w-64 h-64 relative group">
                  {/* Album Cover */}
                  <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl">
                    <Image
                      src={album.coverArt}
                      alt={album.title}
                      fill
                      className="object-cover"
                      sizes="256px"
                    />
                    
                    {/* Overlay with play button */}
                    {isCenter && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlay(album, e);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20 backdrop-blur-sm rounded-full p-4 hover:bg-white/30"
                        >
                          <Play className="w-8 h-8 text-white fill-white" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Album Info (only for center album) */}
                  {isCenter && (
                    <div className="absolute -bottom-16 left-0 right-0 text-center">
                      <h3 className="text-lg font-bold text-white mb-1 truncate">{album.title}</h3>
                      <p className="text-sm text-gray-300 truncate">{album.artist}</p>
                      <p className="text-xs text-gray-400">{new Date(album.releaseDate).getFullYear()}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Controls */}
        <button
          onClick={handlePrevious}
          className="absolute left-8 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-sm rounded-full p-3 hover:bg-white/20 transition-colors z-20"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={handleNext}
          className="absolute right-8 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-sm rounded-full p-3 hover:bg-white/20 transition-colors z-20"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Fullscreen Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
          <button
            onClick={toggleFullscreen}
            className="bg-white/10 backdrop-blur-sm rounded-full p-3 hover:bg-white/20 transition-colors"
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen (F)'}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </button>
          
          {isFullscreen && onExitFullscreen && (
            <button
              onClick={() => {
                toggleFullscreen();
                onExitFullscreen();
              }}
              className="bg-white/10 backdrop-blur-sm rounded-full p-3 hover:bg-white/20 transition-colors"
              title="Exit to grid view"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Track Listing */}
      {selectedAlbum && (
        <div className="h-1/3 px-8 py-4 bg-gray-900/50">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedAlbum.title}</h2>
                <p className="text-gray-300">{selectedAlbum.artist}</p>
              </div>
              <div className="text-right text-sm text-gray-400">
                <p>{selectedAlbum.tracks.length} tracks</p>
                <p>{new Date(selectedAlbum.releaseDate).getFullYear()}</p>
              </div>
            </div>
            
            {/* Track List Table */}
            <div className="bg-black/30 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-400 border-b border-gray-700">
                <div className="col-span-1">✓</div>
                <div className="col-span-4">Name</div>
                <div className="col-span-2">Time</div>
                <div className="col-span-2">Artist</div>
                <div className="col-span-2">Album</div>
                <div className="col-span-1">Plays</div>
              </div>
              
              <div className="max-h-40 overflow-y-auto">
                {selectedAlbum.tracks.map((track, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-4 px-4 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={(e) => onPlay(selectedAlbum, e)}
                  >
                    <div className="col-span-1 text-gray-500">✓</div>
                    <div className="col-span-4 truncate">{track.title}</div>
                    <div className="col-span-2 text-gray-400">{track.duration}</div>
                    <div className="col-span-2 text-gray-400 truncate">{selectedAlbum.artist}</div>
                    <div className="col-span-2 text-gray-400 truncate">{selectedAlbum.title}</div>
                    <div className="col-span-1 text-gray-400">-</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Album Counter and Help */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <div className="text-sm text-gray-400 mb-2">
          {currentIndex + 1} of {albums.length}
        </div>
        <div className="text-xs text-gray-500">
          Use ← → arrows to navigate • Press F for fullscreen • ESC to exit
        </div>
      </div>
    </div>
  );
}