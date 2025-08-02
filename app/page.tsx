'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getVersionString } from '@/lib/version';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setIsLoading(false);
  }, []);

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Bloodshot Lies Album Art Background */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/bloodshot-lies-big.png"
          alt="Bloodshot Lies Album Art"
          fill
          className="object-cover w-full h-full"
          priority
        />
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Content overlay */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b backdrop-blur-sm bg-black/30 pt-6" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="container mx-auto px-6 py-2">
            {/* Mobile Header */}
            <div className="block sm:hidden mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                    aria-label="Toggle menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div className="w-10 h-10 relative border border-gray-700 rounded-lg overflow-hidden">
                    <Image 
                      src="/logo.webp" 
                      alt="Doerfelverse Logo" 
                      width={40} 
                      height={40}
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
                <Link 
                  href="/about" 
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span className="text-sm">About</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Link>
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold mb-1">Into the Doerfel-Verse</h1>
                <div className="text-xs bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-500/30">
                  Beta - Admin interface available at /admin/feeds
                </div>
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden sm:block mb-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute left-0 flex items-center gap-4">
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                    aria-label="Toggle menu"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <div className="w-10 h-10 relative border border-gray-700 rounded-lg overflow-hidden">
                    <Image 
                      src="/logo.webp" 
                      alt="Doerfelverse Logo" 
                      width={40} 
                      height={40}
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
                <div className="text-center">
                  <h1 className="text-3xl font-bold mb-1">Into the Doerfel-Verse</h1>
                  <div className="text-xs bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-500/30 inline-block">
                    Beta - Admin interface available at /admin/feeds
                  </div>
                </div>
                <div className="absolute right-0">
                  <Link 
                    href="/about" 
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline">About this site</span>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Status */}
            {isClient && (
              <div className="flex items-center gap-2 text-sm">
                {error ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    <span className="text-red-400">{error}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    <span className="text-green-400">Site ready - admin features available</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        
        {/* Sidebar */}
        <div className={`fixed top-0 left-0 h-full w-80 bg-gray-900/95 backdrop-blur-sm transform transition-transform duration-300 z-30 border-r border-gray-700 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 pt-16 flex flex-col h-full">
            <h2 className="text-lg font-bold mb-4">Menu</h2>
            
            <div className="mb-4 space-y-1">
              <Link 
                href="/about" 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">About & Support</span>
              </Link>
              
              <Link 
                href="/admin/feeds" 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm">Admin Panel</span>
              </Link>
            </div>
            
            <div className="mt-auto pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Version</span>
                <span className="text-xs text-gray-400 font-mono">{getVersionString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Main Content */}
        <div className="container mx-auto px-3 sm:px-6 py-6 sm:py-8 pb-28">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <LoadingSpinner 
                size="large"
                text="Loading site..."
                showProgress={false}
              />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4 text-red-400">Error Loading Site</h2>
              <p className="text-gray-400">{error}</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-8 border border-white/10">
                <h2 className="text-3xl font-bold mb-6">Welcome to Into the Doerfel-Verse</h2>
                <p className="text-gray-300 text-lg mb-8">
                  A music streaming platform for The Doerfels and family. 
                  The admin interface is now available for band members to manage RSS feeds.
                </p>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <Link 
                    href="/admin/feeds"
                    className="group p-6 bg-blue-600/20 border border-blue-500/30 rounded-xl hover:bg-blue-600/30 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <h3 className="text-xl font-semibold text-blue-300 group-hover:text-blue-200">Admin Panel</h3>
                    </div>
                    <p className="text-gray-400 group-hover:text-gray-300">
                      Manage RSS feeds for music content. Password-protected access for band members.
                    </p>
                  </Link>
                  
                  <Link 
                    href="/about"
                    className="group p-6 bg-purple-600/20 border border-purple-500/30 rounded-xl hover:bg-purple-600/30 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-xl font-semibold text-purple-300 group-hover:text-purple-200">About</h3>
                    </div>
                    <p className="text-gray-400 group-hover:text-gray-300">
                      Learn more about this site and how to support The Doerfels.
                    </p>
                  </Link>
                </div>
                
                <div className="mt-8 p-4 bg-green-600/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-green-300">Site Status: Ready</h4>
                  </div>
                  <p className="text-green-200 text-sm">
                    Admin interface is functioning and ready for RSS feed management.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}