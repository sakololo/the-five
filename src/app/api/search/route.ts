import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Disable Next.js caching for this dynamic API route
export const dynamic = 'force-dynamic';

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

// Alias dictionary for popular manga (170+ entries)
const MANGA_ALIASES: Record<string, string> = {
  // ========================================
  // 週刊少年ジャンプ（歴代〜現在）
  // ========================================
  'ワンピ': 'ONE PIECE',
  'ワンピース': 'ONE PIECE',
  'わんぴーす': 'ONE PIECE',
  'キメツ': '鬼滅の刃',
  'きめつ': '鬼滅の刃',
  'ジュジュツ': '呪術廻戦',
  '呪術': '呪術廻戦',
  'じゅじゅつ': '呪術廻戦',
  'ヒロアカ': '僕のヒーローアカデミア',
  'ひろあか': '僕のヒーローアカデミア',
  'ハンター': 'HUNTER×HUNTER',
  'ハンタ': 'HUNTER×HUNTER',
  'HxH': 'HUNTER×HUNTER',
  'スラダン': 'SLAM DUNK',
  'スラムダンク': 'SLAM DUNK',
  'ジョジョ': 'ジョジョの奇妙な冒険',
  'JOJO': 'ジョジョの奇妙な冒険',
  'DB': 'ドラゴンボール',
  'ドラボ': 'ドラゴンボール',
  'ナルト': 'NARUTO',
  'NARUTO': 'NARUTO-ナルト-',
  'ブリーチ': 'BLEACH',
  'デスノ': 'DEATH NOTE',
  'デスノート': 'DEATH NOTE',
  '銀魂': '銀魂',
  'ぎんたま': '銀魂',
  'ハイキュー': 'ハイキュー!!',
  'ハイキュ': 'ハイキュー!!',
  'チェンソー': 'チェンソーマン',
  'チェンソーマン': 'チェンソーマン',
  'スパファミ': 'SPY×FAMILY',
  'スパイファミリー': 'SPY×FAMILY',
  'アンデラ': 'アンデッドアンラック',
  'マッシュル': 'マッシュル-MASHLE-',
  'サカモト': 'SAKAMOTO DAYS',
  'サカモトデイズ': 'SAKAMOTO DAYS',
  '逃げ若': '逃げ上手の若君',
  'にげわか': '逃げ上手の若君',
  'アオハコ': 'アオのハコ',
  'あおはこ': 'アオのハコ',
  'アクタ': 'アクタージュ',
  '約ネバ': '約束のネバーランド',
  'ドクスト': 'Dr.STONE',
  'ドクターストーン': 'Dr.STONE',
  '黒バス': '黒子のバスケ',
  'くろバス': '黒子のバスケ',
  'テニプリ': 'テニスの王子様',
  'るろ剣': 'るろうに剣心',
  'るろうに': 'るろうに剣心',
  'ワンパン': 'ワンパンマン',
  'モブサイコ': 'モブサイコ100',
  'ボルト': 'BORUTO',

  // ========================================
  // マガジン・サンデー・チャンピオン
  // ========================================
  'シンゲキ': '進撃の巨人',
  '進撃': '進撃の巨人',
  '東リベ': '東京卍リベンジャーズ',
  '東京リベンジャーズ': '東京卍リベンジャーズ',
  'とうりべ': '東京卍リベンジャーズ',
  'フリーレン': '葬送のフリーレン',
  'ふりーれん': '葬送のフリーレン',
  'コナン': '名探偵コナン',
  'めいたんてい': '名探偵コナン',
  '五等分': '五等分の花嫁',
  'ごとうぶん': '五等分の花嫁',
  'ブルロ': 'ブルーロック',
  'ブルーロック': 'ブルーロック',
  '七つの大罪': '七つの大罪',
  'ななつ': '七つの大罪',
  'フェアリーテイル': 'FAIRY TAIL',
  'FT': 'FAIRY TAIL',
  'ダイヤのA': 'ダイヤのA',
  'ダイヤ': 'ダイヤのA',
  '弱ペダ': '弱虫ペダル',
  'よわペダ': '弱虫ペダル',
  '刃牙': '刃牙',
  'バキ': '刃牙',
  'グラップラー': 'グラップラー刃牙',
  'はじめの一歩': 'はじめの一歩',
  'いっぽ': 'はじめの一歩',

  // ========================================
  // 青年誌（ヤンジャン・モーニング・アフタヌーン等）
  // ========================================
  'キングダム': 'キングダム',
  'きんぐだむ': 'キングダム',
  '金カム': 'ゴールデンカムイ',
  'ゴールデンカムイ': 'ゴールデンカムイ',
  '推しの子': '【推しの子】',
  'おしのこ': '【推しの子】',
  'かぐや': 'かぐや様は告らせたい',
  'かぐや様': 'かぐや様は告らせたい',
  '宇宙兄弟': '宇宙兄弟',
  'うちゅうきょうだい': '宇宙兄弟',
  'ブルーピリオド': 'ブルーピリオド',
  'ブルピリ': 'ブルーピリオド',
  'ヒストリエ': 'ヒストリエ',
  '寄生獣': '寄生獣',
  'きせいじゅう': '寄生獣',
  'ベルセルク': 'ベルセルク',
  'バガボンド': 'バガボンド',
  'リアル': 'リアル',
  'GANTZ': 'GANTZ',
  'ガンツ': 'GANTZ',
  '3月のライオン': '3月のライオン',
  'さんがつ': '3月のライオン',
  'ライオン': '3月のライオン',
  'ダンジョン飯': 'ダンジョン飯',
  'ダン飯': 'ダンジョン飯',
  '乙嫁': '乙嫁語り',
  'よつばと': 'よつばと!',
  'よつば': 'よつばと!',
  '文スト': '文豪ストレイドッグス',
  'ぶんすと': '文豪ストレイドッグス',
  'アオアシ': 'アオアシ',
  'あおあし': 'アオアシ',
  'もやしもん': 'もやしもん＋',
  'モヤシモン': 'もやしもん＋',
  '農大': 'もやしもん＋',
  'カイジ': '賭博黙示録カイジ',

  // ========================================
  // なろう系・Web発・ラノベ原作
  // ========================================
  '転スラ': '転生したらスライムだった件',
  'てんすら': '転生したらスライムだった件',
  'リゼロ': 'Re:ゼロから始める異世界生活',
  'りぜろ': 'Re:ゼロから始める異世界生活',
  'このすば': 'この素晴らしい世界に祝福を!',
  'コノスバ': 'この素晴らしい世界に祝福を!',
  '無職': '無職転生',
  '無職転生': '無職転生 ～異世界行ったら本気だす～',
  'ダンまち': 'ダンジョンに出会いを求めるのは間違っているだろうか',
  'ダンマチ': 'ダンジョンに出会いを求めるのは間違っているだろうか',
  '陰実': '陰の実力者になりたくて!',
  'かげじつ': '陰の実力者になりたくて!',
  'シャンフロ': 'シャングリラ・フロンティア',
  'シャングリラ': 'シャングリラ・フロンティア',
  'オバロ': 'オーバーロード',
  'オーバーロード': 'オーバーロード',
  '盾勇者': '盾の勇者の成り上がり',
  '盾': '盾の勇者の成り上がり',
  'デスマ': 'デスマーチからはじまる異世界狂想曲',
  'SAO': 'ソードアート・オンライン',
  'ソードアート': 'ソードアート・オンライン',
  '俺ガイル': 'やはり俺の青春ラブコメはまちがっている。',
  'はまち': 'やはり俺の青春ラブコメはまちがっている。',

  // ========================================
  // 少女マンガ・女性向け
  // ========================================
  'フルバ': 'フルーツバスケット',
  'フルーツバスケット': 'フルーツバスケット',
  '暁のヨナ': '暁のヨナ',
  'よな': '暁のヨナ',
  '花男': '花より男子',
  'はなだん': '花より男子',
  'ちはやふる': 'ちはやふる',
  'ちはや': 'ちはやふる',
  '薬屋': '薬屋のひとりごと',
  'くすりや': '薬屋のひとりごと',
  'マオマオ': '薬屋のひとりごと',
  '君に届け': '君に届け',
  'きみとどけ': '君に届け',
  'NANA': 'NANA',
  'なな': 'NANA-ナナ-',
  'アオハライド': 'アオハライド',
  'あおはらいど': 'アオハライド',
  'のだめ': 'のだめカンタービレ',
  'のだめカンタービレ': 'のだめカンタービレ',
  '夏目': '夏目友人帳',
  'なつめ': '夏目友人帳',
  'ミステリ': 'ミステリと言う勿れ',
  'バナナフィッシュ': 'BANANA FISH',
  'バナナ': 'BANANA FISH',
  'ホリミヤ': 'ホリミヤ',
  'ほりみや': 'ホリミヤ',
  '着せ恋': 'その着せ替え人形は恋をする',
  'きせこい': 'その着せ替え人形は恋をする',
  'ビスクドール': 'その着せ替え人形は恋をする',

  // ========================================
  // スクエニ・ガンガン系
  // ========================================
  'ハガレン': '鋼の錬金術師',
  '鋼の錬金術師': '鋼の錬金術師',
  'エヴァ': '新世紀エヴァンゲリオン',
  'EVA': '新世紀エヴァンゲリオン',
  'エヴァンゲリオン': '新世紀エヴァンゲリオン',
  '黒執事': '黒執事',
  'くろしつじ': '黒執事',
  'ソウルイーター': 'SOUL EATER',
  '野崎くん': '月刊少女野崎くん',
  'のざきくん': '月刊少女野崎くん',

  // ========================================
  // 英語・全角・表記揺れ
  // ========================================
  'onepiece': 'ONE PIECE',
  'one piece': 'ONE PIECE',
  'naruto': 'NARUTO-ナルト-',
  'bleach': 'BLEACH',
  'haikyuu': 'ハイキュー!!',
  'deathnote': 'DEATH NOTE',
  'death note': 'DEATH NOTE',
  'hunterxhunter': 'HUNTER×HUNTER',
  'hunter x hunter': 'HUNTER×HUNTER',
  'jujutsukaisen': '呪術廻戦',
  'kimetsu': '鬼滅の刃',
  'demon slayer': '鬼滅の刃',
  'attack on titan': '進撃の巨人',
  'aot': '進撃の巨人',
  'spy family': 'SPY×FAMILY',
  'spyfamily': 'SPY×FAMILY',
  'chainsawman': 'チェンソーマン',
  'chainsaw man': 'チェンソーマン',
  'csm': 'チェンソーマン',
  'jjk': '呪術廻戦',
  'mha': '僕のヒーローアカデミア',
  'bnha': '僕のヒーローアカデミア',

  // ========================================
  // クラシック・レジェンド作品
  // ========================================
  'アトム': '鉄腕アトム',
  '鉄腕アトム': '鉄腕アトム',
  'ブラックジャック': 'ブラック・ジャック',
  'BJ': 'ブラック・ジャック',
  '火の鳥': '火の鳥',
  'ドラえもん': 'ドラえもん',
  'どらえもん': 'ドラえもん',
  'タッチ': 'タッチ',
  'あだち': 'タッチ',
  '北斗の拳': '北斗の拳',
  'ほくと': '北斗の拳',
  'キャプ翼': 'キャプテン翼',
  'キャプテン翼': 'キャプテン翼',
  'シティハンター': 'シティーハンター',
  'CH': 'シティーハンター',

  // ========================================
  // 最新・話題作
  // ========================================
  'ウィンドブレイカー': 'WIND BREAKER',
  'ウィンブレ': 'WIND BREAKER',
  '防風': 'WIND BREAKER',
  'メダリスト': 'メダリスト',
  'めだリスト': 'メダリスト',
  'カグラバチ': 'カグラバチ',
  'かぐらばち': 'カグラバチ',
  'チ。': 'チ。-地球の運動について-',
  'チ': 'チ。-地球の運動について-',
  '地動説': 'チ。-地球の運動について-',
  'ルリドラゴン': 'ルリドラゴン',
  'るりドラゴン': 'ルリドラゴン',
  'あかね噺': 'あかね噺',
  'あかねばなし': 'あかね噺',
  '怪獣8号': '怪獣8号',
  'かいじゅう8': '怪獣8号',
  'カイジュウ8号': '怪獣8号',
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

// Fetch ISBN from Google Books API
async function fetchIsbnFromGoogle(query: string): Promise<string | null> {
  const googleApiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!googleApiKey) {
    console.warn('GOOGLE_BOOKS_API_KEY is not set, skipping Google search');
    return null;
  }

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1&key=${googleApiKey}`;
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      console.warn(`Google Books API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const items = data.items;

    if (!items || items.length === 0) {
      return null;
    }

    const volumeInfo = items[0]?.volumeInfo;
    const identifiers = volumeInfo?.industryIdentifiers;

    if (!identifiers) {
      return null;
    }

    // Prefer ISBN-13
    const isbn13 = identifiers.find((id: { type: string; identifier: string }) => id.type === 'ISBN_13');
    if (isbn13) {
      console.log(`Google Books found ISBN-13: ${isbn13.identifier} for query "${query}"`);
      return isbn13.identifier;
    }

    // Fallback to ISBN-10
    const isbn10 = identifiers.find((id: { type: string; identifier: string }) => id.type === 'ISBN_10');
    if (isbn10) {
      console.log(`Google Books found ISBN-10: ${isbn10.identifier} for query "${query}"`);
      return isbn10.identifier;
    }

    return null;
  } catch (error) {
    console.warn('Google Books API call failed:', error);
    return null;
  }
}

