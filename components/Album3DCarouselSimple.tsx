'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Maximize, Minimize, X } from 'lucide-react';

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

interface Album3DCarouselProps {
  albums: Album[];
  onPlay: (album: Album, e: React.MouseEvent | React.TouchEvent) => void;
  onExitFullscreen?: () => void;
}

export default function Album3DCarouselSimple({ albums, onPlay, onExitFullscreen }: Album3DCarouselProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const albumMeshesRef = useRef<any[]>([]);
  const frameIdRef = useRef<number>();
  const isInitializedRef = useRef(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isSceneReady, setIsSceneReady] = useState(false);

  // Set client state
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (albums.length > 0) {
      setSelectedAlbum(albums[currentIndex]);
    }
  }, [albums, currentIndex]);

  // Dynamic Three.js import with lazy loading
  const initThreeJS = useCallback(async () => {
    if (!isClient || !mountRef.current || isInitializedRef.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setLoadingProgress(5);
      
      // Dynamic import of Three.js with progress tracking
      const THREE = await import('three');
      setLoadingProgress(15);
      
      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);
      sceneRef.current = scene;

      // Camera setup
      const camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 8);
      cameraRef.current = camera;

      // Renderer setup with performance optimizations
      const renderer = new THREE.WebGLRenderer({ 
        antialias: window.devicePixelRatio < 2, // Only use antialiasing on non-retina displays
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current = renderer;

      mountRef.current.appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
      directionalLight.position.set(10, 10, 5);
      scene.add(directionalLight);

      // Create album meshes
      await createAlbumMeshes(THREE);

      // Start animation loop immediately
      animate();

      isInitializedRef.current = true;
      
      // Mark as not loading once scene is set up (textures load progressively)
      setTimeout(() => setIsLoading(false), 100);
    } catch (err) {
      console.error('Failed to initialize Three.js:', err);
      setError('Failed to load 3D carousel');
      setIsLoading(false);
    }
  }, [isClient, albums, currentIndex]);

  const createAlbumMeshes = async (THREE: any) => {
    if (!sceneRef.current || albums.length === 0) return;

    const meshes: any[] = [];
    const geometry = new THREE.PlaneGeometry(2, 2);
    const textureLoader = new THREE.TextureLoader();
    const albumCount = Math.min(albums.length, 20);

    // First pass: Create placeholder meshes immediately
    for (let i = 0; i < albumCount; i++) {
      const placeholderMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x222222,
        transparent: true,
        opacity: 0.5
      });
      const mesh = new THREE.Mesh(geometry, placeholderMaterial);
      mesh.userData = { albumIndex: i, album: albums[i], textureLoaded: false };

      // Position albums in a circle
      const radius = 6;
      const angle = (i / albums.length) * Math.PI * 2;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius;
      mesh.position.y = 0;
      mesh.lookAt(0, 0, 0);

      sceneRef.current.add(mesh);
      meshes.push(mesh);
    }

    albumMeshesRef.current = meshes;
    setIsSceneReady(true);
    setLoadingProgress(30);

    // Second pass: Load textures progressively (prioritize visible albums)
    const loadTexture = async (index: number) => {
      try {
        const texture = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Timeout')), 3000);
          
          textureLoader.load(
            albums[index].coverArt,
            (texture: any) => {
              clearTimeout(timeoutId);
              resolve(texture);
            },
            undefined,
            (error: any) => {
              clearTimeout(timeoutId);
              reject(error);
            }
          );
        });

        // Update the mesh with the loaded texture
        if (meshes[index] && meshes[index].material) {
          const newMaterial = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true,
          });
          meshes[index].material.dispose();
          meshes[index].material = newMaterial;
          meshes[index].userData.textureLoaded = true;
        }
      } catch (error) {
        console.warn(`Failed to load texture for album ${index}`);
        // Update to a better fallback color
        if (meshes[index] && meshes[index].material) {
          const fallbackMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333,
            transparent: true,
            opacity: 0.8
          });
          meshes[index].material.dispose();
          meshes[index].material = fallbackMaterial;
        }
      }
      
      setLoadingProgress(30 + ((index + 1) / albumCount) * 70);
    };

    // Load current album first, then nearby albums, then the rest
    const loadOrder: number[] = [];
    const current = currentIndex % albumCount;
    
    // Add current album
    loadOrder.push(current);
    
    // Add nearby albums (2 on each side)
    for (let offset = 1; offset <= 2; offset++) {
      loadOrder.push((current + offset) % albumCount);
      loadOrder.push((current - offset + albumCount) % albumCount);
    }
    
    // Add remaining albums
    for (let i = 0; i < albumCount; i++) {
      if (!loadOrder.includes(i)) {
        loadOrder.push(i);
      }
    }

    // Load textures in priority order
    for (const index of loadOrder) {
      await loadTexture(index);
      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };

  const updateCarouselPositions = () => {
    if (!albumMeshesRef.current.length) return;

    const targetAngle = -(currentIndex / albums.length) * Math.PI * 2;
    
    albumMeshesRef.current.forEach((mesh: any, index: number) => {
      const radius = 6;
      const angle = (index / albums.length) * Math.PI * 2 + targetAngle;
      
      const targetX = Math.cos(angle) * radius;
      const targetZ = Math.sin(angle) * radius;
      
      // Smoother animation
      mesh.position.x += (targetX - mesh.position.x) * 0.15;
      mesh.position.z += (targetZ - mesh.position.z) * 0.15;
      
      mesh.lookAt(0, 0, 0);
      
      const isCurrent = index === currentIndex;
      const targetScale = isCurrent ? 1.2 : 1.0;
      mesh.scale.x += (targetScale - mesh.scale.x) * 0.1;
      mesh.scale.y += (targetScale - mesh.scale.y) * 0.1;
      mesh.scale.z += (targetScale - mesh.scale.z) * 0.1;
      
      if (mesh.material) {
        const targetOpacity = isCurrent ? 1.0 : 0.7;
        mesh.material.opacity += (targetOpacity - mesh.material.opacity) * 0.1;
      }
    });
  };

  const animate = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    updateCarouselPositions();
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    frameIdRef.current = requestAnimationFrame(animate);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : albums.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < albums.length - 1 ? prev + 1 : 0));
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      try {
        if (containerRef.current) {
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          }
          setIsFullscreen(true);
        }
      } catch (error) {
        console.error('Error entering fullscreen:', error);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
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
    } else if (e.key === 'Escape' && isFullscreen) {
      toggleFullscreen();
    }
  }, [isFullscreen]);

  // Handle window resize
  const handleResize = () => {
    if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('keydown', handleKeyboard);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleKeyboard]);

  useEffect(() => {
    if (albums.length > 0 && isClient) {
      initThreeJS();
    }

    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        try {
          if (rendererRef.current.domElement.parentNode === mountRef.current) {
            mountRef.current.removeChild(rendererRef.current.domElement);
          }
          rendererRef.current.dispose();
        } catch (e) {
          console.warn('Error cleaning up Three.js:', e);
        }
      }
      albumMeshesRef.current.forEach((mesh: any) => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      });
      isInitializedRef.current = false;
    };
  }, [initThreeJS]);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!albums.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">No albums to display</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              initThreeJS();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`w-full text-white overflow-hidden ${
        isFullscreen ? 'h-screen bg-black fixed inset-0 z-50' : 'h-screen bg-black'
      }`}
    >
      {/* Loading overlay with progress */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4"></div>
            <p className="text-white mb-2">Loading 3D carousel...</p>
            {loadingProgress > 0 && (
              <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3D Scene */}
      <div className="relative h-2/3">
        <div 
          ref={mountRef} 
          className="w-full h-full cursor-pointer"
        />

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

        {/* Current album info overlay */}
        {selectedAlbum && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center z-20">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-1">{selectedAlbum.title}</h3>
              <p className="text-sm text-gray-300">{selectedAlbum.artist}</p>
              <p className="text-xs text-gray-400">{new Date(selectedAlbum.releaseDate).getFullYear()}</p>
              <button
                onClick={(e) => onPlay(selectedAlbum, e)}
                className="mt-2 flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
              >
                <Play className="w-4 h-4" />
                <span className="text-sm">Play Album</span>
              </button>
            </div>
          </div>
        )}
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
            
            {/* Simplified Track List */}
            <div className="bg-black/30 rounded-lg overflow-hidden">
              <div className="max-h-40 overflow-y-auto p-4">
                {selectedAlbum.tracks.slice(0, 5).map((track, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer rounded px-2"
                    onClick={(e) => onPlay(selectedAlbum, e)}
                  >
                    <span className="truncate flex-1">{track.title}</span>
                    <span className="text-gray-400 ml-4">{track.duration}</span>
                  </div>
                ))}
                {selectedAlbum.tracks.length > 5 && (
                  <div className="text-center text-gray-400 text-xs mt-2">
                    +{selectedAlbum.tracks.length - 5} more tracks
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Album Counter and Help */}
      <div className="absolute bottom-4 left-4 text-center">
        <div className="text-sm text-gray-400 mb-2">
          {currentIndex + 1} of {albums.length}
        </div>
        <div className="text-xs text-gray-500">
          ← → arrows • F for fullscreen
        </div>
      </div>
    </div>
  );
}