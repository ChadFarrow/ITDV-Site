# ITDV Site

A modern Next.js music streaming platform with RSS feed integration, designed to aggregate and stream music from various independent artists and publishers.

## 🎵 Features

- **RSS Feed Integration**: Automatically parses and aggregates music from RSS feeds
- **Real-time Streaming**: Stream audio content with modern web audio APIs
- **Responsive Design**: Optimized for desktop and mobile devices
- **PWA Support**: Progressive Web App with offline capabilities
- **Admin Panel**: Comprehensive admin interface for feed management
- **CDN Integration**: Optimized image and audio delivery
- **Android TWA**: Trusted Web Activity for native Android app experience

## 🚀 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Audio**: Web Audio API, MediaSession API
- **PWA**: Service Workers, Web App Manifest
- **Mobile**: Capacitor, Android TWA
- **Deployment**: Vercel, PM2

## 📁 Project Structure

```
ITDV Site/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── album/             # Album detail pages
│   ├── admin/             # Admin interface
│   └── publisher/         # Publisher pages
├── components/            # React components
├── lib/                   # Utility libraries
├── data/                  # Feed data and assets
├── scripts/               # Build and deployment scripts
├── android-twa/           # Android TWA configuration
└── public/                # Static assets
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ChadFarrow/ITDV-Site.git
cd ITDV-Site
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
# Edit .env.local with your configuration
```

4. Run the development server:
```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

## 📱 Mobile App

### Android TWA

The project includes Android TWA (Trusted Web Activity) support for a native app experience:

```bash
cd android-twa
./build-apk.sh
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### Manual Deployment

```bash
npm run build
npm run deploy
```

## 📊 Admin Features

- Feed management and monitoring
- Cache control and optimization
- Performance monitoring
- RSS feed validation and testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🎯 Roadmap

- [ ] Enhanced mobile experience
- [ ] Advanced audio controls
- [ ] Social features
- [ ] Analytics dashboard
- [ ] Multi-language support

## 📞 Support

For support and questions, please open an issue on GitHub.

---

Built with ❤️ for independent music 