// Fetch books from Rakuten API by title (with keyword fallback)
async function fetchBooksByKeyword(
  appId: string,
  query: string
): Promise<Record<string, unknown>[]> {
  // First try title search (more accurate)
  const titleParams = new URLSearchParams({
    applicationId: appId,
    format: 'json',
    hits: '20',
    sort: 'sales', // 売上順（人気順）
    booksGenreId: '001001', // コミック
    outOfStockFlag: '1', // 在庫切れも含む
    title: query,
  });

  const titleUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${titleParams.toString()}`;

  const titleResponse = await fetch(titleUrl, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });

  if (titleResponse.ok) {
    const data = await titleResponse.json();
    const items = data.Items || [];

    if (items.length > 0) {
      return items;
    }
  }

  // Fallback to keyword search if title search finds nothing

  const keywordParams = new URLSearchParams({
    applicationId: appId,
    format: 'json',
    hits: '20',
    sort: 'sales',
    booksGenreId: '001001',
    outOfStockFlag: '1',
    keyword: query,
  });

  const keywordUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${keywordParams.toString()}`;

  const keywordResponse = await fetch(keywordUrl, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',
  });

  if (!keywordResponse.ok) {
    console.error(`Rakuten API keyword search error: ${keywordResponse.status}`);
    return [];
  }

  const data = await keywordResponse.json();
  const items = data.Items || [];

  // Filter keyword results to only include items where query appears in title
  // This prevents unrelated results like "ONE PIECE" appearing for "もやしもん" search
  const queryPrefix = query.slice(0, 2).toLowerCase();
  const filteredItems = items.filter((item: Record<string, unknown>) => {
    const bookItem = item.Item as Record<string, unknown>;
    const title = String(bookItem?.title || '').toLowerCase();
    return title.includes(queryPrefix) || title.includes(query.toLowerCase());
  });

  return filteredItems;
}

