import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const hasCredentials = supabaseUrl && supabaseAnonKey;

if (!hasCredentials) {
  console.warn('Supabase credentials not configured. Some features may not work.');
}

// Prevent crash on module load if credentials are missing
export const supabase = hasCredentials
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
    from: () => {
      console.error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      return {
        select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }),
      };
    }
  } as any;

// Types for THE-FIVE table
export interface ShelfData {
  id?: string;
  created_at?: string;
  books: BookData[];
  theme: 'magazine' | 'gallery';
  category?: 'identity' | 'recommend';
}

export interface BookData {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  volume: number;
  itemUrl?: string;
}

// Save shelf to Supabase
export async function saveShelf(
  books: BookData[],
  theme: 'magazine' | 'gallery',
  category: 'identity' | 'recommend' = 'identity'
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('THE-FIVE')
      .insert({
        books,
        theme,
        category,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving shelf:', error);
      throw error;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Failed to save shelf:', error);
    throw error;
  }
}

// Get shelf by ID
export async function getShelf(id: string): Promise<ShelfData | null> {
  try {
    const { data, error } = await supabase
      .from('THE-FIVE')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching shelf:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch shelf:', error);
    return null;
  }
}
