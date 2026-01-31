import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

// Alias dictionary for popular manga
const MANGA_ALIASES: Record<string, string> = {
  'ワンピ': 'ONE PIECE',
  'ワンピース': 'ONE PIECE',
  'スラダン': 'SLAM DUNK',
  'スラムダンク': 'SLAM DUNK',
  'DB': 'ドラゴンボール',
  'ドラボ': 'ドラゴンボール',
  'キメツ': '鬼滅の刃',
  'きめつ': '鬼滅の刃',
  'シンゲキ': '進撃の巨人',
  '進撃': '進撃の巨人',
  'ジュジュツ': '呪術廻戦',
  '呪術': '呪術廻戦',
  'スパイファミリー': 'SPY×FAMILY',
  'スパファミ': 'SPY×FAMILY',
  'フリーレン': '葬送のフリーレン',
  'チェンソー': 'チェンソーマン',
  'ナルト': 'NARUTO',
  'ブリーチ': 'BLEACH',
  'ハイキュー': 'ハイキュー!!',
  'ヒロアカ': '僕のヒーローアカデミア',
  'ハガレン': '鋼の錬金術師',
  'エヴァ': '新世紀エヴァンゲリオン',
  'ジョジョ': 'ジョジョの奇妙な冒険',
  'キングダム': 'キングダム',
  'コナン': '名探偵コナン',
  'ワンパン': 'ワンパンマン',
  'モブサイコ': 'モブサイコ100',
  'ハンター': 'HUNTER×HUNTER',
  'ハンタ': 'HUNTER×HUNTER',
  'るろ剣': 'るろうに剣心',
  'るろうに': 'るろうに剣心',
  'デスノ': 'DEATH NOTE',
  'デスノート': 'DEATH NOTE',
  '銀魂': '銀魂',
  'ぎんたま': '銀魂',
  'フルバ': 'フルーツバスケット',
  'ホリミヤ': 'ホリミヤ',
  'かぐや': 'かぐや様は告らせたい',
  '推しの子': '【推しの子】',
  'おしのこ': '【推しの子】',
  'アオアシ': 'アオアシ',
  'ブルロ': 'ブルーロック',
  'ブルーロック': 'ブルーロック',
  '東リベ': '東京卍リベンジャーズ',
  '東京リベンジャーズ': '東京卍リベンジャーズ',
  'カイジ': '賭博黙示録カイジ',
  'バキ': '刃牙',
  'グラップラー': 'グラップラー刃牙',
  'ベルセルク': 'ベルセルク',
  'バガボンド': 'バガボンド',
  'リアル': 'リアル',
  '宇宙兄弟': '宇宙兄弟',
  'ドクスト': 'Dr.STONE',
  'ドクターストーン': 'Dr.STONE',
  '約ネバ': '約束のネバーランド',
  '黒バス': '黒子のバスケ',
  'テニプリ': 'テニスの王子様',
  'マッシュル': 'マッシュル',
  'アンデラ': 'アンデッドアンラック',
  'サカモト': 'サカモトデイズ',
};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || (now - record.timestamp) > RATE_WINDOW) {
    requestCounts.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';

  // Allow localhost for development
  const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.NEXT_PUBLIC_SITE_URL || ''
  ].filter(Boolean);

  return allowedOrigins.some(allowed =>
    origin.startsWith(allowed) || referer.startsWith(allowed)
  ) || origin === '' && referer === ''; // Allow direct server calls
}

// Normalize search query
function normalizeQuery(query: string): string {
  let normalized = query.trim();

  // Convert half-width katakana to full-width
  normalized = normalized.replace(/[\uff66-\uff9f]/g, (char) => {
    const code = char.charCodeAt(0);
    return String.fromCharCode(code - 0xff66 + 0x30a2);
  });

  // Convert hiragana to katakana
  normalized = normalized.replace(/[\u3041-\u3096]/g, (char) => {
    return String.fromCharCode(char.charCodeAt(0) + 0x60);
  });

  // Check alias dictionary
  const aliasResult = MANGA_ALIASES[normalized] || MANGA_ALIASES[query.trim()];
  if (aliasResult) {
    return aliasResult;
  }

  return normalized;
}

