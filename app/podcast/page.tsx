'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, ExternalLink, Mic } from 'lucide-react';

interface PodcastEpisode {
  title: string;
  description: string;
  duration: string;
  url: string;
  date: string;
  image?: string;
}

export default function PodcastPage() {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sample podcast episodes - you can replace these with actual RSS feed data
  const sampleEpisodes: PodcastEpisode[] = [
    {
      title: "Episode 1: Welcome to the Doerfel-Verse",
      description: "Join us as we kick off the Into the Doerfel-Verse podcast, exploring music, family, and everything in between.",
      duration: "45:23",
      url: "https://www.doerfelverse.com/feeds/intothedoerfelverse.xml",
      date: "2024-01-15",
      image: "https://www.doerfelverse.com/art/carol-of-the-bells.png"
    },
    {
      title: "Episode 2: Behind the Music",
      description: "A deep dive into the creative process behind some of our favorite songs and albums.",
      duration: "52:18",
      url: "https://www.doerfelverse.com/feeds/intothedoerfelverse.xml",
      date: "2024-01-22",
      image: "https://www.doerfelverse.com/art/carol-of-the-bells.png"
    },
    {
      title: "Episode 3: Family Jam Sessions",
      description: "Stories from our family jam sessions and how music brings us together.",
      duration: "38:45",
      url: "https://www.doerfelverse.com/feeds/intothedoerfelverse.xml",
      date: "2024-01-29",
      image: "https://www.doerfelverse.com/art/carol-of-the-bells.png"
    }
  ];

  useEffect(() => {
    // Simulate loading podcast episodes
    setTimeout(() => {
      setEpisodes(sampleEpisodes);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handlePlayEpisode = (episode: PodcastEpisode) => {
    // Open the RSS feed in a new tab for now
    // In the future, this could open an embedded player
    window.open(episode.url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Music</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Podcast Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Mic className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Into the Doerfel-Verse Podcast</h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Join the Doerfel family as we explore music, share stories, and dive into the creative process behind our songs.
          </p>
          <div className="mt-6">
            <a 
              href="https://www.doerfelverse.com/feeds/intothedoerfelverse.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Subscribe to RSS Feed
            </a>
          </div>
        </div>

        {/* Episodes */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Latest Episodes</h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 animate-pulse">
                  <div className="h-6 bg-gray-700/50 rounded mb-3"></div>
                  <div className="h-4 bg-gray-700/50 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700/50 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {episodes.map((episode, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 hover:bg-white/10 transition-colors">
                  <div className="flex items-start gap-4">
                    {episode.image && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={episode.image} 
                          alt={episode.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-2">{episode.title}</h3>
                      <p className="text-gray-300 text-sm mb-3">{episode.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{new Date(episode.date).toLocaleDateString()}</span>
                        <span>{episode.duration}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handlePlayEpisode(episode)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      <span>Listen</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">About the Podcast</h3>
            <p className="text-gray-300 mb-4">
              Into the Doerfel-Verse is a family podcast where we share the stories behind our music, 
              discuss our creative process, and give you a behind-the-scenes look at what it&apos;s like 
              to make music as a family.
            </p>
            <p className="text-gray-300">
              Subscribe to our RSS feed to get notified when new episodes are released, or check back 
              here for the latest episodes and updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 