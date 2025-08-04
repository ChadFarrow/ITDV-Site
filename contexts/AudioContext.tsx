'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

interface Track {
  title: string;
  duration: string;
  url: string;
  trackNumber: number;
  image?: string;
  artist?: string;
  album?: string;
}

interface AudioContextType {
  // Current track info
  currentTrack: Track | null;
  currentAlbum: string | null;
  
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  
  // Playlist
  playlist: Track[];
  currentTrackIndex: number;
  isShuffling: boolean;
  isRepeating: boolean;
  
  // Actions
  playTrack: (track: Track, album?: string) => void;
  playAlbum: (tracks: Track[], startIndex?: number, album?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentAlbum, setCurrentAlbum] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (isRepeating) {
        audio.currentTime = 0;
        audio.play();
      } else {
        nextTrack();
      }
    };
    const handleLoadStart = () => setCurrentTime(0);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);


    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [isRepeating, nextTrack]);

  const playTrack = (track: Track, album?: string) => {
    if (!audioRef.current) return;

    setCurrentTrack(track);
    setCurrentAlbum(album || null);
    setPlaylist([track]);
    setCurrentTrackIndex(0);
    
    audioRef.current.src = track.url;
    audioRef.current.load();
    audioRef.current.play();
    setIsPlaying(true);

    // Update Media Session API
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || 'Unknown Artist',
        album: album || undefined,
        artwork: track.image ? [
          { src: track.image, sizes: '512x512', type: 'image/png' }
        ] : []
      });
    }
  };

  const playAlbum = (tracks: Track[], startIndex = 0, album?: string) => {
    if (!audioRef.current || tracks.length === 0) return;

    const track = tracks[startIndex];
    setCurrentTrack(track);
    setCurrentAlbum(album || null);
    setPlaylist(tracks);
    setCurrentTrackIndex(startIndex);
    
    audioRef.current.src = track.url;
    audioRef.current.load();
    audioRef.current.play();
    setIsPlaying(true);

    // Update Media Session API
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || 'Unknown Artist',
        album: album || undefined,
        artwork: track.image ? [
          { src: track.image, sizes: '512x512', type: 'image/png' }
        ] : []
      });
    }
  };

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const nextTrack = useCallback(() => {
    if (playlist.length === 0) return;

    let nextIndex: number;
    
    if (isShuffling && playlist.length > 1) {
      // Get random track that's not the current one
      do {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } while (nextIndex === currentTrackIndex);
    } else {
      nextIndex = currentTrackIndex + 1;
      if (nextIndex >= playlist.length) {
        nextIndex = 0; // Loop back to start
      }
    }

    const nextTrack = playlist[nextIndex];
    setCurrentTrack(nextTrack);
    setCurrentTrackIndex(nextIndex);
    
    if (audioRef.current) {
      audioRef.current.src = nextTrack.url;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play();
      }
    }

    // Update Media Session API
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: nextTrack.title,
        artist: nextTrack.artist || 'Unknown Artist',
        album: nextTrack.album || currentAlbum || undefined,
        artwork: nextTrack.image ? [
          { src: nextTrack.image, sizes: '512x512', type: 'image/png' }
        ] : []
      });
    }
  }, [playlist, currentTrackIndex, isShuffling, isPlaying, currentAlbum]);

  const previousTrack = useCallback(() => {
    if (playlist.length === 0) return;

    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
      prevIndex = playlist.length - 1; // Loop to end
    }

    const prevTrack = playlist[prevIndex];
    setCurrentTrack(prevTrack);
    setCurrentTrackIndex(prevIndex);
    
    if (audioRef.current) {
      audioRef.current.src = prevTrack.url;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play();
      }
    }

    // Update Media Session API
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: prevTrack.title,
        artist: prevTrack.artist || 'Unknown Artist',
        album: prevTrack.album || currentAlbum || undefined,
        artwork: prevTrack.image ? [
          { src: prevTrack.image, sizes: '512x512', type: 'image/png' }
        ] : []
      });
    }
  }, [playlist, currentTrackIndex, isPlaying, currentAlbum]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const toggleShuffle = () => {
    setIsShuffling(!isShuffling);
  };

  const toggleRepeat = () => {
    setIsRepeating(!isRepeating);
  };

  // Media Session API handlers - after all functions are declared
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => resume());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => previousTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekTo(details.seekTime);
        }
      });
    }
  }, [resume, pause, previousTrack, nextTrack, seekTo]);

  const value: AudioContextType = {
    currentTrack,
    currentAlbum,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playlist,
    currentTrackIndex,
    isShuffling,
    isRepeating,
    playTrack,
    playAlbum,
    pause,
    resume,
    stop,
    nextTrack,
    previousTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};