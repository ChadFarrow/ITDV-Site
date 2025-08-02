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
  style?: React.CSSProperties;
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
  style,
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
    const isGifImage = Boolean((src && typeof src === 'string' && src.toLowerCase().includes('.gif')) || 
                      (currentSrc && typeof currentSrc === 'string' && currentSrc.toLowerCase().includes('.gif')));
    setIsGif(isGifImage);
  }, [src, currentSrc]);
  
  useEffect(() => {
    setIsClient(true);
    const checkDevice = () => {
      const width = window.innerWidth;
      const ua = navigator.userAgent;
      setIsMobile(width <= 768);
      setIsTablet(width > 768 && width <= 1024);
      setUserAgent(ua);
      
      // Mobile detection without logging for performance
    };
    
    checkDevice();
    const handleResize = () => checkDevice();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    // Prevent recursion by checking if component is unmounted or src changed
    if (!src) return;
    
    // Minimal error handling for performance
    setIsLoading(false);
    
    // Clear timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    
    // First try the fallback URL if provided and different
    if (retryCount === 0 && fallbackSrc && fallbackSrc !== currentSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
      setRetryCount(1);
      return;
    }
    
    // If fallbackSrc is the same as currentSrc, skip to proxy attempt
    if (retryCount === 0 && fallbackSrc === currentSrc) {
      setRetryCount(1);
      return;
    }
    
    // Try image proxy for CORS errors (all devices)
    if (retryCount === 1 && !currentSrc.includes('/api/')) {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(currentSrc)}`;
      setCurrentSrc(proxyUrl);
      setHasError(false);
      setIsLoading(true);
      setRetryCount(2);
      return;
    }
    
    // Then try without optimization
    if (retryCount === 2 && currentSrc.includes('/api/optimized-images/')) {
      const originalUrl = getOriginalUrl(currentSrc);
      if (originalUrl && originalUrl !== currentSrc) {
        setCurrentSrc(originalUrl);
        setHasError(false);
        setIsLoading(true);
        setRetryCount(3);
        return;
      }
    }
    
    // All retry attempts have failed - only now call onError and show placeholder
    setHasError(true);
    onError?.(); // Only call onError after all retries have failed
  };

  const handleLoad = () => {
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
    if (!src) return;
    
    const dims = getImageDimensions();
    let imageSrc = src;
    
    // Mobile-first approach: bypass optimization, go straight to proxy if external
    if (isClient && isMobile) {
      // For mobile, if it's an external URL, use proxy immediately
      if (src && !src.includes('re.podtards.com') && !src.includes('/api/')) {
        imageSrc = `/api/proxy-image?url=${encodeURIComponent(src)}`;
      } else {
        // For internal URLs, use as-is or with light optimization
        imageSrc = getOptimizedUrl(src, dims.width, dims.height);
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
  }, [src, width, height, isClient, isMobile]); // Only run when src prop changes

  // Separate effect for handling timeouts to prevent recursion
  useEffect(() => {
    if (hasError || !isLoading || !currentSrc) return;
    
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    
    // Set timeout based on retry count and whether it's a GIF
    let timeout: NodeJS.Timeout;
    if (retryCount === 0) {
      // Initial load timeout
      timeout = setTimeout(() => handleError(), isGif ? 12000 : 15000);
    } else if (retryCount === 1) {
      // Fallback/proxy timeout
      timeout = setTimeout(() => handleError(), isGif ? 8000 : 10000);
    } else if (retryCount === 2) {
      // Proxy timeout
      timeout = setTimeout(() => handleError(), isGif ? 10000 : 12000);
    } else if (retryCount === 3) {
      // Original URL timeout
      timeout = setTimeout(() => handleError(), isGif ? 12000 : 15000);
    } else {
      // No more retries
      return;
    }
    
    setTimeoutId(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [currentSrc, retryCount, isLoading, hasError, isGif]); // Run when retry state changes

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
          onError={handleError}
          onLoad={handleLoad}
          loading={priority ? 'eager' : 'lazy'}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          style={{ 
            objectFit: 'cover',
            width: '100%',
            height: '100%',
            display: 'block',
            ...style
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
          style={style}
          {...props}
        />
      )}
      
      {/* Debug info removed for performance */}
    </div>
  );
} 