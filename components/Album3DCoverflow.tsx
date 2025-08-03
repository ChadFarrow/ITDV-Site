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
    
    // Tighter spacing and more pronounced angles
    const baseX = position * 140; // Reduced spacing between albums
    const z = Math.abs(position) > 3 ? -500 : -Math.abs(position) * 180; // More depth
    const rotateY = Math.max(-70, Math.min(70, -position * 55)); // More rotation
    const scale = Math.abs(position) > 3 ? 0.5 : position === 0 ? 1.15 : 0.75; // Bigger center, smaller sides
    const opacity = Math.abs(position) > 3 ? 0 : position === 0 ? 1 : 0.65;

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
      opacity: (albumStyle.opacity as number) * 0.45, // More visible reflections
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
        className="relative h-[60%]"
        style={{ 
          perspective: '1200px', 
          perspectiveOrigin: '50% 50%',
          background: 'linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 50%, #000000 100%)'
        }}
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
                    <div className={`relative ${isCenter ? 'w-80 h-80' : 'w-60 h-60'} rounded-lg overflow-hidden ${isCenter ? 'shadow-2xl ring-2 ring-white/10 ring-offset-2 ring-offset-transparent' : 'shadow-xl'}`}>
                      <Image
                        src={album.coverArt}
                        alt={album.title}
                        fill
                        className="object-cover"
                        sizes={isCenter ? '288px' : '256px'}
                        priority={Math.abs(index - currentIndex) <= 2}
                      />
                      {isCenter && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 hover:opacity-100 transition-all duration-300 flex items-end p-4">
                          <div className="text-white transform translate-y-2 hover:translate-y-0 transition-transform duration-300">
                            <h3 className="font-bold text-lg drop-shadow-lg">{album.title}</h3>
                            <p className="text-sm opacity-90 drop-shadow-md">{album.artist}</p>
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
                    <div className={`relative ${isCenter ? 'w-80 h-80' : 'w-60 h-60'} rounded-lg overflow-hidden`}>
                      <Image
                        src={album.coverArt}
                        alt=""
                        fill
                        className="object-cover"
                        sizes={isCenter ? '288px' : '256px'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/85 to-black/95" />
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
          className="absolute left-8 top-1/2 -translate-y-1/2 p-2.5 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all hover:scale-110 border border-white/10 z-20 group"
        >
          <SkipBack className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
        </button>
        
        <button
          onClick={handleNext}
          className="absolute right-8 top-1/2 -translate-y-1/2 p-2.5 bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all hover:scale-110 border border-white/10 z-20 group"
        >
          <SkipForward className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
        </button>

        {/* Current Album Info */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center z-20">
          <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">
            {selectedAlbum?.title || 'Untitled'}
          </h2>
          <p className="text-gray-300 drop-shadow-md">
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
      <div className="h-[40%] bg-gradient-to-b from-gray-950 to-black border-t border-gray-800/50 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Table Header */}
          <div className="px-6 py-1.5 border-b border-gray-800/40 bg-gray-900/30">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    grid grid-cols-12 gap-4 px-6 py-1.5 text-sm hover:bg-gray-800/40 cursor-pointer transition-all
                    ${isCurrentTrack ? 'bg-blue-900/15 text-blue-300' : 'text-gray-400 hover:text-gray-200'}
                    ${isSelected ? 'bg-gray-800/20' : ''}
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
                        <div className="w-0.5 h-3 bg-blue-400 animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                        <div className="w-0.5 h-2 bg-blue-400 animate-[pulse_1.5s_ease-in-out_infinite_0.2s]"></div>
                        <div className="w-0.5 h-4 bg-blue-400 animate-[pulse_1.5s_ease-in-out_infinite_0.4s]"></div>
                      </div>
                    ) : isCurrentTrack ? (
                      <Pause className="w-3 h-3 text-blue-400" />
                    ) : (
                      <Play className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
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
          <div className="px-6 py-2.5 border-t border-gray-800/50 bg-gradient-to-b from-gray-900/90 to-gray-950 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevious}
                className="p-1.5 hover:bg-gray-700/40 rounded-lg transition-all hover:scale-110"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  if (selectedAlbum) {
                    onPlay(selectedAlbum, e);
                  }
                }}
                className="p-2.5 bg-gradient-to-b from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                {isPlaying && currentTrack?.album === selectedAlbum?.title ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 hover:bg-gray-700/40 rounded-lg transition-all hover:scale-110"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{currentIndex + 1} of {albums.length} albums</span>
              <span className="text-gray-700">•</span>
              <span>{selectedAlbum?.tracks.length || 0} tracks</span>
            </div>

            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-gray-500" />
              <div className="w-24 h-1 bg-gray-800 rounded-full">
                <div className="w-3/4 h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}