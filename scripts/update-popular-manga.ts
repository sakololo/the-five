#!/usr/bin/env node

/**
 * Script to update popular manga data
 * Combines fixed popular titles (25) with dynamic popular titles (48) based on user selections
 * Fetches real book cover URLs from Rakuten API
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { FIXED_POPULAR_TITLES } from '../src/data/fixed-popular';
import * as fs from 'fs';

// Types
interface Book {
    id: string;
    title: string;
    reading?: string;
    author: string;
    genre: string;
    publisher: string;
    totalVolumes: number;
    coverUrl: string;
}

interface SelectionStats {
    title: string;
    count: number;
    uniqueUsers: number;
    score: number;
}

// Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Rakuten API credentials
const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;

/**
 * Fetch dynamic popular titles from Supabase
 */
async function fetchDynamicPopular(): Promise<string[]> {
    console.log('📊 Fetching user selection data from Supabase...');

    // Get data from past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
        .from('THE-FIVE')
        .select('books, user_identifier')
        .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) {
        console.error('❌ Error fetching from Supabase:', error);
        return [];
    }

    if (!data || data.length === 0) {
        console.log('⚠️  No selection data found in past 30 days');
        return [];
    }

    // Calculate statistics
    const stats: Map<string, { count: number; users: Set<string> }> = new Map();

    data.forEach((shelf) => {
        const books = shelf.books as any[];
        const userId = shelf.user_identifier || 'anonymous';

        books.forEach((book) => {
            const title = book.manga?.title || book.title;
            if (!title) return;

            // Skip fixed titles
            if (FIXED_POPULAR_TITLES.includes(title)) return;

            if (!stats.has(title)) {
                stats.set(title, { count: 0, users: new Set() });
            }

            const stat = stats.get(title)!;
            stat.count++;
            stat.users.add(userId);
        });
    });

    // Filter and score
    const scored: SelectionStats[] = [];
    stats.forEach((stat, title) => {
        const uniqueUsers = stat.users.size;

        // Qualification criteria
        if (stat.count >= 10 && uniqueUsers >= 3) {
            const score = stat.count * 0.7 + uniqueUsers * 0.3;
            scored.push({ title, count: stat.count, uniqueUsers, score });
        }
    });

    // Sort by score and take top 48
    scored.sort((a, b) => b.score - a.score);
    const topTitles = scored.slice(0, 48).map((s) => s.title);

    console.log(`✅ Found ${scored.length} qualifying titles, selected top ${topTitles.length}`);

    return topTitles;
}

/**
 * Fetch book data from Rakuten API
 */
async function fetchFromRakuten(title: string): Promise<Book | null> {
    if (!RAKUTEN_APP_ID) {
        console.error('❌ RAKUTEN_APP_ID not found in environment');
        return null;
    }

    try {
        // Use URLSearchParams like the working /api/search endpoint
        const params = new URLSearchParams({
            'applicationId': RAKUTEN_APP_ID,
            'format': 'json',
            'hits': '30', // Maximum allowed by Rakuten API
            'sort': 'sales',
            'booksGenreId': '001001', // コミック
            'title': title
        });

        const url = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`;

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(`❌ Rakuten API error for "${title}": ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (!data.Items || data.Items.length === 0) {
            console.warn(`⚠️  No results for "${title}"`);
            return null;
        }

        // Find the best match: prioritize series name match
        let bestMatch = null;

        // First try: exact series name match with volume 1
        for (const result of data.Items) {
            const item = result.Item;
            const seriesName = item.seriesName || '';
            const itemTitle = item.title || '';

            // Check if series name matches and it's volume 1
            if (seriesName.includes(title) || title.includes(seriesName.substring(0, Math.min(title.length, seriesName.length)))) {
                if (itemTitle.includes('1巻') || itemTitle.includes(' 1') || itemTitle.includes('（1）') || itemTitle.includes('１')) {
                    bestMatch = item;
                    break;
                }
            }
        }

        // Second try: just find volume 1 of any result
        if (!bestMatch) {
            bestMatch = data.Items.find((result: any) => {
                const itemTitle = result.Item?.title || '';
                return itemTitle.includes('1巻') || itemTitle.includes(' 1') || itemTitle.includes('（1）');
            })?.Item;
        }

        // Third try: just use first result
        if (!bestMatch) {
            bestMatch = data.Items[0].Item;
        }

        const item = bestMatch;

        return {
            id: item.itemCode || `rakuten-${Date.now()}`,
            title: title, // Use the search query as the title (e.g., "ワンピース")
            reading: item.titleKana || '',
            author: item.author || '',
            genre: '漫画',
            publisher: item.publisherName || '',
            totalVolumes: 1,
            coverUrl: item.largeImageUrl || item.mediumImageUrl || item.smallImageUrl || '',
        };
    } catch (error) {
        console.error(`❌ Error fetching "${title}":`, error);
        return null;
    }
}

