import { sql } from '@vercel/postgres';
import fs from 'fs/promises';
import path from 'path';

export interface DBFeed {
  id: string;
  original_url: string;
  type: 'album' | 'publisher';
  title: string;
  priority: 'core' | 'extended' | 'low';
  status: 'active' | 'inactive';
  added_at: Date;
  last_updated: Date;
}

export async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with feeds from feeds.json...');
    
    // Read feeds.json file
    const feedsPath = path.join(process.cwd(), 'data', 'feeds.json');
    const feedsData = await fs.readFile(feedsPath, 'utf8');
    const { feeds } = JSON.parse(feedsData);
    
    let seededCount = 0;
    
    for (const feed of feeds) {
      try {
        // Check if feed already exists
        const existing = await sql`
          SELECT id FROM feeds WHERE id = ${feed.id}
        `;
        
        if (existing.rows.length === 0) {
          // Insert new feed
          await sql`
            INSERT INTO feeds (id, original_url, type, title, priority, status, added_at, last_updated)
            VALUES (
              ${feed.id}, 
              ${feed.originalUrl}, 
              ${feed.type}, 
              ${feed.title}, 
              ${feed.priority}, 
              ${feed.status},
              ${feed.addedAt},
              ${feed.lastUpdated}
            )
          `;
          seededCount++;
          console.log(`✅ Seeded feed: ${feed.title}`);
        } else {
          console.log(`⏭️  Feed already exists: ${feed.title}`);
        }
      } catch (error) {
        console.error(`❌ Failed to seed feed ${feed.title}:`, error);
      }
    }
    
    console.log(`✅ Database seeding complete. ${seededCount} new feeds added.`);
    return seededCount;
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    throw error;
  }
}

export async function initializeDatabase(shouldSeed = true) {
  try {
    console.log('🔧 Initializing database...');
    
    // Create feeds table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS feeds (
        id VARCHAR(255) PRIMARY KEY,
        original_url TEXT NOT NULL UNIQUE,
        type VARCHAR(20) NOT NULL CHECK (type IN ('album', 'publisher')),
        title VARCHAR(500) NOT NULL,
        priority VARCHAR(20) NOT NULL CHECK (priority IN ('core', 'extended', 'low')),
        status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive')),
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    console.log('✅ Feeds table created/verified');

    // Create index for better query performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_feeds_status ON feeds(status);
    `;
    console.log('✅ Status index created/verified');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_feeds_priority ON feeds(priority);
    `;
    console.log('✅ Priority index created/verified');

    // Seed database if requested
    if (shouldSeed) {
      await seedDatabase();
    }

    console.log('✅ Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error; // Re-throw to surface the error
  }
}

export async function getAllFeeds(): Promise<DBFeed[]> {
  try {
    const result = await sql`
      SELECT * FROM feeds 
      WHERE status = 'active' 
      ORDER BY 
        CASE priority 
          WHEN 'core' THEN 1 
          WHEN 'extended' THEN 2 
          WHEN 'low' THEN 3 
        END,
        added_at ASC
    `;
    return result.rows as DBFeed[];
  } catch (error) {
    console.error('Failed to fetch feeds:', error);
    return [];
  }
}

export async function addFeed(url: string, type: 'album' | 'publisher', title?: string): Promise<{ success: boolean; error?: string; feed?: DBFeed }> {
  try {
    // Generate ID from URL - limit length and clean up
    let feedId = url.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    // Remove multiple consecutive dashes and trim
    feedId = feedId.replace(/-+/g, '-').replace(/^-|-$/g, '');
    // Limit to 200 characters to avoid database issues
    if (feedId.length > 200) {
      feedId = feedId.substring(0, 200).replace(/-$/, '');
    }
    
    // Default title if not provided
    const feedTitle = title || `Feed from ${new URL(url).hostname}`;
    
    const result = await sql`
      INSERT INTO feeds (id, original_url, type, title, priority, status)
      VALUES (${feedId}, ${url}, ${type}, ${feedTitle}, 'core', 'active')
      RETURNING *
    `;

    if (result.rows.length > 0) {
      return { success: true, feed: result.rows[0] as DBFeed };
    }
    
    return { success: false, error: 'Failed to insert feed' };
  } catch (error: any) {
    if (error?.message?.includes('duplicate key')) {
      return { success: false, error: 'Feed already exists' };
    }
    console.error('Failed to add feed:', error);
    return { success: false, error: 'Database error occurred' };
  }
}

export async function removeFeed(feedId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🗑️ Attempting to remove feed: ${feedId}`);
    
    const result = await sql`
      DELETE FROM feeds WHERE id = ${feedId}
    `;
    
    console.log(`📊 Delete result - Row count: ${result.rowCount}`);
    
    if (result.rowCount && result.rowCount > 0) {
      console.log(`✅ Successfully removed feed: ${feedId}`);
      return { success: true };
    }
    
    console.log(`❌ Feed not found: ${feedId}`);
    return { success: false, error: 'Feed not found' };
  } catch (error) {
    console.error('❌ Failed to remove feed:', error);
    return { success: false, error: 'Database error occurred' };
  }
}

// Default feeds functionality removed - database starts empty
// Users must manually add all RSS feeds they want