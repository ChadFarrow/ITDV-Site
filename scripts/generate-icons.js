const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  // Path to your source image (you'll need to provide this)
  const sourceImage = process.argv[2];
  
  if (!sourceImage) {
    console.error('Please provide the source image path as an argument');
    console.error('Usage: node scripts/generate-icons.js <path-to-source-image>');
    process.exit(1);
  }

  if (!fs.existsSync(sourceImage)) {
    console.error(`Source image not found: ${sourceImage}`);
    process.exit(1);
  }

  const publicDir = path.join(__dirname, '..', 'public');

  // Define all icon sizes needed
  const iconSizes = [
    // Favicon sizes
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    
    // Apple touch icons
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'apple-touch-icon-76x76.png', size: 76 },
    { name: 'apple-touch-icon-120x120.png', size: 120 },
    { name: 'apple-touch-icon-144x144.png', size: 144 },
    { name: 'apple-touch-icon-152x152.png', size: 152 },
    
    // PWA icons
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
  ];

  console.log('Generating icons from:', sourceImage);

  for (const icon of iconSizes) {
    const outputPath = path.join(publicDir, icon.name);
    
    try {
      await sharp(sourceImage)
        .resize(icon.size, icon.size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${icon.name}:`, error.message);
    }
  }

  // Generate favicon.ico (multi-resolution)
  try {
    // For ICO, we'll use the 32x32 version as a base
    const favicon32Path = path.join(publicDir, 'favicon-32x32.png');
    const faviconIcoPath = path.join(publicDir, 'favicon.ico');
    
    // Note: Sharp doesn't directly support ICO format, so we'll copy the 32x32 PNG
    // In production, you might want to use a proper ICO converter
    console.log('Note: favicon.ico should be properly generated with an ICO converter for best results');
    console.log('      The 32x32 PNG has been created and can be converted to ICO format');
  } catch (error) {
    console.error('✗ Failed to handle favicon.ico:', error.message);
  }

  console.log('\n✅ Icon generation complete!');
  console.log('Note: You may need to manually convert favicon-32x32.png to favicon.ico using an online converter');
}

generateIcons().catch(console.error);