// Fetch books from Rakuten API by ISBN
async function fetchBooksByIsbn(
  appId: string,
  isbn: string
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    applicationId: appId,
    format: 'json',
    isbn: isbn,
  });

  const apiUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`;

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    console.warn(`Rakuten API ISBN search error: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const items = data.Items || [];
  console.log(`[DEBUG] ISBN search for "${isbn}" found ${items.length} items, first: "${items[0]?.Item?.title || 'none'}"`);
  return items;
}

// Legacy function for backward compatibility (title/author search)
async function fetchBooks(
  appId: string,
  searchType: 'title' | 'author',
  query: string
): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    applicationId: appId,
    format: 'json',
    hits: '30',
    sort: 'sales',
    booksGenreId: '001001', // コミック
  });

  params.append(searchType, query);

  const apiUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?${params.toString()}`;

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Rakuten API error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Rakuten API error: ${response.status}`);
  }

  const data = await response.json();
  return data.Items || [];
}

// Transform and deduplicate books
function transformBooks(items: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const books: Record<string, unknown>[] = [];

  // 除外キーワード（BOX、セットのみ除外する形に緩和）
  // 完全版、愛蔵版、新装版などは「そのバージョンの本」として有効なため除外しない
  const excludeKeywords = ['BOX', 'セット'];

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

// Search Logging Logic
async function logFailedSearch(query: string, ip: string, userAgent: string) {
  try {
    const { error } = await supabase
      .from('search_logs')
      .insert({
        query: query,
        ip: ip, // Hashed or raw depending on privacy policy, kept raw for now as per internal use
        user_agent: userAgent,
      });

    if (error) {
      console.warn('Failed to log search:', error.message);
    }
  } catch (err) {
    console.warn('Error in logFailedSearch:', err);
  }
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

  console.log(`Search API Request: query="${query}", genre="${genre}", ip="${ip}"`);

  if (!query && !genre) {
    return NextResponse.json(
      { error: 'Search query or genre is required' },
      { status: 400 }
    );
  }

  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) {
    console.warn('RAKUTEN_APP_ID is not set. Using local fallback.');
    return NextResponse.json({ books: [], warning: 'No API Key' });
  }

  try {
    // Normalize the query
    const normalizedQuery = normalizeQuery(query);
    const originalQuery = query.trim();

    // Step 1: Try to get ISBN from Google Books API (for better accuracy)
    const targetIsbn = await fetchIsbnFromGoogle(normalizedQuery);

    // Step 2: Parallel search with Rakuten API
    const searchPromises: Promise<Record<string, unknown>[]>[] = [];

    // Request A: ISBN search (if we have an ISBN from Google)
    if (targetIsbn) {
      searchPromises.push(fetchBooksByIsbn(appId, targetIsbn));
    } else {
      searchPromises.push(Promise.resolve([]));
    }

    // Request B: Title/keyword search with normalized query
    searchPromises.push(fetchBooksByKeyword(appId, normalizedQuery));

    // Request C: Also search with original query if different from normalized
    // This handles cases where hiragana matches better than katakana
    if (originalQuery !== normalizedQuery && !MANGA_ALIASES[originalQuery]) {
      searchPromises.push(fetchBooksByKeyword(appId, originalQuery));
    } else {
      searchPromises.push(Promise.resolve([]));
    }

    const results = await Promise.all(searchPromises);
    const [isbnResults, normalizedResults, originalResults] = results;

    // Step 3: Combine results (ISBN match first, then normalized, then original)
    const allItems = [...isbnResults, ...normalizedResults, ...originalResults];

    // Transform and deduplicate
    const books = transformBooks(allItems);

    // Log if no results found
    if (books.length === 0 && query.trim().length > 0) {
      const userAgent = request.headers.get('user-agent') || 'unknown';
      await logFailedSearch(query, ip, userAgent);
    }

    // Sort: images first
    const sortedBooks = sortBooks(books);

    return NextResponse.json({
      books: sortedBooks,
      total: sortedBooks.length,
      normalizedQuery: normalizedQuery !== query ? normalizedQuery : undefined,
      googleIsbn: targetIsbn || undefined, // For debugging
    });

  } catch (error) {
    console.error('Search API error details:', error);
    return NextResponse.json({
      books: [],
      warning: 'Search failed, returning empty results'
    });
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