/**
 * Fetch all manga data
 */
async function fetchAllMangaData(titles: string[]): Promise<Book[]> {
    console.log(`🔍 Fetching data for ${titles.length} titles from Rakuten API...`);

    const books: Book[] = [];

    for (let i = 0; i < titles.length; i++) {
        const title = titles[i];
        console.log(`  [${i + 1}/${titles.length}] Fetching "${title}"...`);

        const book = await fetchFromRakuten(title);
        if (book) {
            books.push(book);
        }

        // Rate limiting: wait 2000ms (2 seconds) between requests for safety
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(`✅ Successfully fetched ${books.length}/${titles.length} titles`);

    return books;
}

/**
 * Fill remaining slots with Rakuten popular manga
 */
async function fillWithRakutenPopular(currentCount: number, targetCount: number): Promise<Book[]> {
    const needed = targetCount - currentCount;
    if (needed <= 0) return [];

    console.log(`📚 Filling ${needed} remaining slots with Rakuten popular manga...`);

    // Fetch popular manga from Rakuten
    try {
        const url = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?applicationId=${RAKUTEN_APP_ID}&booksGenreId=001004&sort=sales&hits=${needed * 2}`;

        const response = await fetch(url);
        const data = await response.json();

        const books: Book[] = [];
        const seen = new Set<string>();

        for (const result of data.Items || []) {
            if (books.length >= needed) break;

            const item = result.Item;
            const title = item.seriesName || item.title;

            if (seen.has(title)) continue;
            seen.add(title);

            books.push({
                id: item.itemCode,
                title,
                reading: item.titleKana || '',
                author: item.author || '',
                genre: '漫画',
                publisher: item.publisherName || '',
                totalVolumes: 1,
                coverUrl: item.largeImageUrl || item.mediumImageUrl || item.smallImageUrl || '',
            });
        }

        console.log(`✅ Added ${books.length} popular manga from Rakuten`);
        return books;
    } catch (error) {
        console.error('❌ Error fetching popular manga:', error);
        return [];
    }
}

/**
 * Main update function
 */
async function updatePopularManga() {
    console.log('🚀 Starting popular manga update...\n');

    // 1. Get dynamic titles from Supabase
    const dynamicTitles = await fetchDynamicPopular();

    // 2. Combine with fixed titles
    const allTitles = [...FIXED_POPULAR_TITLES, ...dynamicTitles];
    console.log(`\n📋 Total titles: ${FIXED_POPULAR_TITLES.length} fixed + ${dynamicTitles.length} dynamic = ${allTitles.length}`);

    // 3. Fetch from Rakuten API
    const books = await fetchAllMangaData(allTitles);

    // 4. Fill remaining slots if needed
    if (books.length < 73) {
        const fillerBooks = await fillWithRakutenPopular(books.length, 73);
        books.push(...fillerBooks);
    }

    // 5. Save to JSON file
    const outputPath = path.join(process.cwd(), 'src', 'data', 'popular-manga.json');
    fs.writeFileSync(outputPath, JSON.stringify(books, null, 2), 'utf-8');

    console.log(`\n✅ Successfully saved ${books.length} manga to ${outputPath}`);
    console.log('🎉 Update complete!');
}

// Run the update
updatePopularManga().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
