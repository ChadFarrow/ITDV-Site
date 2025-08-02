# ITDV-Site

A music streaming platform for independent artists, built with Next.js and Vercel Postgres.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your configuration
   # You'll need to add your Vercel Postgres database credentials:
   # POSTGRES_URL=postgresql://username:password@host:port/database
   ```

3. **Seed the database:**
   ```bash
   npm run seed-db
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run seed-db` - Seed database with feeds from feeds.json
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run dev-setup` - Check environment configuration

## Features

- RSS feed parsing for music albums
- Audio streaming with playlist support
- Responsive design for mobile and desktop
- PWA support for offline listening
- CDN integration for optimized asset delivery

## Architecture

- **Frontend**: Next.js 15 with TypeScript
- **Database**: Vercel Postgres
- **Styling**: Tailwind CSS
- **Audio**: Custom audio context with HLS.js support
- **Deployment**: Vercel
# Build verified Sat Aug  2 10:19:26 EDT 2025
# Force new deployment - Related Shows feature Sat Aug  2 10:22:42 EDT 2025
