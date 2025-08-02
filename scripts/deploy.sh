#!/bin/bash

# Deployment script for FUCKIT app to re.podtards.com
# This script helps deploy the Next.js app to your server

set -e

echo "🚀 Deploying FUCKIT app to re.podtards.com"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the project root."
    exit 1
fi

# Build the app
echo "📦 Building the app..."
npm run build

# Check if build was successful
if [ ! -d ".next" ]; then
    echo "❌ Error: Build failed. .next directory not found."
    exit 1
fi

echo "✅ Build completed successfully!"

# Create deployment package
echo "📁 Creating deployment package..."
DEPLOY_DIR="deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy necessary files
cp -r .next "$DEPLOY_DIR/"
cp -r public "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp package-lock.json "$DEPLOY_DIR/"
cp next.config.js "$DEPLOY_DIR/"
cp -r lib "$DEPLOY_DIR/"
cp -r components "$DEPLOY_DIR/"
cp -r app "$DEPLOY_DIR/"
cp -r types "$DEPLOY_DIR/"

# Create production environment file
cat > "$DEPLOY_DIR/.env.production" << EOF
# Production environment variables
NODE_ENV=production
BUNNY_CDN_HOSTNAME=re-podtards-cdn.b-cdn.net
BUNNY_CDN_ZONE=re-podtards-cdn
BUNNY_CDN_API_KEY=${BUNNY_CDN_API_KEY:-}
EOF

# Create PM2 ecosystem file for production
cat > "$DEPLOY_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'fuckit-app',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/re.podtards.com',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Create nginx configuration
cat > "$DEPLOY_DIR/nginx.conf" << EOF
server {
    listen 80;
    server_name re.podtards.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name re.podtards.com;
    
    # SSL configuration (you'll need to add your SSL certificates)
    # ssl_certificate /path/to/your/certificate.crt;
    # ssl_certificate_key /path/to/your/private.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Root directory
    root /var/www/re.podtards.com;
    
    # Proxy to Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Static files
    location /_next/static/ {
        alias /var/www/re.podtards.com/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Public files
    location /public/ {
        alias /var/www/re.podtards.com/public/;
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

# Create deployment instructions
cat > "$DEPLOY_DIR/DEPLOYMENT_INSTRUCTIONS.md" << EOF
# Deployment Instructions for re.podtards.com

## Prerequisites
- Node.js 18+ installed on your server
- PM2 installed globally: \`npm install -g pm2\`
- Nginx installed and configured
- SSL certificates for re.podtards.com

## Deployment Steps

### 1. Upload files to server
\`\`\`bash
# Upload the $DEPLOY_DIR folder to your server
scp -r $DEPLOY_DIR user@your-server:/tmp/
\`\`\`

### 2. On your server, set up the application
\`\`\`bash
# Create application directory
sudo mkdir -p /var/www/re.podtards.com
sudo chown \$USER:\$USER /var/www/re.podtards.com

# Move files to application directory
mv /tmp/$DEPLOY_DIR/* /var/www/re.podtards.com/

# Install dependencies
cd /var/www/re.podtards.com
npm install --production

# Set up environment variables
# Edit .env.production with your actual CDN API key
nano .env.production
\`\`\`

### 3. Configure Nginx
\`\`\`bash
# Copy nginx configuration
sudo cp /var/www/re.podtards.com/nginx.conf /etc/nginx/sites-available/re.podtards.com

# Enable the site
sudo ln -s /etc/nginx/sites-available/re.podtards.com /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
\`\`\`

### 4. Start the application with PM2
\`\`\`bash
cd /var/www/re.podtards.com
pm2 start ecosystem.config.js
pm2 save
pm2 startup
\`\`\`

### 5. Configure DNS
Add this CNAME record in your DNS provider:
\`\`\`
Type: CNAME
Name: re
Value: [your-server-ip]
TTL: 300
\`\`\`

## Verification
- Visit https://re.podtards.com
- Check that images are being served through your CDN
- Monitor logs: \`pm2 logs fuckit-app\`

## Troubleshooting
- Check PM2 status: \`pm2 status\`
- Check nginx logs: \`sudo tail -f /var/log/nginx/error.log\`
- Check application logs: \`pm2 logs fuckit-app\`
EOF

echo "✅ Deployment package created: $DEPLOY_DIR"
echo ""
echo "📋 Next steps:"
echo "1. Upload the $DEPLOY_DIR folder to your server"
echo "2. Follow the instructions in $DEPLOY_DIR/DEPLOYMENT_INSTRUCTIONS.md"
echo "3. Configure your DNS to point re.podtards.com to your server"
echo "4. Set up SSL certificates for HTTPS"
echo ""
echo "🌐 Your CDN is already configured to pull from https://re.podtards.com"
echo "   CDN URL: re-podtards-cdn.b-cdn.net" 