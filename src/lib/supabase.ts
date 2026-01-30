import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Some features may not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for THE-FIVE table
export interface ShelfData {
  id?: string;
  created_at?: string;
  books: BookData[];
  theme: 'magazine' | 'gallery';
  category?: 'identity' | 'recommend';
}

export interface BookData {
  id: number;
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
