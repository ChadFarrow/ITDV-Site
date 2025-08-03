'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize, Minimize } from 'lucide-react';
import Image from 'next/image';

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

interface Album3DCoverflowProps {
  albums: Album[];
  onPlay: (album: Album, e: React.MouseEvent | React.TouchEvent) => void;
  currentTrack?: any;
  isPlaying?: boolean;
}

export default function Album3DCoverflow({ albums, onPlay, currentTrack, isPlaying }: Album3DCoverflowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    if (albums.length > 0) {
      setSelectedAlbum(albums[currentIndex]);
    }
  }, [albums, currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : albums.length - 1));
    setSelectedTrackIndex(0);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < albums.length - 1 ? prev + 1 : 0));
    setSelectedTrackIndex(0);
  };

  const handleAlbumClick = (index: number) => {
    if (index === currentIndex) {
      // If clicking on center album, do nothing or could trigger play
      return;
    }
    setCurrentIndex(index);
    setSelectedTrackIndex(0);
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      try {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } catch (error) {
        console.error('Error entering fullscreen:', error);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      } catch (error) {
        console.error('Error exiting fullscreen:', error);
      }
    }
  };

  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    } else if (e.key === ' ') {
      e.preventDefault();
      if (selectedAlbum) {
        onPlay(selectedAlbum, new MouseEvent('click') as any);
      }
    }
  }, [selectedAlbum]);

  // Mouse drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const offset = e.clientX - dragStartX;
    setDragOffset(offset);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Determine if we should switch albums based on drag distance
    const threshold = 100;
    if (dragOffset > threshold) {
      handlePrevious();
    } else if (dragOffset < -threshold) {
      handleNext();
    }
    setDragOffset(0);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getAlbumStyle = (index: number) => {
    const diff = index - currentIndex;
    const totalAlbums = albums.length;
    
    // Handle wrapping
    let adjustedDiff = diff;
    if (Math.abs(diff) > totalAlbums / 2) {
      if (diff > 0) {
        adjustedDiff = diff - totalAlbums;
      } else {
        adjustedDiff = diff + totalAlbums;
      }
    }

    // Add drag offset effect
    const dragEffect = isDragging ? dragOffset / 200 : 0;
    const position = adjustedDiff + dragEffect;
    
    const baseX = position * 180; // Spacing between albums
    const z = Math.abs(position) > 2 ? -400 : -Math.abs(position) * 150;
    const rotateY = Math.max(-60, Math.min(60, -position * 45));
    const scale = Math.abs(position) > 2 ? 0.6 : position === 0 ? 1.1 : 0.85;
    const opacity = Math.abs(position) > 2 ? 0 : position === 0 ? 1 : 0.7;

    return {
      transform: `translateX(${baseX}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex: 10 - Math.abs(Math.round(position)),
      transition: isDragging ? 'none' : 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: position === 0 ? 'default' : 'pointer',
    };
  };

  const getReflectionStyle = (index: number) => {
    const albumStyle = getAlbumStyle(index);
    return {
      ...albumStyle,
      transform: `${albumStyle.transform} scaleY(-1)`,
      opacity: (albumStyle.opacity as number) * 0.3,
    };
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

  if (!albums.length) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <p className="text-gray-400">No albums to display</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`w-full bg-black text-white overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'
      }`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Coverflow View */}
      <div 
        className="relative h-[60%] bg-gradient-to-b from-gray-900 to-black"
        style={{ perspective: '1200px', perspectiveOrigin: '50% 50%' }}
        onMouseDown={handleMouseDown}
      >
        {/* Album Container */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
            {albums.map((album, index) => {
              const style = getAlbumStyle(index);
              const reflectionStyle = getReflectionStyle(index);
              const isCenter = index === currentIndex;
              
              return (
                <div key={`${album.feedId}-${index}`}>
                  {/* Main Album */}
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={style}
                    onClick={() => handleAlbumClick(index)}
                  >
                    <div className={`relative ${isCenter ? 'w-72 h-72' : 'w-64 h-64'} rounded-lg overflow-hidden shadow-2xl`}>
                      <Image
                        src={album.coverArt}
                        alt={album.title}
                        fill
                        className="object-cover"
                        sizes={isCenter ? '288px' : '256px'}
                        priority={Math.abs(index - currentIndex) <= 2}
                      />
                      {isCenter && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                          <div className="text-white">
                            <h3 className="font-bold text-lg">{album.title}</h3>
                            <p className="text-sm opacity-90">{album.artist}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Reflection */}
                  <div
                    className="absolute left-1/2 top-[70%] -translate-x-1/2"
                    style={reflectionStyle}
                    aria-hidden="true"
                  >
                    <div className={`relative ${isCenter ? 'w-72 h-72' : 'w-64 h-64'} rounded-lg overflow-hidden`}>
                      <Image
                        src={album.coverArt}
                        alt=""
                        fill
                        className="object-cover"
                        sizes={isCenter ? '288px' : '256px'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black/80" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Controls */}
        <button
          onClick={handlePrevious}
          className="absolute left-8 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors z-20"
        >
          <SkipBack className="w-6 h-6" />
        </button>
        
        <button
          onClick={handleNext}
          className="absolute right-8 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors z-20"
        >
          <SkipForward className="w-6 h-6" />
        </button>

        {/* Current Album Info */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center z-20">
          <h2 className="text-2xl font-bold text-white mb-1">
            {selectedAlbum?.title || 'Untitled'}
          </h2>
          <p className="text-gray-300">
            {selectedAlbum?.artist || 'Unknown Artist'}
          </p>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors z-20"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
      </div>

      {/* Track List Table */}
      <div className="h-[40%] bg-gray-950 border-t border-gray-800 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Table Header */}
          <div className="px-6 py-2 border-b border-gray-800 bg-gray-900/50">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
              <div className="col-span-1"></div>
              <div className="col-span-1">Track</div>
              <div className="col-span-4">Name</div>
              <div className="col-span-2">Artist</div>
              <div className="col-span-2">Album</div>
              <div className="col-span-1">Time</div>
              <div className="col-span-1">Genre</div>
            </div>
          </div>

          {/* Track List */}
          <div className="flex-1 overflow-y-auto">
            {selectedAlbum?.tracks.map((track, index) => {
              const isCurrentTrack = currentTrack?.url === track.url;
              const isSelected = index === selectedTrackIndex;
              
              return (
                <div
                  key={`${track.trackNumber}-${index}`}
                  className={`
                    grid grid-cols-12 gap-4 px-6 py-2 text-sm hover:bg-gray-800/50 cursor-pointer transition-colors
                    ${isCurrentTrack ? 'bg-blue-900/20 text-blue-400' : 'text-gray-300'}
                    ${isSelected ? 'bg-gray-800/30' : ''}
                  `}
                  onClick={(e) => {
                    setSelectedTrackIndex(index);
                    if (selectedAlbum) {
                      onPlay(selectedAlbum, e);
                    }
                  }}
                  onDoubleClick={(e) => {
                    if (selectedAlbum) {
                      onPlay(selectedAlbum, e);
                    }
                  }}
                >
                  <div className="col-span-1 flex items-center justify-center">
                    {isCurrentTrack && isPlaying ? (
                      <div className="flex items-center gap-0.5">
                        <div className="w-1 h-3 bg-blue-400 animate-pulse"></div>
                        <div className="w-1 h-2 bg-blue-400 animate-pulse delay-75"></div>
                        <div className="w-1 h-4 bg-blue-400 animate-pulse delay-150"></div>
                      </div>
                    ) : isCurrentTrack ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                  <div className="col-span-1">{track.trackNumber || index + 1}</div>
                  <div className="col-span-4 truncate font-medium">
                    {track.title || 'Untitled Track'}
                  </div>
                  <div className="col-span-2 truncate">{selectedAlbum?.artist}</div>
                  <div className="col-span-2 truncate">{selectedAlbum?.title}</div>
                  <div className="col-span-1">{formatDuration(track.duration)}</div>
                  <div className="col-span-1 text-gray-500">Electronic</div>
                </div>
              );
            })}
          </div>

          {/* Player Controls Bar */}
          <div className="px-6 py-3 border-t border-gray-800 bg-gray-900/80 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevious}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  if (selectedAlbum) {
                    onPlay(selectedAlbum, e);
                  }
                }}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
              >
                {isPlaying && currentTrack?.album === selectedAlbum?.title ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>
              <button
                onClick={handleNext}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{currentIndex + 1} of {albums.length} albums</span>
              <span className="text-gray-600">•</span>
              <span>{selectedAlbum?.tracks.length || 0} tracks</span>
            </div>

            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <div className="w-24 h-1 bg-gray-700 rounded-full">
                <div className="w-3/4 h-full bg-gray-400 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}