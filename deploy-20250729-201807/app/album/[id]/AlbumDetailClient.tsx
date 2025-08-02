'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { RSSAlbum } from '@/lib/rss-parser';
import { getAlbumArtworkUrl, getPlaceholderImageUrl } from '@/lib/cdn-utils';
import { generateAlbumUrl, generatePublisherSlug } from '@/lib/url-utils';
import { useAudio } from '@/contexts/AudioContext';
import ControlsBar from '@/components/ControlsBar';

interface AlbumDetailClientProps {
  albumTitle: string;
  initialAlbum: RSSAlbum | null;
}

export default function AlbumDetailClient({ albumTitle, initialAlbum }: AlbumDetailClientProps) {
  const [album, setAlbum] = useState<RSSAlbum | null>(initialAlbum);
  const [isLoading, setIsLoading] = useState(!initialAlbum);
  const [error, setError] = useState<string | null>(null);
  const [podrollAlbums, setPodrollAlbums] = useState<RSSAlbum[]>([]);
  
  // Global audio context
  const { 
    playAlbum: globalPlayAlbum, 
    currentPlayingAlbum, 
    isPlaying: globalIsPlaying,
    currentTrackIndex: globalTrackIndex,
    currentTime: globalCurrentTime,
    duration: globalDuration,
    pause: globalPause,
    resume: globalResume,
    seek: globalSeek,
    shuffleAllTracks
  } = useAudio();
  


  // Background state
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [albumArtLoaded, setAlbumArtLoaded] = useState(false);
  const [lastProcessedCoverArt, setLastProcessedCoverArt] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  

  // Detect desktop for background loading optimization
  useEffect(() => {
    const checkDevice = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    
    if (typeof window !== 'undefined') {
      checkDevice();
      window.addEventListener('resize', checkDevice);
      return () => window.removeEventListener('resize', checkDevice);
    }
  }, []);

  // Early background loading for desktop - start immediately when component mounts
  useEffect(() => {
    if (!isClient || !isDesktop) return;
    
    // Try to preload background image from album title
    const preloadBackgroundImage = async () => {
      try {
        // Load pre-parsed album data to find the album and its cover art
        const response = await fetch('/api/albums');
        if (response.ok) {
          const data = await response.json();
          const albums = data.albums || [];
          
          // Find album by title (case-insensitive)
          const decodedAlbumTitle = decodeURIComponent(albumTitle);
          const foundAlbum = albums.find((album: any) => 
            album.title.toLowerCase() === decodedAlbumTitle.toLowerCase()
          );
          
          if (foundAlbum?.coverArt) {
            console.log('🎨 Preloading background image for desktop:', foundAlbum.coverArt);
            
            // Add cache-busting parameter to prevent stale cache issues
            const cacheBuster = Date.now();
            const imageUrlWithCacheBuster = foundAlbum.coverArt.includes('?') 
              ? `${foundAlbum.coverArt}&cb=${cacheBuster}`
              : `${foundAlbum.coverArt}?cb=${cacheBuster}`;
            
            // Preload the image
            const img = new window.Image();
            img.onload = () => {
              console.log('✅ Background image preloaded successfully:', foundAlbum.coverArt);
              setBackgroundImage(imageUrlWithCacheBuster);
              setBackgroundLoaded(true);
            };
            img.onerror = (error) => {
              console.error('❌ Background image preload failed:', foundAlbum.coverArt, error);
              
              // Try image proxy for external URLs
              if (foundAlbum.coverArt && !foundAlbum.coverArt.includes('re.podtards.com')) {
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(foundAlbum.coverArt)}`;
                console.log('🔄 Trying image proxy for background:', proxyUrl);
                
                const proxyImg = new window.Image();
                proxyImg.onload = () => {
                  console.log('✅ Background image preloaded with proxy:', proxyUrl);
                  setBackgroundImage(proxyUrl);
                  setBackgroundLoaded(true);
                };
                proxyImg.onerror = (proxyError) => {
                  console.error('❌ Background image proxy also failed:', proxyUrl, proxyError);
                  // Final fallback - try original URL without cache buster
                  const fallbackImg = new window.Image();
                  fallbackImg.onload = () => {
                    console.log('✅ Background image preloaded with fallback URL:', foundAlbum.coverArt);
                    setBackgroundImage(foundAlbum.coverArt || null);
                    setBackgroundLoaded(true);
                  };
                  fallbackImg.onerror = (fallbackError) => {
                    console.error('❌ Background image preload fallback also failed:', foundAlbum.coverArt, fallbackError);
                    setBackgroundImage(null);
                    setBackgroundLoaded(true);
                  };
                  fallbackImg.decoding = 'async';
                  fallbackImg.src = foundAlbum.coverArt;
                };
                proxyImg.decoding = 'async';
                proxyImg.src = proxyUrl;
              } else {
                // For internal URLs, try without cache buster as fallback
                const fallbackImg = new window.Image();
                fallbackImg.onload = () => {
                  console.log('✅ Background image preloaded with fallback URL:', foundAlbum.coverArt);
                  setBackgroundImage(foundAlbum.coverArt || null);
                  setBackgroundLoaded(true);
                };
                fallbackImg.onerror = (fallbackError) => {
                  console.error('❌ Background image preload fallback also failed:', foundAlbum.coverArt, fallbackError);
                  setBackgroundImage(null);
                  setBackgroundLoaded(true);
                };
                fallbackImg.decoding = 'async';
                fallbackImg.src = foundAlbum.coverArt;
              }
            };
            
            img.decoding = 'async';
            img.src = imageUrlWithCacheBuster;
          } else {
            console.log('🚫 No album found for preloading, using gradient background');
            setBackgroundImage(null);
            setBackgroundLoaded(true);
          }
        }
      } catch (error) {
        console.error('❌ Error preloading background image:', error);
        setBackgroundImage(null);
        setBackgroundLoaded(true);
      }
    };
    
    preloadBackgroundImage();
  }, [isClient, isDesktop, albumTitle]);

  // Update Media Session API for iOS lock screen controls
  const updateMediaSession = (track: any) => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: album?.artist || 'Unknown Artist',
        album: album?.title || 'Unknown Album',
        artwork: [
          { src: album?.coverArt || '', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    }
  };

  const formatDuration = (duration: string): string => {
    if (!duration) return '0:00';
    
    // If already formatted with colon, return as is
    if (duration.includes(':')) return duration;
    
    // If it's just seconds, convert to MM:SS format
    const seconds = parseInt(duration);
    if (!isNaN(seconds)) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Try to parse other formats and ensure colon format
    return duration;
  };

  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio player functions
  const togglePlay = async () => {
    if (globalIsPlaying && currentPlayingAlbum?.title === album?.title) {
      globalPause();
    } else {
      if (album && album.tracks.length > 0) {
        await playTrack(globalTrackIndex);
      }
    }
  };

  const playTrack = async (index: number) => {
    if (!album || !album.tracks[index] || !album.tracks[index].url) {
      console.error('❌ Missing album, track, or URL');
      return;
    }
    
    console.log('🎵 Attempting to play track:', album.tracks[index].title, 'URL:', album.tracks[index].url);
    
    // Use global audio context for playback
    const success = await globalPlayAlbum(album, index);
    
    if (success) {
      console.log('✅ Track playback started successfully via global audio context');
      
      // Update Media Session for lock screen controls
      updateMediaSession(album.tracks[index]);
    } else {
      console.error('❌ Failed to play track via global audio context');
      setError('Unable to play audio - please try a different track');
      setTimeout(() => setError(null), 5000);
    }
  };

  const playAlbum = async () => {
    if (album && album.tracks.length > 0) {
      await playTrack(0);
    }
  };

  const nextTrack = async () => {
    if (album && globalTrackIndex < album.tracks.length - 1) {
      await playTrack(globalTrackIndex + 1);
    }
  };

  const prevTrack = async () => {
    if (album && globalTrackIndex > 0) {
      await playTrack(globalTrackIndex - 1);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    globalSeek(time);
  };

  // Initialize client state
  useEffect(() => {
    setIsClient(true);
  }, []);


  // Update background when album data changes (only for mobile or when early loading fails)
  useEffect(() => {
    // Don't run background effect while loading or if album is null
    if (isLoading || !album) {
      return;
    }
    
    // On desktop, skip this if we already have a background image from early loading
    if (isDesktop && backgroundImage) {
      return;
    }
    
    // Prevent infinite loops by checking if we've already processed this cover art
    if (album?.coverArt === lastProcessedCoverArt) {
      return;
    }
    
    console.log('🎨 Background update triggered:', { 
      albumTitle: album?.title, 
      coverArt: album?.coverArt,
      hasCoverArt: !!album?.coverArt,
      isDesktop
    });
    
    // Mark this cover art as processed
    setLastProcessedCoverArt(album?.coverArt || null);
    
    // Reset loading states when album changes
    setBackgroundLoaded(false);
    setAlbumArtLoaded(false);
    
    if (album?.coverArt) {
      console.log('🖼️ Loading background image:', album?.coverArt);
      
      // Add cache-busting parameter to prevent stale cache issues
      const cacheBuster = Date.now();
      const imageUrlWithCacheBuster = album?.coverArt.includes('?') 
        ? `${album?.coverArt}&cb=${cacheBuster}`
        : `${album?.coverArt}?cb=${cacheBuster}`;
      
      // Preload the image to ensure it's available for background
      const img = new window.Image();
      img.onload = () => {
        console.log('✅ Background image loaded successfully:', album?.coverArt);
        setBackgroundImage(imageUrlWithCacheBuster);
        setBackgroundLoaded(true); // Mark background as loaded
      };
      img.onerror = (error) => {
        console.error('❌ Background image failed to load:', album?.coverArt, error);
        
        // Try image proxy for external URLs
        if (album?.coverArt && !album?.coverArt.includes('re.podtards.com')) {
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(album?.coverArt)}`;
          console.log('🔄 Trying image proxy for background:', proxyUrl);
          
          const proxyImg = new window.Image();
          proxyImg.onload = () => {
            console.log('✅ Background image loaded with proxy:', proxyUrl);
            setBackgroundImage(proxyUrl);
            setBackgroundLoaded(true);
          };
          proxyImg.onerror = (proxyError) => {
            console.error('❌ Background image proxy also failed:', proxyUrl, proxyError);
            // Final fallback - try original URL without cache buster
            const fallbackImg = new window.Image();
            fallbackImg.onload = () => {
              console.log('✅ Background image loaded with fallback URL:', album?.coverArt);
              setBackgroundImage(album?.coverArt || null);
              setBackgroundLoaded(true);
            };
            fallbackImg.onerror = (fallbackError) => {
              console.error('❌ Background image fallback also failed:', album?.coverArt, fallbackError);
              // Fallback to gradient if image fails to load
              setBackgroundImage(null);
              setBackgroundLoaded(true); // Mark background as loaded even if image fails
            };
            fallbackImg.decoding = 'async';
            fallbackImg.src = album?.coverArt || '';
          };
          proxyImg.decoding = 'async';
          proxyImg.src = proxyUrl;
        } else {
          // For internal URLs, try without cache buster as fallback
          const fallbackImg = new window.Image();
          fallbackImg.onload = () => {
            console.log('✅ Background image loaded with fallback URL:', album?.coverArt);
            setBackgroundImage(album?.coverArt || null);
            setBackgroundLoaded(true);
          };
          fallbackImg.onerror = (fallbackError) => {
            console.error('❌ Background image fallback also failed:', album?.coverArt, fallbackError);
            // Fallback to gradient if image fails to load
            setBackgroundImage(null);
            setBackgroundLoaded(true); // Mark background as loaded even if image fails
          };
          fallbackImg.decoding = 'async';
          fallbackImg.src = album?.coverArt || '';
        }
      };
      
      // Set priority loading for background image
      img.decoding = 'async';
      img.src = imageUrlWithCacheBuster;
    } else {
      console.log('🚫 No cover art available, using gradient background');
      setBackgroundImage(null);
      setBackgroundLoaded(true); // Mark background as loaded even if no image
    }
    
    // Ensure background is marked as loaded after a short delay to prevent blocking
    const timeoutId = setTimeout(() => {
      console.log('⏰ Background loading timeout - marking as loaded');
      setBackgroundLoaded(true);
    }, 3000); // Increased to 3 second timeout for better reliability
    
    return () => clearTimeout(timeoutId);
  }, [album?.coverArt, lastProcessedCoverArt, isLoading, album, isDesktop, backgroundImage]); // Added isDesktop and backgroundImage to dependencies

  // Optimized background style calculation - memoized to prevent repeated logs
  const backgroundStyle = useMemo(() => {
    const style = backgroundImage && isClient ? {
      background: `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.9)), url('${backgroundImage}') center/cover fixed`,
      backgroundAttachment: 'fixed'
    } : {
      background: 'linear-gradient(to bottom right, rgb(17, 24, 39), rgb(31, 41, 55), rgb(17, 24, 39))'
    };

    return style;
  }, [backgroundImage, isClient]);

  // Load album data if not provided initially
  useEffect(() => {
    if (!initialAlbum) {
      const loadAlbum = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          // Smart feed selection based on album title
          const decodedAlbumTitle = decodeURIComponent(albumTitle);
          let feedUrls: string[] = [];
          
          // Map album titles to their specific feeds
          const titleToFeedMap: { [key: string]: string } = {
            'into the doerfel-verse': 'https://www.doerfelverse.com/feeds/intothedoerfelverse.xml',
            'into the doerfelverse': 'https://www.doerfelverse.com/feeds/intothedoerfelverse.xml',
            'music from the doerfel-verse': 'https://www.doerfelverse.com/feeds/music-from-the-doerfelverse.xml',
            'music-from-the-doerfel-verse': 'https://www.doerfelverse.com/feeds/music-from-the-doerfelverse.xml',
            'music from the doerfelverse': 'https://www.doerfelverse.com/feeds/music-from-the-doerfelverse.xml',
            'bloodshot lies': 'https://www.doerfelverse.com/feeds/bloodshot-lies-album.xml',
            'bloodshot lies album': 'https://www.doerfelverse.com/feeds/bloodshot-lies-album.xml',
            'wrath of banjo': 'https://www.doerfelverse.com/feeds/wrath-of-banjo.xml',
            'beware of banjo': 'https://www.sirtjthewrathful.com/wp-content/uploads/2023/07/Beware-of-Banjo.xml',
            'ben doerfel': 'https://www.doerfelverse.com/feeds/ben-doerfel.xml',
            '18 sundays': 'https://www.doerfelverse.com/feeds/18sundays.xml',
            'alandace': 'https://www.doerfelverse.com/feeds/alandace.xml',
            'autumn': 'https://www.doerfelverse.com/feeds/autumn.xml',
            'christ exalted': 'https://www.doerfelverse.com/feeds/christ-exalted.xml',
            'come back to me': 'https://www.doerfelverse.com/feeds/come-back-to-me.xml',
            'dead time live 2016': 'https://www.doerfelverse.com/feeds/dead-time-live-2016.xml',
            'dfb v1': 'https://www.doerfelverse.com/feeds/dfbv1.xml',
            'dfb v2': 'https://www.doerfelverse.com/feeds/dfbv2.xml',
            'disco swag': 'https://www.doerfelverse.com/feeds/disco-swag.xml',
            'doerfels pubfeed': 'https://www.doerfelverse.com/feeds/music-from-the-doerfelverse.xml', // Use main album feed instead of publisher feed
            'first married christmas': 'https://www.doerfelverse.com/feeds/first-married-christmas.xml',
            'generation gap': 'https://www.doerfelverse.com/feeds/generation-gap.xml',
            'heartbreak': 'https://www.doerfelverse.com/feeds/heartbreak.xml',
            'merry christmix': 'https://www.doerfelverse.com/feeds/merry-christmix.xml',
            'middle season let go': 'https://www.doerfelverse.com/feeds/middle-season-let-go.xml',
            'phatty the grasshopper': 'https://www.doerfelverse.com/feeds/phatty-the-grasshopper.xml',
            'possible': 'https://www.doerfelverse.com/feeds/possible.xml',
            'pour over': 'https://www.doerfelverse.com/feeds/pour-over.xml',
            'psalm 54': 'https://www.doerfelverse.com/feeds/psalm-54.xml',
            'sensitive guy': 'https://www.doerfelverse.com/feeds/sensitive-guy.xml',
            'they dont know': 'https://www.doerfelverse.com/feeds/they-dont-know.xml',
            'think ep': 'https://www.doerfelverse.com/feeds/think-ep.xml',
            'underwater single': 'https://www.doerfelverse.com/feeds/underwater-single.xml',
            'unsound existence': 'https://www.doerfelverse.com/feeds/unsound-existence.xml',
            'you are my world': 'https://www.doerfelverse.com/feeds/you-are-my-world.xml',
            'you feel like home': 'https://www.doerfelverse.com/feeds/you-feel-like-home.xml',
            'your chance': 'https://www.doerfelverse.com/feeds/your-chance.xml',
            'nostalgic': 'https://www.sirtjthewrathful.com/wp-content/uploads/2023/08/Nostalgic.xml',
            'citybeach': 'https://www.sirtjthewrathful.com/wp-content/uploads/2023/08/CityBeach.xml',
            'kurtisdrums v1': 'https://www.sirtjthewrathful.com/wp-content/uploads/2023/08/Kurtisdrums-V1.xml',
            'ring that bell': 'https://www.thisisjdog.com/media/ring-that-bell.xml',
            'tinderbox': 'https://wavlake.com/feed/music/d677db67-0310-4813-970e-e65927c689f1',
            'nate johnivan': 'https://wavlake.com/feed/music/e678589b-5a9f-4918-9622-34119d2eed2c', // Nate Johnivan album
            'fountain artist takeover': 'https://wavlake.com/feed/music/6dc5c681-8beb-4193-93a3-d405c962d103',
            'fountain-artist-takeover': 'https://wavlake.com/feed/music/6dc5c681-8beb-4193-93a3-d405c962d103',
            'fountain artist takeover nate johnivan': 'https://wavlake.com/feed/music/6dc5c681-8beb-4193-93a3-d405c962d103',
            'fountain-artist-takeover-nate-johnivan': 'https://wavlake.com/feed/music/6dc5c681-8beb-4193-93a3-d405c962d103',
            'empty passenger seat': 'https://wavlake.com/feed/music/95ea253a-4058-402c-8503-204f6d3f1494',
            'joe martin': 'https://wavlake.com/feed/music/95ea253a-4058-402c-8503-204f6d3f1494', // Empty Passenger Seat album
            'stay awhile': 'https://ableandthewolf.com/static/media/feed.xml',
            'now i feel it': 'https://music.behindthesch3m3s.com/wp-content/uploads/c_kostra/now i feel it.xml',
            'they ride': 'https://wavlake.com/feed/music/997060e3-9dc1-4cd8-b3c1-3ae06d54bb03',
            'more': 'https://wavlake.com/feed/music/b54b9a19-b6ed-46c1-806c-7e82f7550edc',
            // Temporarily disabled due to NetworkError issues
            // 'love in its purest form': 'https://feed.falsefinish.club/Vance%20Latta/Vance%20Latta%20-%20Love%20In%20Its%20Purest%20Form/love%20in%20its%20purest%20form.xml',
            'opus': 'https://www.doerfelverse.com/artists/opus/opus/opus.xml',
            
            // Doerfels albums
            'bloodshot-lies---the-album': 'https://www.doerfelverse.com/feeds/bloodshot-lies-album.xml',
            'dead-timelive-2016': 'https://www.doerfelverse.com/feeds/dead-time-live-2016.xml',
            'dfb-volume-1': 'https://www.doerfelverse.com/feeds/dfbv1.xml',
            'dfb-volume-2': 'https://www.doerfelverse.com/feeds/dfbv2.xml',
            'let-go-whats-holding-you-back': 'https://www.doerfelverse.com/feeds/middle-season-let-go.xml',
            'unsound-existence-self-hosted-version': 'https://www.doerfelverse.com/feeds/unsound-existence.xml',
            'you-feel-like-homesingle': 'https://www.doerfelverse.com/feeds/you-feel-like-home.xml',
            'kurtisdrums': 'https://www.sirtjthewrathful.com/wp-content/uploads/2023/08/Kurtisdrums-V1.xml',
            
            // External artists
            'deathdreams': 'https://static.staticsave.com/mspfiles/deathdreams.xml',
            'way-to-go': 'https://static.staticsave.com/mspfiles/waytogo.xml',
            'pilot': 'https://music.behindthesch3m3s.com/wp-content/uploads/Mellow%20Cassette/Pilot/pilot.xml',
            'radio-brigade': 'https://music.behindthesch3m3s.com/wp-content/uploads/Mellow%20Cassette/Radio_Brigade/radio_brigade.xml',
            
            // Nate Johnivan albums
            'singles': 'https://wavlake.com/feed/music/e678589b-5a9f-4918-9622-34119d2eed2c',
            'bowl-of-oranges-a-bright-eyes-cover': 'https://wavlake.com/feed/music/3a152941-c914-43da-aeca-5d7c58892a7f',
            'goodbye-uncle-walt': 'https://wavlake.com/feed/music/a97e0586-ecda-4b79-9c38-be9a9effe05a',
            'fight': 'https://wavlake.com/feed/music/0ed13237-aca9-446f-9a03-de1a2d9331a3',
            'safe-some-place': 'https://wavlake.com/feed/music/ce8c4910-51bf-4d5e-a0b3-338e58e5ee79',
            'you-should-waste-it': 'https://wavlake.com/feed/music/acb43f23-cfec-4cc1-a418-4087a5378129',
            'the-kid-the-dad-the-mom--the-tiny-window': 'https://wavlake.com/feed/music/d1a871a7-7e4c-4a91-b799-87dcbb6bc41d',
            'kids': 'https://wavlake.com/feed/music/3294d8b5-f9f6-4241-a298-f04df818390c',
            'dont-worry-you-still-have-time-to-ruin-it---demo': 'https://wavlake.com/feed/music/d3145292-bf71-415f-a841-7f5c9a9466e1',
            'rose': 'https://wavlake.com/feed/music/91367816-33e6-4b6e-8eb7-44b2832708fd',
            'fake-love---demo': 'https://wavlake.com/feed/music/8c8f8133-7ef1-4b72-a641-4e1a6a44d626',
            'roommates---demo': 'https://wavlake.com/feed/music/9720d58b-22a5-4047-81de-f1940fec41c7',
            'orange-pill-pink-pill-white-pill---demo': 'https://wavlake.com/feed/music/21536269-5192-49e7-a819-fab00f4a159e',
            'tyson-vs-paul': 'https://wavlake.com/feed/music/624b19ac-5d8b-4fd6-8589-0eef7bcb9c9e',
            
            // Joe Martin albums
            'crocodile-tears': 'https://wavlake.com/feed/music/1c7917cc-357c-4eaf-ab54-1a7cda504976',
            'letters-of-regret': 'https://wavlake.com/feed/music/e1f9dfcb-ee9b-4a6d-aee7-189043917fb5',
            'hero': 'https://wavlake.com/feed/music/d4f791c3-4d0c-4fbd-a543-c136ee78a9de',
            'bound-for-lonesome': 'https://wavlake.com/feed/music/51606506-66f8-4394-b6c6-cc0c1b554375',
            'the-first-five-years': 'https://wavlake.com/feed/music/6b7793b8-fd9d-432b-af1a-184cd41aaf9d',
            'daddy-gene': 'https://wavlake.com/feed/music/0bb8c9c7-1c55-4412-a517-572a98318921',
            'love-strong': 'https://wavlake.com/feed/music/16e46ed0-b392-4419-a937-a7815f6ca43b',
            'high-gravity': 'https://wavlake.com/feed/music/2cd1b9ea-9ef3-4a54-aa25-55295689f442',
            'small-world': 'https://wavlake.com/feed/music/33eeda7e-8591-4ff5-83f8-f36a879b0a09',
            'strangers-to-lovers---live-from-sloe-flower-studio': 'https://wavlake.com/feed/music/32a79df8-ec3e-4a14-bfcb-7a074e1974b9',
            'cant-promise-you-the-world---live-from-sloe-flower-studio': 'https://wavlake.com/feed/music/06376ab5-efca-459c-9801-49ceba5fdab1',
            
            // Publisher feed
            'iroh': 'https://wavlake.com/feed/artist/8a9c2e54-785a-4128-9412-737610f5d00a',
            
            // Death By Lions albums
            'i guess this will have to do': 'https://music.behindthesch3m3s.com/wp-content/uploads/Death_by_Lions/i_guess_this_will_have_to_do.xml',
            'i-guess-this-will-have-to-do': 'https://music.behindthesch3m3s.com/wp-content/uploads/Death_by_Lions/i_guess_this_will_have_to_do.xml'
          };
          
          // Convert URL slug back to title format (e.g., "stay-awhile" -> "stay awhile")
          const convertSlugToTitle = (slug: string): string => {
            return slug.replace(/-/g, ' ');
          };
          
          // Try to find a specific feed first
          const titleFromSlug = convertSlugToTitle(decodedAlbumTitle);
          const normalizedTitle = titleFromSlug.toLowerCase();
          const specificFeed = titleToFeedMap[normalizedTitle];
          
          console.log(`🔍 Album lookup: "${decodedAlbumTitle}" → "${titleFromSlug}" → "${normalizedTitle}"`);
          console.log(`📋 Specific feed found:`, specificFeed);
          
          // Always use pre-parsed album data instead of parsing RSS feeds
            const response = await fetch('/api/albums');
            
            if (!response.ok) {
              throw new Error(`Failed to fetch albums: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const albumsData = data.albums || [];
            
            console.log(`�� Found ${albumsData.length} albums in pre-parsed data`);
            console.log(`🔍 Looking for: "${decodedAlbumTitle}"`);
            
            // Debug: Log all found albums
            albumsData.forEach((album: any, index: number) => {
              console.log(`📋 Album ${index + 1}: "${album.title}" by ${album.artist}`);
            });
            
            // Check if Generation Gap is in the results
            const hasGenerationGap = albumsData.find((a: any) => a.title.toLowerCase().includes('generation'));
            if (hasGenerationGap) {
              console.log(`✅ Found Generation Gap-like album: "${hasGenerationGap.title}"`);
            } else {
              console.log(`❌ No Generation Gap found in results`);
            }
            
            // Find the matching album with more precise matching
            const foundAlbum = albumsData.find((a: any) => {
              const albumTitleLower = a.title.toLowerCase();
              const searchTitleLower = decodedAlbumTitle.toLowerCase();
              
              // First try exact match (case-sensitive)
              if (a.title === decodedAlbumTitle || a.title === albumTitle) {
                console.log(`✅ Exact match found: "${a.title}"`);
                return true;
              }
              
              // Then try case-insensitive exact match
              if (albumTitleLower === searchTitleLower) {
                console.log(`✅ Case-insensitive exact match found: "${a.title}"`);
                return true;
              }
              
              // Then try normalized exact match (remove special characters but preserve structure)
              const normalizedAlbum = albumTitleLower.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
              const normalizedSearch = searchTitleLower.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
              if (normalizedAlbum === normalizedSearch) {
                console.log(`✅ Normalized exact match found: "${a.title}"`);
                return true;
              }
              
              // For URL slugs, convert back to title format and try exact match
              const slugToTitle = (slug: string) => slug.replace(/-/g, ' ');
              const titleFromSlug = slugToTitle(searchTitleLower);
              if (albumTitleLower === titleFromSlug) {
                console.log(`✅ Slug-based exact match found: "${a.title}"`);
                return true;
              }
              
              // Try reverse slug generation to match
              const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
              const albumSlug = generateSlug(a.title);
              const searchSlug = generateSlug(searchTitleLower);
              if (albumSlug === searchSlug) {
                console.log(`✅ Reverse slug match found: "${a.title}" (slug: ${albumSlug})`);
                return true;
              }
              
              // Special cases for known problematic titles
              const specialCases: { [key: string]: string } = {
                'stay awhile': 'Stay Awhile',
                'all in a day': 'All in a Day',
                'bloodshot lies': 'Bloodshot Lies',
                'bloodshot lies album': 'Bloodshot Lies - The Album',
                'into the doerfel verse': 'Into The Doerfel-Verse',
                'into the doerfel-verse': 'Into The Doerfel-Verse',
                'into-the-doerfel-verse': 'Into The Doerfel-Verse',
                'into the doerfelverse': 'Into The Doerfel-Verse',
                'i guess this will have to do': 'I Guess This Will Have To Do',
                'i-guess-this-will-have-to-do': 'I Guess This Will Have To Do'
              };
              
              if (specialCases[searchTitleLower] && a.title === specialCases[searchTitleLower]) {
                console.log(`✅ Special case match found: "${a.title}"`);
                return true;
              }
              
              // Avoid fuzzy matching to prevent incorrect album loads
              // Only use contains match as a last resort and log a warning
              if (albumTitleLower.includes(searchTitleLower) && searchTitleLower.length > 5) {
                console.warn(`⚠️ Using fuzzy match - might be incorrect: "${a.title}" contains "${decodedAlbumTitle}"`);
                return true;
              }
              
              return false;
            });
            
            if (foundAlbum) {
              // Custom track ordering for concept albums
              let processedAlbum = { ...foundAlbum };
              
              // Fix track order for "They Ride" by IROH (concept album)
              if (foundAlbum.title.toLowerCase() === 'they ride' && foundAlbum.artist.toLowerCase() === 'iroh') {
                console.log('🎵 Applying custom track order for "They Ride" concept album');
                
                // Define the correct track order from YouTube Music (using exact RSS feed titles)
                const correctTrackOrder = [
                  '-',
                  'Heaven Knows', 
                  '....',
                  'The Fever',
                  '.',
                  'In Exile',
                  '-.--',
                  'The Seed Man',
                  '.-.',
                  'Renfield',
                  '..',
                  'They Ride',
                  '-..',
                  'Pedal Down ( feat. Rob Montgomery )',
                  '. ( The Last Transmission? )'
                ];
                
                // Sort tracks by the correct order with better matching
                processedAlbum.tracks = foundAlbum.tracks.sort((a: any, b: any) => {
                  const aTitle = a.title.toLowerCase().trim();
                  const bTitle = b.title.toLowerCase().trim();
                  
                  const aIndex = correctTrackOrder.findIndex(title => {
                    const correctTitle = title.toLowerCase().trim();
                    return aTitle === correctTitle || 
                           aTitle.includes(correctTitle) || 
                           correctTitle.includes(aTitle) ||
                           aTitle.replace(/[^a-z0-9]/g, '') === correctTitle.replace(/[^a-z0-9]/g, '');
                  });
                  
                  const bIndex = correctTrackOrder.findIndex(title => {
                    const correctTitle = title.toLowerCase().trim();
                    return bTitle === correctTitle || 
                           bTitle.includes(correctTitle) || 
                           correctTitle.includes(bTitle) ||
                           bTitle.replace(/[^a-z0-9]/g, '') === correctTitle.replace(/[^a-z0-9]/g, '');
                  });
                  
                  console.log(`🔍 Track sorting: "${a.title}" -> index ${aIndex}, "${b.title}" -> index ${bIndex}`);
                  
                  // If both found, sort by index
                  if (aIndex !== -1 && bIndex !== -1) {
                    return aIndex - bIndex;
                  }
                  // If only one found, prioritize it
                  if (aIndex !== -1) return -1;
                  if (bIndex !== -1) return 1;
                  // If neither found, keep original order
                  return 0;
                });
                
                console.log('✅ Track order corrected for "They Ride"');
              }
              
              console.log('📊 Album loaded:', processedAlbum.title);
              console.log('🎵 Track count:', processedAlbum.tracks.length);
              console.log('🖼️ Tracks with images:', processedAlbum.tracks.filter((t: any) => t.image).length);
              processedAlbum.tracks.forEach((track: any, index: number) => {
                if (track.image) {
                  console.log(`  Track ${index + 1}: "${track.title}" - Image: ${track.image}`);
                }
              });
              
              setAlbum(processedAlbum);
              // Load PodRoll albums if they exist
              if (foundAlbum.podroll && foundAlbum.podroll.length > 0) {
                loadPodrollAlbums(foundAlbum.podroll);
              }
              // Load Publisher feed albums if publisher exists
              if (foundAlbum.publisher && foundAlbum.publisher.feedUrl) {
                loadPublisherAlbums(foundAlbum.publisher.feedUrl);
              }
            } else {
              setError('Album not found');
            }
        } catch (err) {
          console.error('Error loading album:', err);
          setError('Error loading album data');
        } finally {
          setIsLoading(false);
        }
      };

      loadAlbum();
    } else {
      // Load PodRoll albums if they exist
      if (initialAlbum.podroll && initialAlbum.podroll.length > 0) {
        loadPodrollAlbums(initialAlbum.podroll);
      }
      // Load Publisher feed albums if publisher exists
      if (initialAlbum.publisher && initialAlbum.publisher.feedUrl) {
        loadPublisherAlbums(initialAlbum.publisher.feedUrl);
      }
    }
  }, [albumTitle, initialAlbum]);

  const loadPodrollAlbums = async (podrollItems: { url: string; title?: string; description?: string }[]) => {
    try {
      // Load pre-parsed album data and filter for podroll items
      const response = await fetch('/api/albums');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch albums: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const allAlbums = data.albums || [];
      
      // Filter albums that match the podroll URLs
      const podrollUrls = podrollItems.map(item => item.url);
      const podrollAlbumsData = allAlbums.filter((album: any) => {
        return podrollUrls.some(url => album.feedUrl === url);
      });
      
      setPodrollAlbums(podrollAlbumsData);
    } catch (err) {
      console.error('Error loading PodRoll albums:', err);
    }
  };

  const loadPublisherAlbums = async (publisherFeedUrl: string) => {
    try {
      console.log(`🏢 Loading albums from publisher feed: ${publisherFeedUrl}`);
      
      // Load pre-parsed album data and filter for publisher albums
      const response = await fetch('/api/albums');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch albums: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const allAlbums = data.albums || [];
      
      // Filter albums that belong to the publisher
      const publisherAlbumsData = allAlbums.filter((album: any) => {
        return album.publisher && album.publisher.feedUrl === publisherFeedUrl;
      });
      
      // Add publisher albums to podroll albums (they're displayed in the same section)
      setPodrollAlbums(prevAlbums => {
        // Combine and deduplicate based on title+artist
        const combined = [...prevAlbums];
        const existingKeys = new Set(prevAlbums.map(album => `${album.title.toLowerCase()}|${album.artist.toLowerCase()}`));
        
        publisherAlbumsData.forEach((album: any) => {
          const key = `${album.title.toLowerCase()}|${album.artist.toLowerCase()}`;
          if (!existingKeys.has(key)) {
            combined.push(album);
            existingKeys.add(key);
          }
        });
        
        console.log(`🎶 Added ${publisherAlbumsData.length} albums from publisher, total recommendations: ${combined.length}`);
        return combined;
      });
    } catch (err) {
      console.error('Error loading Publisher albums:', err);
    }
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen text-white"
        style={isDesktop && backgroundImage ? backgroundStyle : {
          background: 'linear-gradient(to bottom right, rgb(17, 24, 39), rgb(31, 41, 55), rgb(17, 24, 39))'
        }}
      >
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold">Loading Album...</h1>
            {isDesktop && backgroundImage && (
              <p className="text-gray-400 mt-2">Background loaded, content loading...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">
              {error === 'Album not found' ? 'Album Not Available' : (error || 'Album Not Found')}
            </h1>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {error === 'Album not found' 
                ? 'This album may not be available in our current collection or may have been temporarily removed.'
                : 'We couldn\'t load this album. Please check the URL or try again later.'
              }
            </p>
            <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              ← Back to Albums
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen text-white relative"
      style={backgroundStyle}
    >


      <div className="container mx-auto px-6 py-8 pb-40">
        {/* Back button */}
        <Link 
          href="/" 
          className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Albums
        </Link>

        {/* Album Header */}
        <div className="flex flex-col gap-6 mb-8">
          {/* Album Art with Play Button Overlay */}
          <div className="relative group mx-auto w-[280px] h-[280px]">
            <Image 
              src={getAlbumArtworkUrl(album?.coverArt || '', 'large')} 
              alt={album.title}
              width={280}
              height={280}
              className={`rounded-lg object-cover shadow-2xl transition-opacity duration-500 w-full h-full ${
                albumArtLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ objectFit: 'cover' }}
              priority={true} // Always prioritize album art loading
              onLoad={() => setAlbumArtLoaded(true)}
              onError={(e) => {
                // Fallback to placeholder on error
                const target = e.target as HTMLImageElement;
                target.src = getPlaceholderImageUrl('large');
                setAlbumArtLoaded(true);
              }}
            />
            
            {/* Loading placeholder - show when album art is not loaded */}
            {!albumArtLoaded && (
              <div className="absolute inset-0 w-full h-full bg-gray-800 animate-pulse rounded-lg flex items-center justify-center">
                <div className="text-gray-400 text-sm">Loading...</div>
              </div>
            )}
            
            {/* Play Button Overlay - Always visible and prominent on mobile */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={globalIsPlaying && currentPlayingAlbum?.title === album?.title ? togglePlay : playAlbum}
                className="bg-white/95 hover:bg-white active:bg-white text-black rounded-full p-4 transform hover:scale-110 active:scale-95 transition-all duration-200 shadow-2xl border-2 border-white/30 z-10 touch-manipulation"
                style={{ minWidth: '64px', minHeight: '64px' }}
              >
                {globalIsPlaying && currentPlayingAlbum?.title === album?.title ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {/* Album Info */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">{album.title}</h1>
            <p className="text-xl text-gray-300">{album.artist}</p>
            
            {album.subtitle && (
              <p className="text-lg text-gray-300 italic">{album.subtitle}</p>
            )}
            
            <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
              <span>{new Date(album.releaseDate).getFullYear()}</span>
              <span>{album.tracks.length} tracks</span>
              {album.explicit && <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">EXPLICIT</span>}
            </div>
            
            {(album.summary || album.description) && (
              <p className="text-gray-300 text-center max-w-lg mx-auto leading-relaxed">{album.summary || album.description}</p>
            )}

            {/* Publisher Information */}
            {album.publisher && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <span>More from this artist:</span>
                <Link
                  href={`/publisher/${generatePublisherSlug({ feedGuid: album.publisher.feedGuid })}`}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View Discography
                </Link>
                <span className="text-xs bg-gray-600 px-2 py-1 rounded">PC 2.0</span>
              </div>
            )}

            {/* Funding Information */}
            {album.funding && album.funding.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-white text-center">Support This Artist</h3>
                <div className="flex flex-wrap justify-center gap-3">
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

        {/* Track List */}
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-center sm:text-left">Tracks</h2>
            
            {/* Shuffle Controls */}
            <ControlsBar
              activeFilter="all"
              onFilterChange={() => {}}
              showFilters={false}
              sortType="name"
              onSortChange={() => {}}
              viewType="list"
              onViewChange={() => {}}
              showViewToggle={false}
              onShuffle={shuffleAllTracks}
              showShuffle={true}
              resultCount={album.tracks.length}
              resultLabel="tracks"
              className="flex-shrink-0"
            />
          </div>
          <div className="space-y-2">
            {album.tracks.map((track, index) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-4 hover:bg-white/10 rounded-lg transition-colors group cursor-pointer ${
                  globalTrackIndex === index && currentPlayingAlbum?.title === album?.title ? 'bg-white/20' : ''
                }`}
                onClick={() => playTrack(index)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 overflow-hidden rounded">
                    {/* Always use album artwork for tracks */}
                    <Image 
                      src={getAlbumArtworkUrl(album?.coverArt || '', 'thumbnail')} 
                      alt={album.title}
                      width={48}
                      height={48}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ objectFit: 'cover' }}
                      onError={(e) => {
                        // Fallback to track number if album image fails
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    {/* Play Button Overlay - On album artwork */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <button 
                        className="bg-white text-black rounded-full p-1 transform hover:scale-110 transition-all duration-200 shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTrack(index);
                        }}
                      >
                        {globalTrackIndex === index && globalIsPlaying && currentPlayingAlbum?.title === album?.title ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    {/* Track number fallback background - hidden by default */}
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center hidden">
                      <span className="text-gray-400 text-sm font-medium">
                        {track.trackNumber || index + 1}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-sm md:text-base">{track.title}</p>
                    {track.subtitle && (
                      <p className="text-xs md:text-sm text-gray-400 italic truncate">{track.subtitle}</p>
                    )}
                    <p className="text-xs md:text-sm text-gray-400 truncate">{album?.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                  {track.explicit && (
                    <span className="bg-red-600 text-white px-1 py-0.5 rounded text-xs font-bold">
                      E
                    </span>
                  )}
                  <span className="text-xs md:text-sm text-gray-400">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PodRoll and Publisher Recommendations */}
        {podrollAlbums.length > 0 && (
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">You Might Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {podrollAlbums.map((podrollAlbum, index) => (
                <Link
                  key={index}
                  href={generateAlbumUrl(podrollAlbum.title)}
                  className="group block"
                >
                  <div className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all duration-200 hover:scale-105">
                    <div className="aspect-square relative mb-3">
                      <Image 
                        src={getAlbumArtworkUrl(podrollAlbum.coverArt || '', 'thumbnail')} 
                        alt={podrollAlbum.title}
                        width={150}
                        height={150}
                        className="w-full h-full object-cover rounded-md"
                        onError={(e) => {
                          // Fallback to placeholder on error
                          const target = e.target as HTMLImageElement;
                          target.src = getPlaceholderImageUrl('thumbnail');
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-md transition-all duration-200 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1 overflow-hidden text-ellipsis" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {podrollAlbum.title}
                    </h3>
                    <p className="text-gray-400 text-xs">
                      {podrollAlbum.artist}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>


    </div>
  );
} 