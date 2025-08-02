import { sql } from '@vercel/postgres';

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

export async function initializeDatabase() {
  try {
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

    // Create index for better query performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_feeds_status ON feeds(status);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_feeds_priority ON feeds(priority);
    `;

    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
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
    // Generate ID from URL
    const feedId = url.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    
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
    const result = await sql`
      DELETE FROM feeds WHERE id = ${feedId}
    `;
    
    if (result.rowCount && result.rowCount > 0) {
      return { success: true };
    }
    
    return { success: false, error: 'Feed not found' };
  } catch (error) {
    console.error('Failed to remove feed:', error);
    return { success: false, error: 'Database error occurred' };
  }
}

export async function seedDefaultFeeds(): Promise<void> {
  try {
    const defaultFeeds = [
      {
        id: 'www-doerfelverse-com-feeds-bloodshot-lies-album-xml',
        url: 'https://www.doerfelverse.com/feeds/bloodshot-lies-album.xml',
        type: 'album' as const,
        title: 'Bloodshot Lies - The Album'
      },
      {
        id: 'www-doerfelverse-com-feeds-think-ep-xml',
        url: 'https://www.doerfelverse.com/feeds/think-ep.xml',
        type: 'album' as const,
        title: 'Think EP'
      },
      {
        id: 'www-doerfelverse-com-feeds-ben-doerfel-xml',
        url: 'https://www.doerfelverse.com/feeds/ben-doerfel.xml',
        type: 'publisher' as const,
        title: 'Ben Doerfel Music'
      }
    ];

    for (const feed of defaultFeeds) {
      await sql`
        INSERT INTO feeds (id, original_url, type, title, priority, status)
        VALUES (${feed.id}, ${feed.url}, ${feed.type}, ${feed.title}, 'core', 'active')
        ON CONFLICT (id) DO NOTHING
      `;
    }

    console.log('Default feeds seeded successfully');
  } catch (error) {
    console.error('Failed to seed default feeds:', error);
  }
}