// Fetch books from Rakuten API
async function fetchBooks(
  appId: string,
  searchType: 'title' | 'author',
  query: string
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    applicationId: appId,
    format: 'json',
    hits: '20',
    sort: 'sales',
    booksGenreId: '001001', // コミック
  });

  params.append(searchType, query);

  const apiUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`;

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Rakuten API error: ${response.status}`);
  }

  const data = await response.json();
  return data.Items || [];
}

// Transform and deduplicate books
function transformBooks(items: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const books: Record<string, unknown>[] = [];

  // 除外キーワード（完全版、愛蔵版など）
  const excludeKeywords = ['完全版', '愛蔵版', '新装版', 'BOX', 'セット', '特装版', '限定版', 'DX版'];

  for (const item of items) {
    const book = item.Item as Record<string, unknown>;
    const isbn = String(book.isbn || ''); // 数値変換を防ぐため明示的にString化
    const title = (book.title || '') as string;

    // 除外キーワードチェック
    if (excludeKeywords.some(keyword => title.includes(keyword))) {
      continue;
    }

    // Skip duplicates
    if (isbn && seen.has(isbn)) continue;
    if (isbn) seen.add(isbn);

    const coverUrl = (book.largeImageUrl || book.mediumImageUrl || book.smallImageUrl || '') as string;

    books.push({
      id: String(books.length + 1),
      title: title,
      author: book.author || '',
      publisher: book.publisherName || '',
      isbn: isbn || '',
      coverUrl: coverUrl,
      hasImage: !!coverUrl,
      volumeNumber: extractVolumeNumber(title),
    });
  }

  return books;
}

// Sort books: with images first, then without
function sortBooks(books: Record<string, unknown>[]): Record<string, unknown>[] {
  return books.sort((a, b) => {
    const aHasImage = a.hasImage as boolean;
    const bHasImage = b.hasImage as boolean;

    if (aHasImage && !bHasImage) return -1;
    if (!aHasImage && bHasImage) return 1;
    return 0;
  });
}

export async function GET(request: NextRequest) {
  // Validate origin
  if (!validateOrigin(request)) {
    return NextResponse.json(
      { error: 'Forbidden: Invalid origin' },
      { status: 403 }
    );
  }

  // Rate limiting
  const ip = getClientIP(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || '';

  if (!query && !genre) {
    return NextResponse.json(
      { error: 'Search query or genre is required' },
      { status: 400 }
    );
  }

  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) {
    console.error('RAKUTEN_APP_ID is not set');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    // Normalize the query
    const normalizedQuery = normalizeQuery(query);

    // Parallel search: title and author
    const [titleResults, authorResults] = await Promise.all([
      fetchBooks(appId, 'title', normalizedQuery),
      fetchBooks(appId, 'author', normalizedQuery),
    ]);

    // Merge and deduplicate results
    const allItems = [...titleResults, ...authorResults];
    const books = transformBooks(allItems);

    // Sort: images first
    const sortedBooks = sortBooks(books);

    return NextResponse.json({
      books: sortedBooks,
      total: sortedBooks.length,
      normalizedQuery: normalizedQuery !== query ? normalizedQuery : undefined,
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search books. Please try again.' },
      { status: 503 }
    );
  }
}

function extractVolumeNumber(title: string): number | null {
  if (typeof title !== 'string') return null;
  // Try multiple patterns for volume number extraction

  // Pattern 1: 括弧内の数字（全角・半角） e.g., "タイトル(1)" or "タイトル（1）"
  let match = title.match(/[(（](\d+)[)）]/);
  if (match) return parseInt(match[1], 10);

  // Pattern 2: スペース+数字 e.g., "タイトル 1" or "タイトル　1"
  match = title.match(/[\s　](\d+)$/);
  if (match) return parseInt(match[1], 10);

  // Pattern 3: 「巻」の前の数字 e.g., "タイトル 第1巻" or "タイトル1巻"
  match = title.match(/(\d+)[巻]/);
  if (match) return parseInt(match[1], 10);

  return null;
}
