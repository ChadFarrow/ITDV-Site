// Color extraction and manipulation utilities for dynamic backgrounds

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface ExtractedColors {
  dominant: string;
  palette: ColorPalette;
  isDark: boolean;
}

// Extract dominant colors from an image using Canvas API
export const extractColorsFromImage = async (imageUrl: string): Promise<ExtractedColors> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set canvas size (smaller for performance)
        canvas.width = 100;
        canvas.height = 100;
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Analyze colors
        const colors: { [key: string]: number } = {};
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Skip very light or very dark pixels
          const brightness = (r + g + b) / 3;
          if (brightness < 20 || brightness > 235) continue;
          
          // Quantize colors to reduce noise
          const quantizedR = Math.floor(r / 32) * 32;
          const quantizedG = Math.floor(g / 32) * 32;
          const quantizedB = Math.floor(b / 32) * 32;
          
          const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
          colors[colorKey] = (colors[colorKey] || 0) + 1;
        }
        
        // Find dominant color
        let maxCount = 0;
        let dominantColor = '';
        
        for (const [color, count] of Object.entries(colors)) {
          if (count > maxCount) {
            maxCount = count;
            dominantColor = color;
          }
        }
        
        if (!dominantColor) {
          // Fallback to a neutral color
          dominantColor = '64,64,64';
        }
        
        const [r, g, b] = dominantColor.split(',').map(Number);
        const palette = generateColorPalette(r, g, b);
        const isDark = isColorDark(r, g, b);
        
        resolve({
          dominant: `rgb(${r}, ${g}, ${b})`,
          palette,
          isDark
        });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
};

// Generate a color palette based on a dominant color
const generateColorPalette = (r: number, g: number, b: number): ColorPalette => {
  const hsl = rgbToHsl(r, g, b);
  
  // Create variations
  const primary = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  const secondary = `hsl(${hsl.h}, ${Math.max(0, hsl.s - 20)}%, ${Math.min(100, hsl.l + 10)}%)`;
  const accent = `hsl(${(hsl.h + 30) % 360}, ${hsl.s}%, ${hsl.l}%)`;
  
  // Create background gradient
  const background = `linear-gradient(135deg, 
    hsl(${hsl.h}, ${hsl.s}%, ${Math.max(0, hsl.l - 40)}%) 0%, 
    hsl(${hsl.h}, ${Math.max(0, hsl.s - 30)}%, ${Math.max(0, hsl.l - 60)}%) 100%)`;
  
  // Determine text color based on background brightness
  const text = hsl.l > 50 ? '#000000' : '#ffffff';
  
  return {
    primary,
    secondary,
    accent,
    background,
    text
  };
};

// Convert RGB to HSL
const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    
    h /= 6;
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

// Check if a color is dark
const isColorDark = (r: number, g: number, b: number): boolean => {
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
};

// Create a smooth gradient background from album art colors
export const createAlbumBackground = (colors: ExtractedColors): string => {
  const { dominant, palette } = colors;
  
  // Extract RGB values from dominant color
  const rgbMatch = dominant.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!rgbMatch) return palette.background;
  
  const [, r, g, b] = rgbMatch.map(Number);
  const hsl = rgbToHsl(r, g, b);
  
  // Create a more sophisticated gradient
  return `linear-gradient(135deg, 
    hsl(${hsl.h}, ${Math.min(100, hsl.s + 20)}%, ${Math.max(5, hsl.l - 50)}%) 0%, 
    hsl(${hsl.h}, ${hsl.s}%, ${Math.max(5, hsl.l - 30)}%) 25%, 
    hsl(${(hsl.h + 15) % 360}, ${Math.max(0, hsl.s - 10)}%, ${Math.max(5, hsl.l - 40)}%) 75%, 
    hsl(${(hsl.h + 30) % 360}, ${Math.max(0, hsl.s - 20)}%, ${Math.max(5, hsl.l - 60)}%) 100%)`;
};

// Create a subtle overlay for better text readability
export const createTextOverlay = (colors: ExtractedColors): string => {
  const { isDark } = colors;
  
  if (isDark) {
    return 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.3) 100%)';
  } else {
    return 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.1) 100%)';
  }
};
