'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

interface CDNImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'gif' | 'auto';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  onError?: () => void;
  onLoad?: () => void;
  fallbackSrc?: string;
  sizes?: string;
  placeholder?: 'blur' | 'empty';
}

export default function CDNImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  onError,
  onLoad,
  fallbackSrc,
  sizes,
  placeholder = 'empty',
  ...props
}: CDNImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [isGif, setIsGif] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifLoaded, setGifLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [userAgent, setUserAgent] = useState('');
  
  // Detect if the image is a GIF
  useEffect(() => {
    const isGifImage = src.toLowerCase().includes('.gif') || 
                      currentSrc.toLowerCase().includes('.gif');
    setIsGif(isGifImage);
    
    if (process.env.NODE_ENV === 'development' && isGifImage) {
      console.log('🎬 GIF detected:', src);
    }
  }, [src, currentSrc]);
  
  useEffect(() => {
    setIsClient(true);
    const checkDevice = () => {
      const width = window.innerWidth;
      const ua = navigator.userAgent;
      setIsMobile(width <= 768);
      setIsTablet(width > 768 && width <= 1024);
      setUserAgent(ua);
      
      // Enhanced mobile logging
      if (width <= 768) {
        if (process.env.NODE_ENV === 'development') {
            console.log('📱 Mobile device detected:', {
            width,
            userAgent: ua,
            platform: navigator.platform,
            vendor: navigator.vendor,
          connection: (navigator as any).connection?.effectiveType || 'unknown'
          });
        }
      }
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Intersection Observer for GIF lazy loading
  useEffect(() => {
    if (!isGif || !isClient || priority) {
      setShowGif(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShowGif(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image is visible
        threshold: 0.1
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => observer.disconnect();
  }, [isGif, isClient, priority]);

  // Generate optimized image URL
  const getOptimizedUrl = (originalUrl: string, targetWidth?: number, targetHeight?: number) => {
    // If it's already an optimized URL, return as is
    if (originalUrl.includes('/api/optimized-images/')) {
      return originalUrl;
    }
    
    // For large images, use optimized endpoint
    const largeImages = [
      'you-are-my-world.gif',
      'HowBoutYou.gif', 
      'autumn.gif',
      'WIldandfreecover-copy-2.png',
      'alandace.gif',
      'doerfel-verse-idea-9.png',
      'SatoshiStreamer-track-1-album-art.png',
      'dvep15-art.png',
      'disco-swag.png',
      'first-christmas-art.jpg',
      'let-go-art.png'
    ];
    
    const filename = originalUrl.split('/').pop();
    if (filename && largeImages.some(img => filename.includes(img.replace(/\.(png|jpg|gif)$/, '')))) {
      const optimizedFilename = largeImages.find(img => filename.includes(img.replace(/\.(png|jpg|gif)$/, '')));
      if (optimizedFilename) {
        let optimizedUrl = `https://re.podtards.com/api/optimized-images/${optimizedFilename}`;
        
        // Add size parameters for responsive loading
        if (targetWidth || targetHeight) {
          const params = new URLSearchParams();
          if (targetWidth) params.set('w', targetWidth.toString());
          if (targetHeight) params.set('h', targetHeight.toString());
          params.set('q', quality.toString());
          
          // Use WebP for better compression if supported (but not for GIFs)
          if (typeof window !== 'undefined' && window.navigator.userAgent.includes('Chrome') && !isGif) {
            params.set('f', 'webp');
          }
          
          optimizedUrl += `?${params.toString()}`;
        }
        
        return optimizedUrl;
      }
    }
    
    return originalUrl;
  };

  const getResponsiveSizes = () => {
    if (sizes) return sizes;
    
    // For GIFs, use smaller sizes to improve performance
    if (isGif) {
      if (isMobile) {
        return '(max-width: 768px) 200px, (max-width: 1024px) 300px, 400px';
      } else if (isTablet) {
        return '(max-width: 1024px) 300px, 400px';
      } else {
        return '(max-width: 768px) 200px, (max-width: 1024px) 300px, 400px';
      }
    }
    
    if (isMobile) {
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
    } else if (isTablet) {
      return '(max-width: 1024px) 50vw, 33vw';
    } else {
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
    }
  };

  const getImageDimensions = () => {
    if (width && height) {
      return { width, height };
    }
    
    // For GIFs, use smaller dimensions to improve performance
    if (isGif) {
      if (isMobile) {
        return { width: 200, height: 200 };
      } else if (isTablet) {
        return { width: 300, height: 300 };
      } else {
        return { width: 400, height: 400 };
      }
    }
    
    // Default dimensions for mobile optimization
    if (isMobile) {
      return { width: 300, height: 300 };
    } else if (isTablet) {
      return { width: 400, height: 400 };
    } else {
      return { width: 500, height: 500 };
    }
  };

  const getOriginalUrl = (imageUrl: string) => {
    if (imageUrl.includes('/api/optimized-images/')) {
      // Extract original URL from optimized URL
      const filename = imageUrl.split('/').pop()?.split('?')[0];
      if (filename) {
        // This is a simplified fallback - in practice, you'd need a mapping
        return fallbackSrc || imageUrl;
      }
    }
    return fallbackSrc || imageUrl;
  };

  const handleError = () => {
    // Only log in development mode to improve production performance
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[CDNImage] Failed to load (attempt ${retryCount + 1}):`, currentSrc);
      console.warn(`[CDNImage] Device info - Mobile: ${isMobile}, Width: ${window?.innerWidth}, UserAgent: ${userAgent.substring(0, 100)}`);
      console.log(`[CDNImage] Debug - retryCount: ${retryCount}, fallbackSrc: ${fallbackSrc}, isMobile: ${isMobile}, currentSrc: ${currentSrc}`);
      console.log(`[CDNImage] Retry conditions - retryCount === 0: ${retryCount === 0}, fallbackSrc && fallbackSrc !== currentSrc: ${fallbackSrc && fallbackSrc !== currentSrc}`);
      console.log(`[CDNImage] Retry conditions - retryCount === 1: ${retryCount === 1}, isMobile: ${isMobile}, !currentSrc.includes('/api/'): ${!currentSrc.includes('/api/')}`);
    }
    setIsLoading(false);
    
    // Clear timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    
    // First try the fallback URL if provided and different
    if (retryCount === 0 && fallbackSrc && fallbackSrc !== currentSrc) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[CDNImage] Trying fallback URL:', fallbackSrc);
      }
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
      setRetryCount(1);
      
      // Set timeout for fallback (shorter for GIFs)
      const timeout = setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[CDNImage] Fallback URL timeout');
        }
        handleError();
      }, isGif ? 8000 : 10000); // 8 second timeout for GIFs, 10 for others
      setTimeoutId(timeout);
      return;
    }
    
    // If fallbackSrc is the same as currentSrc, skip to proxy attempt
    if (retryCount === 0 && fallbackSrc === currentSrc) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[CDNImage] Fallback URL is same as current, trying proxy directly');
      }
      setRetryCount(1);
      handleError();
      return;
    }
    
    // Try image proxy for CORS errors (all devices)
    if (retryCount === 1 && !currentSrc.includes('/api/')) {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(currentSrc)}`;
      if (process.env.NODE_ENV === 'development') {
        console.log('[CDNImage] Trying image proxy for CORS fallback:', proxyUrl);
      }
      setCurrentSrc(proxyUrl);
      setHasError(false);
      setIsLoading(true);
      setRetryCount(2);
      
      // Set timeout for proxy (shorter for GIFs)
      const timeout = setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[CDNImage] Image proxy timeout');
        }
        handleError();
      }, isGif ? 10000 : 12000); // 10 second timeout for GIFs, 12 for others
      setTimeoutId(timeout);
      return;
    }
    
    // Then try without optimization
    if (retryCount === 2 && currentSrc.includes('/api/optimized-images/')) {
      const originalUrl = getOriginalUrl(currentSrc);
      if (originalUrl && originalUrl !== currentSrc) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[CDNImage] Trying without optimization:', originalUrl);
        }
        setCurrentSrc(originalUrl);
        setHasError(false);
        setIsLoading(true);
        setRetryCount(3);
        
        // Set timeout for original URL (shorter for GIFs)
        const timeout = setTimeout(() => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[CDNImage] Original URL timeout');
          }
          handleError();
        }, isGif ? 12000 : 15000); // 12 second timeout for GIFs, 15 for others
        setTimeoutId(timeout);
        return;
      }
    }
    
    // All retry attempts have failed - only now call onError and show placeholder
    if (process.env.NODE_ENV === 'development') {
      console.log('[CDNImage] All attempts failed, showing placeholder');
      console.log(`[CDNImage] Final debug - retryCount: ${retryCount}, isMobile: ${isMobile}, currentSrc: ${currentSrc}`);
    }
    setHasError(true);
    onError?.(); // Only call onError after all retries have failed
  };

  const handleLoad = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CDNImage] Image loaded successfully:', currentSrc);
      if (isGif) {
        console.log('🎬 GIF loaded successfully');
      }
    }
    setIsLoading(false);
    setHasError(false);
    setGifLoaded(true);
    
    // Clear timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    
    onLoad?.();
  };

  // Reset state when src changes
  useEffect(() => {
    const dims = getImageDimensions();
    let imageSrc = src;
    
    // Mobile-first approach: bypass optimization, go straight to proxy if external
    if (isClient && isMobile) {
      // For mobile, if it's an external URL, use proxy immediately
      if (src && !src.includes('re.podtards.com') && !src.includes('/api/')) {
        imageSrc = `/api/proxy-image?url=${encodeURIComponent(src)}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('[CDNImage] Mobile using proxy directly:', imageSrc);
        }
      } else {
        // For internal URLs, use as-is or with light optimization
        imageSrc = getOptimizedUrl(src, dims.width, dims.height);
        if (process.env.NODE_ENV === 'development') {
          console.log('[CDNImage] Mobile using optimized:', imageSrc);
        }
      }
    } else {
      imageSrc = getOptimizedUrl(src, dims.width, dims.height);
    }
    
    setCurrentSrc(imageSrc);
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
    setGifLoaded(false);
    
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [src, width, height, isClient]); // Removed isMobile and isTablet from dependencies

  // Handle mobile-specific timeouts separately
  useEffect(() => {
    if (isMobile && isClient && isLoading && !timeoutId) {
      const timeout = setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[CDNImage] Mobile load timeout after 15s, src:', currentSrc);
        }
        handleError();
      }, isGif ? 12000 : 15000); // 12 second timeout for GIFs on mobile, 15 for others
      setTimeoutId(timeout);
    }
  }, [isClient, isLoading, timeoutId, isGif]); // Removed isMobile from dependencies to prevent infinite loops

  const dims = getImageDimensions();

  return (
    <div className={`relative ${className || ''}`} ref={imageRef}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800/50 animate-pulse rounded flex items-center justify-center">
          <div className="w-6 h-6 bg-white/20 rounded-full animate-spin"></div>
          {isGif && (
            <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
              🎬 GIF
            </div>
          )}
        </div>
      )}
      
      {hasError && (
        <div className="absolute inset-0 bg-gray-800/50 rounded flex items-center justify-center">
          <div className="text-white/60 text-sm">Image unavailable</div>
        </div>
      )}
      
      {isClient && isMobile ? (
        // Enhanced mobile image handling
        <img
          src={showGif ? currentSrc : ''}
          alt={alt}
          width={dims.width}
          height={dims.height}
          className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${className || ''}`}
          onError={(e) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('[CDNImage] Mobile image load error:', {
                src: currentSrc,
                originalSrc: src,
                error: e,
                retryCount,
                isMobile,
                isGif
              });
            }
            handleError();
          }}
          onLoad={(e) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('[CDNImage] Mobile image loaded successfully:', currentSrc);
            }
            handleLoad();
          }}
          loading={priority ? 'eager' : 'lazy'}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          style={{ 
            objectFit: 'cover',
            width: '100%',
            height: '100%',
            display: 'block'
          }}
          {...props}
        />
      ) : (
        // Use Next.js Image for desktop with full optimization
        <Image
          src={showGif ? currentSrc : ''}
          alt={alt}
          width={dims.width}
          height={dims.height}
          className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          priority={priority}
          quality={quality}
          sizes={getResponsiveSizes()}
          onError={handleError}
          onLoad={handleLoad}
          placeholder={placeholder}
          unoptimized={currentSrc.includes('/api/optimized-images/')} // Don't double-optimize
          {...props}
        />
      )}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded opacity-0 hover:opacity-100 transition-opacity">
          {currentSrc.includes('/api/optimized-images/') ? '🖼️ Optimized' : '📡 Original'}
          {isMobile && ' 📱'}
          {isGif && ' 🎬'}
        </div>
      )}
    </div>
  );
} 