'use client';

// AI機能の有効/無効フラグ
const IS_AI_ENABLED = false;

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import * as htmlToImage from 'html-to-image';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Recommended manga for empty state
const RECOMMENDED_MANGA = [
  { title: 'ONE PIECE', author: '尾田栄一郎', category: '殿堂入りの名作' },
  { title: 'SLAM DUNK', author: '井上雄彦', category: '殿堂入りの名作' },
  { title: 'ドラゴンボール', author: '鳥山明', category: '殿堂入りの名作' },
  { title: '鬼滅の刃', author: '吾峠呼世晴', category: '人気作品' },
  { title: '進撃の巨人', author: '諫山創', category: '人気作品' },
  { title: '呪術廻戦', author: '芥見下々', category: '人気作品' },
  { title: 'SPY×FAMILY', author: '遠藤達哉', category: '人気作品' },
  { title: '葬送のフリーレン', author: '山田鐘人', category: '人気作品' },
  { title: 'チェンソーマン', author: '藤本タツキ', category: '人気作品' },
  { title: 'NARUTO', author: '岸本斉史', category: '殿堂入りの名作' },
  { title: 'BLEACH', author: '久保帯人', category: '殿堂入りの名作' },
  { title: 'ハイキュー!!', author: '古舘春一', category: '人気作品' },
];

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
  'ゴリラ': 'ゴリラーマン',
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
  '約束のネバーランド': '約束のネバーランド',
  '黒バス': '黒子のバスケ',
  'テニプリ': 'テニスの王子様',
  'マッシュル': 'マッシュル',
  'アンデラ': 'アンデッドアンラック',
  'サカモト': 'サカモトデイズ',
};

// Types
interface Book {
  id: number;
  title: string;
  reading: string; // ひらがな読み（検索用）
  author: string;
  coverUrl: string;
  genre: string;
  totalVolumes: number;
  coverColor: string;
  itemUrl?: string; // 楽天ブックスの販売ページURL
}

interface SelectedBook {
  manga: Book;
  volume: number;
}

interface AppraisalResult {
  soulTitle: string;
  analysis: string;
}

// ========================================
// 巻数検知ユーティリティ
// ========================================

// 特別版を示すキーワード（これらを含む場合は別タイトルとして扱う）
const SPECIAL_EDITION_KEYWORDS = [
  '完全版',
  '愛蔵版',
  '新装版',
  '文庫版',
  '豪華版',
  'ワイド版',
  'デラックス版',
];

// 巻数を検出する正規表現パターン
const VOLUME_PATTERNS = [
  /第(\d+)巻/,           // 第1巻
  /(\d+)巻/,             // 1巻
  /\((\d+)\)/,           // (1) 半角括弧
  /（(\d+)）/,           // （1） 全角括弧
  /vol\.?\s*(\d+)/i,     // vol.1, Vol 1
  /\s(\d+)$/,            // タイトル末尾の数字
];

// タイトルから巻数を抽出
function extractVolumeNumber(title: string): number | null {
  for (const pattern of VOLUME_PATTERNS) {
    const match = title.match(pattern);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

// ベースタイトル（巻数を除外した部分）を取得
function getBaseTitle(title: string): string {
  let baseTitle = title;
  // 巻数パターンを除去
  for (const pattern of VOLUME_PATTERNS) {
    baseTitle = baseTitle.replace(pattern, '').trim();
  }
  return baseTitle;
}

// タイトルが特別版かどうかをチェック
function isSpecialEdition(title: string): boolean {
  return SPECIAL_EDITION_KEYWORDS.some(keyword => title.includes(keyword));
}

// 検索結果を1巻に集約（同じベースタイトルの中で最も若い巻数のみを残す）
function consolidateToFirstVolume(manga: Book[]): Book[] {
  const titleMap = new Map<string, Book>();

  for (const book of manga) {
    const baseTitle = getBaseTitle(book.title);
    const volumeNum = extractVolumeNumber(book.title) ?? 1;
    const isSpecial = isSpecialEdition(book.title);

    // 特別版の場合は、ベースタイトルに特別版情報を含めて別タイトルとして扱う
    const mapKey = isSpecial ? book.title : baseTitle;

    const existing = titleMap.get(mapKey);
    if (!existing) {
      titleMap.set(mapKey, book);
    } else {
      const existingVolume = extractVolumeNumber(existing.title) ?? 1;
      // 通常版同士の場合のみ、最小巻数を優先
      if (!isSpecial && volumeNum < existingVolume) {
        titleMap.set(mapKey, book);
      }
    }
  }

  return Array.from(titleMap.values());
}

// 同じベースタイトルの全巻を取得
function getAllVolumesForTitle(baseTitle: string, allManga: Book[]): Book[] {
  return allManga
    .filter(book => getBaseTitle(book.title) === baseTitle)
    .sort((a, b) => {
      const volA = extractVolumeNumber(a.title) ?? 1;
      const volB = extractVolumeNumber(b.title) ?? 1;
      return volA - volB;
    });
}

// Mock manga data (same as mockup)
const MOCK_MANGA_DATA: Book[] = [
  { id: 1, title: "ワンピース", reading: "わんぴーす", author: "尾田栄一郎", genre: "少年", totalVolumes: 107, coverColor: "from-red-400 to-red-600", coverUrl: "https://placehold.co/150x220/ef4444/ffffff?text=ONE+PIECE" },
  { id: 2, title: "鬼滅の刃", reading: "きめつのやいば", author: "吾峠呼世晴", genre: "少年", totalVolumes: 23, coverColor: "from-teal-400 to-teal-600", coverUrl: "https://placehold.co/150x220/14b8a6/ffffff?text=鬼滅の刃" },
  { id: 3, title: "呪術廻戦", reading: "じゅじゅつかいせん", author: "芥見下々", genre: "少年", totalVolumes: 25, coverColor: "from-purple-400 to-purple-600", coverUrl: "https://placehold.co/150x220/a855f7/ffffff?text=呪術廻戦" },
  { id: 4, title: "SPY×FAMILY", reading: "すぱいふぁみりー", author: "遠藤達哉", genre: "少年", totalVolumes: 13, coverColor: "from-pink-400 to-rose-500", coverUrl: "https://placehold.co/150x220/ec4899/ffffff?text=SPY×FAMILY" },
  { id: 5, title: "進撃の巨人", reading: "しんげきのきょじん", author: "諫山創", genre: "少年", totalVolumes: 34, coverColor: "from-gray-600 to-gray-800", coverUrl: "https://placehold.co/150x220/4b5563/ffffff?text=進撃の巨人" },
  { id: 6, title: "チェンソーマン", reading: "ちぇんそーまん", author: "藤本タツキ", genre: "少年", totalVolumes: 16, coverColor: "from-orange-500 to-red-600", coverUrl: "https://placehold.co/150x220/f97316/ffffff?text=チェンソーマン" },
  { id: 7, title: "NARUTO", reading: "なると", author: "岸本斉史", genre: "少年", totalVolumes: 72, coverColor: "from-orange-400 to-orange-600", coverUrl: "https://placehold.co/150x220/fb923c/ffffff?text=NARUTO" },
  { id: 8, title: "BLEACH", reading: "ぶりーち", author: "久保帯人", genre: "少年", totalVolumes: 74, coverColor: "from-blue-500 to-indigo-600", coverUrl: "https://placehold.co/150x220/3b82f6/ffffff?text=BLEACH" },
  { id: 9, title: "ハイキュー!!", reading: "はいきゅー", author: "古舘春一", genre: "少年", totalVolumes: 45, coverColor: "from-orange-400 to-amber-500", coverUrl: "https://placehold.co/150x220/f59e0b/ffffff?text=ハイキュー!!" },
  { id: 10, title: "僕のヒーローアカデミア", reading: "ぼくのひーろーあかでみあ", author: "堀越耕平", genre: "少年", totalVolumes: 39, coverColor: "from-green-400 to-emerald-600", coverUrl: "https://placehold.co/150x220/22c55e/ffffff?text=ヒロアカ" },
  { id: 11, title: "君に届け", reading: "きみにとどけ", author: "椎名軽穂", genre: "少女", totalVolumes: 30, coverColor: "from-pink-300 to-pink-500", coverUrl: "https://placehold.co/150x220/f472b6/ffffff?text=君に届け" },
  { id: 12, title: "フルーツバスケット", reading: "ふるーつばすけっと", author: "高屋奈月", genre: "少女", totalVolumes: 23, coverColor: "from-violet-300 to-purple-500", coverUrl: "https://placehold.co/150x220/8b5cf6/ffffff?text=フルバ" },
  { id: 13, title: "NANA", reading: "なな", author: "矢沢あい", genre: "少女", totalVolumes: 21, coverColor: "from-rose-400 to-red-500", coverUrl: "https://placehold.co/150x220/f43f5e/ffffff?text=NANA" },
  { id: 14, title: "ベルセルク", reading: "べるせるく", author: "三浦建太郎", genre: "青年", totalVolumes: 41, coverColor: "from-slate-700 to-slate-900", coverUrl: "https://placehold.co/150x220/334155/ffffff?text=ベルセルク" },
  { id: 15, title: "GANTZ", reading: "がんつ", author: "奥浩哉", genre: "青年", totalVolumes: 37, coverColor: "from-gray-800 to-black", coverUrl: "https://placehold.co/150x220/1f2937/ffffff?text=GANTZ" },
  { id: 16, title: "AKIRA", reading: "あきら", author: "大友克洋", genre: "SF", totalVolumes: 6, coverColor: "from-red-600 to-red-800", coverUrl: "https://placehold.co/150x220/dc2626/ffffff?text=AKIRA" },
  { id: 17, title: "攻殻機動隊", reading: "こうかくきどうたい", author: "士郎正宗", genre: "SF", totalVolumes: 3, coverColor: "from-cyan-500 to-blue-600", coverUrl: "https://placehold.co/150x220/06b6d4/ffffff?text=攻殻機動隊" },
  { id: 18, title: "葬送のフリーレン", reading: "そうそうのふりーれん", author: "山田鐘人", genre: "ファンタジー", totalVolumes: 12, coverColor: "from-emerald-400 to-teal-500", coverUrl: "https://placehold.co/150x220/2dd4bf/ffffff?text=フリーレン" },
  { id: 19, title: "薬屋のひとりごと", reading: "くすりやのひとりごと", author: "日向夏", genre: "ファンタジー", totalVolumes: 11, coverColor: "from-amber-400 to-orange-500", coverUrl: "https://placehold.co/150x220/fbbf24/ffffff?text=薬屋" },
  { id: 20, title: "ホリミヤ", reading: "ほりみや", author: "萩原ダイスケ", genre: "恋愛", totalVolumes: 16, coverColor: "from-sky-400 to-blue-500", coverUrl: "https://placehold.co/150x220/38bdf8/ffffff?text=ホリミヤ" },
  // テスト用: 複数巻データ（1巻集約機能の動作確認用）
  { id: 21, title: "ハヤテのごとく！ 1巻", reading: "はやてのごとく", author: "畑健二郎", genre: "少年", totalVolumes: 52, coverColor: "from-lime-400 to-green-500", coverUrl: "https://placehold.co/150x220/84cc16/ffffff?text=ハヤテ+1" },
  { id: 22, title: "ハヤテのごとく！ 2巻", reading: "はやてのごとく", author: "畑健二郎", genre: "少年", totalVolumes: 52, coverColor: "from-lime-400 to-green-500", coverUrl: "https://placehold.co/150x220/84cc16/ffffff?text=ハヤテ+2" },
  { id: 23, title: "ハヤテのごとく！ 3巻", reading: "はやてのごとく", author: "畑健二郎", genre: "少年", totalVolumes: 52, coverColor: "from-lime-400 to-green-500", coverUrl: "https://placehold.co/150x220/84cc16/ffffff?text=ハヤテ+3" },
  { id: 24, title: "ハヤテのごとく！ 4巻", reading: "はやてのごとく", author: "畑健二郎", genre: "少年", totalVolumes: 52, coverColor: "from-lime-400 to-green-500", coverUrl: "https://placehold.co/150x220/84cc16/ffffff?text=ハヤテ+4" },
  { id: 25, title: "ハヤテのごとく！ 5巻", reading: "はやてのごとく", author: "畑健二郎", genre: "少年", totalVolumes: 52, coverColor: "from-lime-400 to-green-500", coverUrl: "https://placehold.co/150x220/84cc16/ffffff?text=ハヤテ+5" },
  { id: 26, title: "神のみぞ知るセカイ 第1巻", reading: "かみのみぞしるせかい", author: "若木民喜", genre: "少年", totalVolumes: 26, coverColor: "from-indigo-400 to-purple-500", coverUrl: "https://placehold.co/150x220/6366f1/ffffff?text=神のみ+1" },
  { id: 27, title: "神のみぞ知るセカイ 第2巻", reading: "かみのみぞしるせかい", author: "若木民喜", genre: "少年", totalVolumes: 26, coverColor: "from-indigo-400 to-purple-500", coverUrl: "https://placehold.co/150x220/6366f1/ffffff?text=神のみ+2" },
  { id: 28, title: "神のみぞ知るセカイ 第3巻", reading: "かみのみぞしるせかい", author: "若木民喜", genre: "少年", totalVolumes: 26, coverColor: "from-indigo-400 to-purple-500", coverUrl: "https://placehold.co/150x220/6366f1/ffffff?text=神のみ+3" },
];

const GENRES = ['all', '少年', '少女', '青年', 'SF', 'ファンタジー', '恋愛'];

// Mock AI appraisals - 平易化・構造固定・イジりしろ強化版
const MOCK_APPRAISALS: Record<string, { titles: string[]; analysis: string }> = {
  '少年': {
    titles: [
      '勝利を渇望する週刊少年の申し子',
      '友情を信じすぎる熱血バカ',
      '努力を愛する汗くさい理想主義者',
      '正義を叫ぶ声がデカい主人公体質',
      '仲間を集めたがる天性のリーダー気質'
    ],
    analysis: 'あなたは「熱い展開」と「仲間との絆」が大好物ですね。主人公が覚醒するシーンで涙しがち。現実でも周りを巻き込んで何かを始めたいタイプでは？'
  },
  '少女': {
    titles: [
      '恋愛を観察する壁の花',
      '感情移入しすぎて疲れる共感マシーン',
      '三角関係を楽しむ恋愛脳',
      'キュンを求めてさまよう乙女心',
      '推しカプを守りたい過保護オタク'
    ],
    analysis: 'あなたは人の気持ちの動きを追うのが得意（というか好き）ですね。「この二人くっつけ！」と叫びたくなるタイプ。友達の恋愛相談、よく受けません？'
  },
  '青年': {
    titles: [
      '闇を覗きたがる中二病サバイバー',
      '現実を直視しすぎて疲れる大人',
      '人間の業を味わいたいドM読者',
      '重いテーマを好む考えすぎ人間',
      'ダークサイドに惹かれる厨二の残り香'
    ],
    analysis: 'あなたは「綺麗事じゃない話」に惹かれますね。ハッピーエンドより、考えさせられるラストが好き。周りから「なんでそんな重い話好きなの？」と言われがち。'
  },
  'SF': {
    titles: [
      '未来を夢見る空想科学オタク',
      '可能性を追い求める浪漫主義者',
      'もしもの世界に逃避したい現実疲れ',
      '科学と哲学の間で迷子になりがちな人',
      'ディストピアを楽しむ悲観的楽観主義者'
    ],
    analysis: 'あなたは「現実にはない世界」を覗くのが好きですね。テクノロジーの話になると早口になりがち。「もし〇〇だったら」という話で1時間語れるタイプでは？'
  },
  'ファンタジー': {
    titles: [
      '異世界に転生したい現実逃避マスター',
      '冒険を夢見る安全地帯の住人',
      '魔法を信じたい大人になりきれない大人',
      'チート能力に憧れる努力嫌い',
      '世界観設定を語り出すと止まらないオタク'
    ],
    analysis: 'あなたは「ここではない世界」への憧れが強いですね。異世界モノで「俺だったらこうする」と妄想しがち。日常に刺激が足りないと感じていません？'
  },
  '恋愛': {
    titles: [
      '恋に恋する永遠の夢見がち',
      'ときめきを求めて三千里',
      '両思いを見届けたい幸せ配達人',
      'ラブコメで心を満たすロマンチスト',
      'すれ違いにヤキモキする情緒不安定読者'
    ],
    analysis: 'あなたは「人を好きになる気持ち」を大切にしていますね。告白シーンでドキドキしがち。実は自分も甘い展開に憧れているのでは？'
  },
  'mixed': {
    titles: [
      '何でも読む雑食系マンガ愛好家',
      'ジャンルを選ばない欲張りさん',
      '面白ければ何でもいい主義者',
      '本棚がカオスな読書家',
      '話題作は一通りチェックするミーハー'
    ],
    analysis: 'あなたは「面白い」が正義、ジャンルは気にしないタイプですね。友達におすすめを聞かれると困るほど守備範囲が広い。本棚を見せたら性格バレそう。'
  }
};

// Sortable Book Item Component for drag and drop
interface SortableBookItemProps {
  book: SelectedBook;
  index: number;
  mode: 'magazine' | 'gallery';
  onRemove: (index: number) => void;
}

function SortableBookItem({ book, index, mode, onRemove }: SortableBookItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${book.manga.id}-${book.volume}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const isFeatured = index === 2;
  const baseSize = isFeatured
    ? 'w-16 h-24 sm:w-24 sm:h-36 md:w-40 md:h-60'
    : 'w-12 h-20 sm:w-20 sm:h-30 md:w-32 md:h-48';

  // テーマ別の影スタイル
  const shadowStyle = mode === 'magazine'
    ? 'shadow-2xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)]'
    : 'shadow-lg hover:shadow-xl';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col items-center gap-2 relative group"
    >
      <div
        {...attributes}
        {...listeners}
        className={`${baseSize} bg-gradient-to-br ${book.manga.coverColor} rounded ${shadowStyle} hover:scale-105 hover:-translate-y-2 transition-all cursor-grab active:cursor-grabbing border-2 ${mode === 'magazine' ? 'border-white/30' : 'border-white'} overflow-hidden relative`}
      >
        <img src={book.manga.coverUrl} alt={book.manga.title} className="w-full h-full object-cover" />
        {/* Remove button - Always visible on mobile, hover on desktop */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 bg-white/90 hover:bg-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md z-10"
        >
          <span className="text-gray-700 text-[10px] sm:text-xs font-bold">×</span>
        </button>
      </div>
      <span className={`text-[9px] font-medium ${mode === 'magazine' ? 'text-white/60' : 'text-gray-400'}`}>{book.volume}巻</span>
    </div>
  );
}

export default function Home() {
  const [selectedBooks, setSelectedBooks] = useState<SelectedBook[]>([]);
  const [currentGenre, setCurrentGenre] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<'magazine' | 'gallery'>('gallery');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedManga, setSelectedManga] = useState<Book | null>(null);

  // Modal state
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);
  const [isAppraising, setIsAppraising] = useState(false);
  const [appraisalResult, setAppraisalResult] = useState<AppraisalResult | null>(null);
  const [displayedTitle, setDisplayedTitle] = useState('');

  // 2-step modal display: showDetails controls action buttons visibility
  const [showDetails, setShowDetails] = useState(false);

  // Preview image for responsive display
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Disclaimer modal
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Saving state for X share
  const [isSaving, setIsSaving] = useState(false);

  // Category state for shelf title
  const [category, setCategory] = useState<'identity' | 'recommend'>('identity');

  // API search state
  const [apiSearchResults, setApiSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedBooks((items) => {
        const oldIndex = items.findIndex(
          (item) => `${item.manga.id}-${item.volume}` === active.id
        );
        const newIndex = items.findIndex(
          (item) => `${item.manga.id}-${item.volume}` === over.id
        );
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Remove a book from selection
  const removeBook = (index: number) => {
    setSelectedBooks((prev) => prev.filter((_, i) => i !== index));
  };

  // Reset all selected books
  const resetSelection = () => {
    setSelectedBooks([]);
    showToastMessage('選択をリセットしました');
  };

  // Format soul title with line breaks for long titles
  // Pattern: [対象]を[動詞][肊書き] -> break before the title/肊書き
  const formatSoulTitle = (title: string) => {
    // If title is short enough, no need to break
    if (title.length <= 10) return title;

    // Common verb endings that might precede a title
    const verbPatterns = ['る', 'す', 'た', 'な', 'の'];

    // Try to find を and break after the verb that follows it
    const woIndex = title.indexOf('を');
    if (woIndex > 0 && woIndex < title.length - 3) {
      // Look for a verb ending after を
      for (let i = woIndex + 2; i < Math.min(woIndex + 6, title.length - 1); i++) {
        if (verbPatterns.includes(title[i])) {
          return (
            <>
              {title.slice(0, i + 1)}
              <br />
              {title.slice(i + 1)}
            </>
          );
        }
      }
      // If no verb found, break after を
      return (
        <>
          {title.slice(0, woIndex + 1)}
          <br />
          {title.slice(woIndex + 1)}
        </>
      );
    }

    // Try to break at the last の before a title-like suffix
    const lastNoIndex = title.lastIndexOf('の');
    if (lastNoIndex > 3 && lastNoIndex < title.length - 2) {
      return (
        <>
          {title.slice(0, lastNoIndex + 1)}
          <br />
          {title.slice(lastNoIndex + 1)}
        </>
      );
    }

    // Default: break at roughly 60% point
    const breakPoint = Math.floor(title.length * 0.6);
    return (
      <>
        {title.slice(0, breakPoint)}
        <br />
        {title.slice(breakPoint)}
      </>
    );
  };

  // Reset and close modal
  const resetAndCloseModal = () => {
    setShowAppraisalModal(false);
    setSelectedBooks([]);
    setAppraisalResult(null);
    // Scroll to search section
    setTimeout(() => {
      document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Share to X (Twitter)
  const shareToX = () => {
    if (!appraisalResult) return;

    // Truncate long titles to 12 characters
    const truncateTitle = (title: string, maxLen: number = 12) => {
      return title.length > maxLen ? title.slice(0, maxLen) + '…' : title;
    };

    const bookTitles = selectedBooks.map((b) => truncateTitle(b.manga.title)).join('\n・');
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const bookIds = selectedBooks.map((b) => `${b.manga.id}-${b.volume}`).join(',');
    const shareUrl = `${siteUrl}?books=${encodeURIComponent(bookIds)}&title=${encodeURIComponent(appraisalResult.soulTitle)}`;

    const text = `【鑑定完了】私の5冊はこれ！

・${bookTitles}

二つ名『${appraisalResult.soulTitle}』

▶ ${shareUrl}

#THE_FIVE #私を構成する5冊`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
  };

  // Filter manga - use API results when available, otherwise use mock data
  const filteredManga = (() => {
    // If we have API results, use them
    if (searchQuery.trim() && apiSearchResults.length > 0) {
      return apiSearchResults;
    }

    // Otherwise, filter mock data
    const basicFiltered = MOCK_MANGA_DATA.filter(manga => {
      const matchesGenre = currentGenre === 'all' || manga.genre === currentGenre;
      const matchesSearch = !searchQuery.trim() ||
        manga.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        manga.reading.toLowerCase().includes(searchQuery.toLowerCase()) ||
        manga.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGenre && matchesSearch;
    });

    // Step 2: 1巻に集約（同じタイトルの複数巻は1巻のみ表示）
    return consolidateToFirstVolume(basicFiltered);
  })();

  // API search function
  const performApiSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setApiSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      const books: Book[] = (data.books || []).map((book: { id?: number; title?: string; author?: string; coverUrl?: string; publisher?: string; volumeNumber?: number | null }, index: number) => ({
        id: book.id || 1000 + index,
        title: book.title || '',
        reading: '',
        author: book.author || '',
        genre: '検索結果',
        totalVolumes: book.volumeNumber || 1,
        coverColor: 'from-gray-400 to-gray-600',
        coverUrl: book.coverUrl || '',
        itemUrl: undefined,
      }));

      setApiSearchResults(books);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('検索に失敗しました');
      setApiSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performApiSearch(searchQuery);
      } else {
        setApiSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performApiSearch]);

  // Open drawer for volume selection
  const openDrawer = (manga: Book) => {
    setSelectedManga(manga);
    setDrawerOpen(true);
  };

  // Close drawer
  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedManga(null);
  };

  // Select a volume
  const selectVolume = (manga: Book, volume: number) => {
    const existingIndex = selectedBooks.findIndex(b => b.manga.id === manga.id && b.volume === volume);

    if (existingIndex !== -1) {
      setSelectedBooks(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      if (selectedBooks.length >= 5) {
        showToastMessage('最大5冊まで選択できます。');
        return;
      }
      setSelectedBooks(prev => [...prev, { manga, volume }]);
    }
    closeDrawer();
  };

  // Show toast
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Get dominant genre
  const getDominantGenre = () => {
    const genreCounts: Record<string, number> = {};
    selectedBooks.forEach(book => {
      genreCounts[book.manga.genre] = (genreCounts[book.manga.genre] || 0) + 1;
    });

    let maxCount = 0;
    let dominantGenre = 'mixed';
    for (const [genre, count] of Object.entries(genreCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantGenre = genre;
      }
    }
    return maxCount < 3 ? 'mixed' : dominantGenre;
  };

  // Start AI appraisal
  const startAppraisal = async () => {
    setShowAppraisalModal(true);
    setIsAppraising(true);
    setAppraisalResult(null);
    setDisplayedTitle('');
    setShowDetails(false);
    setPreviewImage(null);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    const dominantGenre = getDominantGenre();
    const appraisal = MOCK_APPRAISALS[dominantGenre];
    const soulTitle = appraisal.titles[Math.floor(Math.random() * appraisal.titles.length)];

    setAppraisalResult({ soulTitle, analysis: appraisal.analysis });
    setIsAppraising(false);

    // Generate preview image for responsive display
    setTimeout(async () => {
      const cardId = mode === 'magazine' ? 'share-card-full' : 'share-card-simple';
      const card = document.getElementById(cardId) as HTMLElement | null;
      if (!card) {
        console.error('Share card not found:', cardId);
        return;
      }

      try {
        // Make card visible for rendering
        card.style.visibility = 'visible';

        // Wait for images to load
        const images = card.querySelectorAll('img');
        await Promise.all(
          Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
              // Timeout after 3 seconds
              setTimeout(resolve, 3000);
            });
          })
        );

        // Small delay to ensure rendering is complete
        await new Promise(resolve => setTimeout(resolve, 200));

        const dataUrl = await htmlToImage.toPng(card, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: mode === 'gallery' ? '#FAF9F6' : '#1a1a2e',
          skipFonts: true,
          cacheBust: true,
        });

        // Hide card again
        card.style.visibility = 'hidden';

        setPreviewImage(dataUrl);
      } catch (e) {
        console.error('Preview generation failed:', e);

        // Hide card on error
        card.style.visibility = 'hidden';

        // Retry once
        setTimeout(async () => {
          try {
            card.style.visibility = 'visible';
            await new Promise(resolve => setTimeout(resolve, 300));

            const dataUrl = await htmlToImage.toPng(card, {
              quality: 0.8,
              pixelRatio: 2,
              backgroundColor: mode === 'gallery' ? '#FAF9F6' : '#1a1a2e',
              skipFonts: true,
            });

            card.style.visibility = 'hidden';
            setPreviewImage(dataUrl);
          } catch (retryError) {
            console.error('Retry failed:', retryError);
            card.style.visibility = 'hidden';
          }
        }, 500);
      }
    }, 1500);

    // Typing effect
    for (let i = 0; i <= soulTitle.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setDisplayedTitle(soulTitle.slice(0, i));
    }

    // Show details after typing completes (2.5 seconds after result)
    setTimeout(() => setShowDetails(true), 500);
  };

  // Save image based on current mode with Web Share API support (iOS Safari optimized)
  const saveImage = async () => {
    const cardId = mode === 'magazine' ? 'share-card-full' : 'share-card-simple';
    const card = document.getElementById(cardId);
    if (!card || typeof window === 'undefined') return;

    showToastMessage('鑑定書を作成中...');

    try {
      // Use toBlob for better iOS compatibility
      const blob = await htmlToImage.toBlob(card, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: mode === 'gallery' ? '#FAF9F6' : '#1a1a2e',
        skipFonts: true,
        filter: (node) => {
          if (node instanceof HTMLLinkElement && node.href.includes('fonts.googleapis.com')) {
            return false;
          }
          return true;
        },
      });

      if (!blob) {
        throw new Error('Failed to generate image');
      }

      // Create File object explicitly
      const file = new File([blob], `the-five-${mode}-${Date.now()}.png`, { type: 'image/png' });

      // Detect iOS/iPadOS
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

      // For iOS, force try navigator.share with files only (no title/text)
      if (isIOS && navigator.share) {
        try {
          await navigator.share({
            files: [file],
          });
          showToastMessage('共有メニューを開きました！');
          return; // Success, exit early
        } catch (shareError) {
          const error = shareError as Error;
          // User cancelled - do nothing
          if (error.name === 'AbortError') {
            return;
          }
          // Share failed, fall through to download
          console.warn('iOS share failed:', error);
        }
      }

      // For non-iOS or if iOS share failed, try standard Web Share API
      if (!isIOS && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
          });
          showToastMessage('共有メニューを開きました！');
          return; // Success, exit early
        } catch (shareError) {
          const error = shareError as Error;
          if (error.name === 'AbortError') {
            return;
          }
          // Fall through to download
        }
      }
      // Fallback for iOS: Open image in new tab for long-press save
      if (isIOS) {
        // Convert blob to data URL and open in new tab
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const newTab = window.open();
          if (newTab) {
            newTab.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>鑑定書を保存</title>
                <style>
                  body { margin: 0; padding: 20px; background: #f5f5f5; display: flex; flex-direction: column; align-items: center; font-family: -apple-system, sans-serif; }
                  img { max-width: 100%; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
                  p { color: #666; text-align: center; margin-top: 20px; font-size: 14px; }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" alt="鑑定書" />
                <p>📱 画像を長押しして「写真に保存」を選択してください</p>
              </body>
              </html>
            `);
            newTab.document.close();
          }
        };
        reader.readAsDataURL(blob);
        showToastMessage('画像を開きました。長押しで保存できます！');
      } else {
        // Non-iOS: regular download
        const dataUrl = await htmlToImage.toPng(card, {
          quality: 1,
          pixelRatio: 3,
          backgroundColor: mode === 'gallery' ? '#FAF9F6' : '#1a1a2e',
          skipFonts: true,
        });
        const link = document.createElement('a');
        link.download = file.name;
        link.href = dataUrl;
        link.click();
        showToastMessage('画像を保存しました！Xに添付してシェアしよう！');
      }
    } catch (error) {
      console.error('Image save error:', error);
      showToastMessage('画像の作成に失敗しました。もう一度お試しください。');
    }
  };

  // AI無効モード用: モーダルなしで直接画像を保存 (iOS Safari optimized)
  const saveImageDirectly = async () => {
    if (selectedBooks.length !== 5) return;

    const cardId = mode === 'magazine' ? 'share-card-full-direct' : 'share-card-simple-direct';
    const card = document.getElementById(cardId);
    if (!card || typeof window === 'undefined') return;

    showToastMessage('本棚画像を作成中...');

    try {
      // Make card visible and positioned on-screen for rendering
      const originalStyles = {
        visibility: card.style.visibility,
        position: card.style.position,
        left: card.style.left,
        zIndex: card.style.zIndex,
      };
      card.style.visibility = 'visible';
      card.style.position = 'absolute';
      card.style.left = '0px';
      card.style.zIndex = '9999';

      await new Promise(resolve => setTimeout(resolve, 500));

      // Use toBlob for better iOS compatibility
      const blob = await htmlToImage.toBlob(card, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: mode === 'gallery' ? '#FAF9F6' : undefined,
        cacheBust: true,
      });

      // Restore original styles
      card.style.visibility = originalStyles.visibility;
      card.style.position = originalStyles.position;
      card.style.left = originalStyles.left;
      card.style.zIndex = originalStyles.zIndex;

      if (!blob) {
        throw new Error('Failed to generate image');
      }

      // Create File object explicitly
      const file = new File([blob], `my-best-five-${mode}-${Date.now()}.png`, { type: 'image/png' });

      // Detect iOS/iPadOS
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

      // For iOS, force try navigator.share with files only (no title/text)
      if (isIOS && navigator.share) {
        try {
          await navigator.share({
            files: [file],
          });
          showToastMessage('共有メニューを開きました！');
          return; // Success, exit early
        } catch (shareError) {
          const error = shareError as Error;
          // User cancelled - do nothing
          if (error.name === 'AbortError') {
            return;
          }
          // Share failed, fall through to download
          console.warn('iOS share failed:', error);
        }
      }

      // For non-iOS or if iOS share failed, try standard Web Share API
      if (!isIOS && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
          });
          showToastMessage('共有メニューを開きました！');
          return; // Success, exit early
        } catch (shareError) {
          const error = shareError as Error;
          if (error.name === 'AbortError') {
            return;
          }
          // Fall through to download
        }
      }

      // Fallback for iOS: Open image in new tab for long-press save
      if (isIOS) {
        // Convert blob to data URL and open in new tab
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          // Open in new tab - user can long-press to save
          const newTab = window.open();
          if (newTab) {
            newTab.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>本棚画像を保存</title>
                <style>
                  body { margin: 0; padding: 20px; background: #f5f5f5; display: flex; flex-direction: column; align-items: center; font-family: -apple-system, sans-serif; }
                  img { max-width: 100%; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
                  p { color: #666; text-align: center; margin-top: 20px; font-size: 14px; }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" alt="本棚画像" />
                <p>📱 画像を長押しして「写真に保存」を選択してください</p>
              </body>
              </html>
            `);
            newTab.document.close();
          }
        };
        reader.readAsDataURL(blob);
        showToastMessage('画像を開きました。長押しで保存できます！');
      } else {
        // Non-iOS: regular download
        const dataUrl = await htmlToImage.toPng(card, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: mode === 'gallery' ? '#FAF9F6' : undefined,
        });
        const link = document.createElement('a');
        link.download = file.name;
        link.href = dataUrl;
        link.click();
        showToastMessage('画像を保存しました！Xに添付してシェアしよう！');
      }
    } catch (error) {
      console.error('Image save error:', error);
      showToastMessage('画像の作成に失敗しました。もう一度お試しください。');
    }
  };

  // X share with Supabase save
  const shareToXWithSave = async () => {
    if (selectedBooks.length !== 5 || isSaving) return;

    setIsSaving(true);

    try {
      // Import Supabase functions dynamically to avoid SSR issues
      const { saveShelf } = await import('@/lib/supabase');

      // Prepare book data for saving
      const booksData = selectedBooks.map(book => ({
        id: book.manga.id,
        title: book.manga.title,
        author: book.manga.author,
        coverUrl: book.manga.coverUrl,
        volume: book.volume,
        itemUrl: book.manga.itemUrl,
      }));

      // Save to Supabase
      const shelfId = await saveShelf(booksData, mode, category);

      if (!shelfId) {
        throw new Error('Failed to save shelf');
      }

      // Generate share URL
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const shelfUrl = `${siteUrl}/shelf/${shelfId}`;

      // Create X share URL with category-specific text
      const shareTitle = category === 'recommend' ? '今読んでほしい、5冊。' : '今のあなたの、５冊';
      const shareText = encodeURIComponent(`${shareTitle} #THEFIVE`);
      const encodedUrl = encodeURIComponent(shelfUrl);

      // Detect mobile and try to open X app directly
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        // Try X app first with intent URL
        const xAppUrl = `twitter://post?message=${shareText}%20${encodedUrl}`;
        const webUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`;

        // Create a hidden iframe to try the app URL
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        // Try to open app URL
        const startTime = Date.now();
        window.location.href = xAppUrl;

        // If still here after 1.5s, app probably not installed, open web
        setTimeout(() => {
          if (Date.now() - startTime < 2000) {
            window.location.href = webUrl;
          }
          document.body.removeChild(iframe);
        }, 1500);
      } else {
        // Desktop: open in new tab
        const xUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`;
        window.open(xUrl, '_blank');
      }

      showToastMessage('本棚を保存しました！Xで共有できます');
    } catch (error) {
      console.error('Share error:', error);
      alert('保存中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const isFull = selectedBooks.length === 5;

  return (
    <>

      {/* Decorative Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
      </div>

      <div className="min-h-screen relative z-10">
        {/* Header */}
        <header className="py-8 px-4">
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
            {/* Logo */}
            <div className="text-center">
              <Link href="/" className="cursor-pointer inline-block">
                <h1
                  className="text-5xl font-bold tracking-wide"
                  style={{
                    fontFamily: "'Permanent Marker', cursive",
                    fontStyle: 'italic',
                    transform: 'skewX(-8deg)',
                  }}
                >
                  THE FIVE
                </h1>
              </Link>
            </div>

            {/* Description */}
            <div className="max-w-xl text-center px-4 mt-8">
              <p
                className="text-2xl md:text-3xl font-bold leading-relaxed"
                style={{ fontFamily: "'Kaisei Tokumin', serif", lineHeight: '1.6' }}
              >
                あなたの5冊を、教えてください。
              </p>
              <p
                className="text-sm mt-4 opacity-70 leading-relaxed"
                style={{ fontFamily: "'Kaisei Tokumin', serif" }}
              >
                人生で最も記憶に残っている本、<br className="sm:hidden" />
                あるいは今おすすめしたい本を５冊選んで、<br />
                あなただけの本棚を作りましょう。
              </p>
            </div>

            {/* Mode Toggle - テーマ選択 */}
            <div className="flex flex-col items-center gap-2 mt-10">
              <p className="text-sm font-medium text-gray-400">背景テーマを選択</p>
              <div className="glass-card flex rounded-full p-2 gap-2 w-full max-w-[360px]">
                <button
                  onClick={() => setMode('gallery')}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all text-center ${mode === 'gallery'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg ring-2 ring-blue-300 font-bold'
                    : 'bg-white/50 text-gray-500 hover:text-gray-700'
                    }`}
                >
                  ミニマル
                </button>
                <button
                  onClick={() => setMode('magazine')}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all text-center ${mode === 'magazine'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg ring-2 ring-blue-300 font-bold'
                    : 'bg-white/50 text-gray-500 hover:text-gray-700'
                    }`}
                >
                  本棚
                </button>
              </div>
            </div>

            {/* Category Selection - 本棚タイトル選択 */}
            <div className="flex flex-col items-center gap-2 mt-6">
              <p className="text-sm font-medium text-gray-400">本棚のタイトル</p>
              <div className="glass-card flex rounded-full p-2 gap-2 w-full max-w-[400px]">
                <button
                  onClick={() => setCategory('identity')}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all whitespace-nowrap text-center ${category === 'identity'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg ring-2 ring-blue-300 font-bold'
                    : 'bg-white/50 text-gray-500 hover:text-gray-700'
                    }`}
                >
                  私を形作る5冊
                </button>
                <button
                  onClick={() => setCategory('recommend')}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all whitespace-nowrap text-center ${category === 'recommend'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg ring-2 ring-blue-300 font-bold'
                    : 'bg-white/50 text-gray-500 hover:text-gray-700'
                    }`}
                >
                  今読んでほしい5冊
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 pt-1 pb-4">
          {/* Preview Section */}
          <section className="mb-8">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 mb-1">プレビュー</h2>
              <p className="text-sm text-gray-500">完成イメージをリアルタイムで確認</p>
              <p className="text-xs text-gray-400 mt-1 md:hidden">※ ドラッグで順番を変更できます</p>
            </div>

            <div className="flex justify-center w-full px-2 md:px-0">
              <div className="relative w-full max-w-4xl aspect-video md:aspect-auto md:h-[500px] rounded-2xl overflow-hidden shadow-2xl flex flex-col border transition-all duration-300 ${mode === 'magazine' ? 'border-white/20' : 'border-gray-200'} bg-white">
                {/* Background - matches share card */}
                {mode === 'magazine' ? (
                  <>
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <div className="absolute inset-0 bg-white/25" />
                  </>
                ) : (
                  <div className="absolute inset-0" style={{ backgroundColor: '#FAF9F6' }} />
                )}

                {/* Top Title */}
                <div className={`relative z-20 py-4 px-6 text-center border-b ${mode === 'magazine' ? 'border-white/20' : 'border-gray-200/50'}`}>
                  {mode === 'magazine' ? (
                    <>
                      <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                        {category === 'recommend' ? 'Recommended Books' : 'My Best Five'}
                      </h2>
                      <p className="text-white/60 text-xs tracking-widest uppercase mt-1" style={{ letterSpacing: '0.1em' }}>
                        {category === 'recommend' ? '今読んでほしい、5冊。' : '私を形作る、5冊。'}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2
                        className="text-lg sm:text-xl md:text-2xl tracking-wide"
                        style={{ fontFamily: "'Shippori Mincho', serif", color: '#1A1A1A', fontWeight: 300 }}
                      >
                        {category === 'recommend' ? 'Recommended' : 'My Best Five'}
                      </h2>
                      <p className="text-[10px] sm:text-xs tracking-widest uppercase mt-1" style={{ color: '#666', fontWeight: 400, fontFamily: "'Shippori Mincho', serif", letterSpacing: '0.1em' }}>
                        {category === 'recommend' ? '今読んでほしい、5冊。' : '私を形作る、5冊。'}
                      </p>
                    </>
                  )}
                </div>

                {/* Books Area with Drag and Drop */}
                <div className="relative z-10 flex-1 p-4 md:p-6 pb-6 md:pb-8 flex flex-col items-center justify-center">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedBooks.map((b) => `${b.manga.id}-${b.volume}`)}
                      strategy={horizontalListSortingStrategy}
                    >
                      <div className="flex items-end gap-2 md:gap-7 px-2 md:px-16 w-full justify-center">
                        {Array.from({ length: 5 }, (_, i) => {
                          const book = selectedBooks[i];
                          const isFeatured = i === 2;
                          const baseSize = isFeatured
                            ? 'w-16 h-24 sm:w-24 sm:h-36 md:w-40 md:h-60'
                            : 'w-12 h-20 sm:w-20 sm:h-30 md:w-32 md:h-48';

                          if (book) {
                            return (
                              <SortableBookItem
                                key={`${book.manga.id}-${book.volume}`}
                                book={book}
                                index={i}
                                mode={mode}
                                onRemove={removeBook}
                              />
                            );
                          } else {
                            return (
                              <div key={`empty-${i}`} className="flex flex-col items-center gap-2">
                                <div
                                  className={`${baseSize} rounded shadow-inner border-2 border-dashed ${mode === 'magazine' ? 'border-white/80 bg-white/30' : 'border-gray-300 bg-white/30'} flex items-center justify-center`}
                                >
                                  <span className={`text-2xl font-light ${mode === 'magazine' ? 'text-white/80' : 'text-gray-300'}`}>{i + 1}</span>
                                </div>
                                <span className={`text-[9px] font-medium ${mode === 'magazine' ? 'text-white/80' : 'text-gray-300'}`}>—</span>
                              </div>
                            );
                          }
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Instruction Text */}
                  <div className="text-center mt-4">
                    <p
                      className={`text-sm ${mode === 'magazine' ? 'text-white font-bold' : 'text-gray-500'}`}
                      style={mode === 'magazine' ? { textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)' } : undefined}
                    >
                      {selectedBooks.length === 5 ? (
                        <>
                          {/* Mobile: show long-press message */}
                          <span className={`sm:hidden animate-pulse ${mode === 'magazine' ? 'text-amber-300' : 'text-blue-500'}`}>
                            長押しで並び替えできます
                          </span>
                          {/* Desktop: show drag message */}
                          <span className={`hidden sm:inline animate-pulse ${mode === 'magazine' ? 'text-amber-300' : 'text-blue-500'}`}>
                            ドラッグで並び替えできます
                          </span>
                        </>
                      ) : (
                        <>本を選んでください（{selectedBooks.length}/5冊）</>
                      )}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="relative z-20 py-2 text-center flex items-center justify-between px-6">
                  {mode === 'magazine' ? (
                    <>
                      <div className="flex-1" />
                      <p className="text-white/40 text-[10px]">2026.01</p>
                    </>
                  ) : (
                    <p className="text-gray-400 text-[10px] tracking-widest w-full text-center">2026.01</p>
                  )}
                </div>
              </div>
            </div>


          </section>

          {/* Action Buttons Section */}
          <section className="mb-10">

            <div className="flex flex-col items-center gap-4 mb-2">
              <div className="flex flex-col items-center gap-2">
                {IS_AI_ENABLED ? (
                  <button
                    onClick={startAppraisal}
                    disabled={!isFull}
                    className="px-20 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-2xl font-bold hover:from-blue-700 hover:to-indigo-700 transition shadow-xl shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 tracking-wide"
                  >
                    生成する
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <button
                      onClick={saveImageDirectly}
                      disabled={!isFull}
                      className={`px-10 py-4 rounded-2xl text-lg font-bold transition transform active:scale-95 tracking-wide ${isFull
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl shadow-orange-500/30 hover:from-amber-600 hover:to-orange-600 hover:scale-105'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                      本棚を保存
                    </button>
                    <button
                      onClick={shareToXWithSave}
                      disabled={!isFull || isSaving}
                      className={`px-10 py-4 rounded-2xl text-lg font-bold transition transform active:scale-95 tracking-wide flex items-center gap-2 ${isFull && !isSaving
                        ? 'bg-black text-white shadow-xl hover:bg-gray-800 hover:scale-105'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                      <span className="text-xl">𝕏</span>
                      <span>{isSaving ? '保存中...' : 'でシェア'}</span>
                    </button>
                  </div>
                )}
                {selectedBooks.length > 0 && (
                  <button
                    onClick={resetSelection}
                    className="text-sm text-gray-400 hover:text-red-500 transition flex items-center gap-1"
                  >
                    <span>×</span> 選んだ本を削除
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Search Section */}
          <section id="search-section" className="mb-8">
            <div className="text-center mb-3">
              <h2 className="text-base font-bold text-gray-800 mb-0.5">本を探す</h2>
              <p className="text-xs text-gray-500">タイトル・作者名で検索、またはジャンルで絞り込み</p>
            </div>

            <div className="glass-card rounded-3xl p-6 shadow-xl">
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">マンガを検索</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      placeholder="タイトルや作者名を入力（例：ワンピ、スラダン）"
                      className="w-full px-5 py-4 pr-12 rounded-xl border-2 border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-gray-700 font-medium placeholder:text-gray-400 text-base"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition text-gray-600"
                        aria-label="検索をクリア"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <button className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg shadow-blue-500/25">
                    検索
                  </button>
                </div>
              </div>

              {/* Genre Section with Label */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">カテゴリーから探す</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {GENRES.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => setCurrentGenre(genre)}
                      className={`genre-chip px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap shadow-sm transition ${currentGenre === genre
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      {genre === 'all' ? 'すべて' : genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendations when search is empty */}
              {!searchQuery.trim() && currentGenre === 'all' && (
                <div className="mt-6 pt-4 border-t border-gray-200/50">
                  <p className="text-xs font-medium text-gray-500 mb-3">みんなが選んでいる作品</p>
                  <div className="flex flex-wrap gap-2">
                    {RECOMMENDED_MANGA.slice(0, 8).map((manga, i) => (
                      <button
                        key={i}
                        onClick={() => setSearchQuery(manga.title)}
                        className="px-3 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 text-gray-700 hover:text-blue-700 rounded-lg text-xs font-medium transition border border-gray-200 hover:border-blue-200"
                      >
                        {manga.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Search Results Section */}
          <section id="search-results" className="mb-8">
            <div className="text-center mb-3">
              <h2 className="text-base font-bold text-gray-800 mb-0.5">検索結果</h2>
              <p className="text-xs text-gray-500">1巻のサムネイルをタップして他の巻を選択</p>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {isSearching ? (
                <div className="col-span-full text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                  <p className="text-gray-500 mt-2">検索中...</p>
                </div>
              ) : filteredManga.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-400">検索結果がありません</p>
                </div>
              ) : (
                filteredManga.map((manga) => {
                  const isSelected = selectedBooks.some(b => b.manga.id === manga.id);
                  const [imageError, setImageError] = React.useState(false);
                  const hasValidImage = manga.coverUrl && !imageError;

                  return (
                    <div
                      key={manga.id}
                      onClick={() => openDrawer(manga)}
                      className="group cursor-pointer"
                    >
                      <div
                        className={`book-card aspect-[2/3] bg-gradient-to-br ${manga.coverColor} rounded-xl shadow-lg mb-2 relative overflow-hidden ${isSelected ? 'book-selected' : ''}`}
                      >
                        {hasValidImage ? (
                          <img
                            src={manga.coverUrl}
                            alt={manga.title}
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                          />
                        ) : (
                          /* Fallback title display when no image or image fails */
                          <div className="absolute inset-0 flex items-center justify-center p-3 text-center">
                            <h3 className="text-white font-black text-sm drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                              {manga.title}
                            </h3>
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium z-10">
                          全{manga.totalVolumes}巻
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold z-10">
                            ✓ 選択中
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-600 truncate">{manga.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{manga.author}</p>
                    </div>
                  );
                })
              )}
            </div >
          </section >
        </main >

        {/* Footer */}
        < footer className="py-8 mt-12" >
          <p className="text-center text-sm text-gray-500 font-medium">THE FIVE © 2026</p>
          <p className="text-center text-xs text-gray-400 mt-1">
            {IS_AI_ENABLED ? '最高の5冊を選び、AIに鑑定してもらおう' : '最高の5冊を選んで、あなただけの本棚を作ろう'}
          </p>
          <button
            onClick={() => setShowDisclaimerModal(true)}
            className="block mx-auto mt-4 text-xs text-gray-400 hover:text-gray-600 underline transition"
            style={{ fontFamily: "'Kaisei Tokumin', serif" }}
          >
            免責事項・著作権について
          </button>
        </footer >
      </div >

      {/* Volume Selector Drawer */}
      < div
        className={`drawer-overlay fixed inset-0 bg-black/50 z-40 ${drawerOpen ? 'open' : ''}`
        }
        onClick={closeDrawer}
      />
      <div
        className={`drawer fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[60vh] overflow-hidden ${drawerOpen ? 'open' : ''}`}
      >
        <div className="p-6">
          {/* Drawer Handle */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {selectedManga && (
            <>
              {/* Selected Manga Info */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-24 bg-gradient-to-br ${selectedManga.coverColor} rounded-lg shadow-lg overflow-hidden`}>
                  <img src={selectedManga.coverUrl} alt={selectedManga.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{getBaseTitle(selectedManga.title)}</h3>
                  <p className="text-sm text-gray-500">{selectedManga.author}</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">全{selectedManga.totalVolumes}巻</p>
                </div>
              </div>

              {/* Volume Selector */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">どの巻を本棚に飾りますか？</p>
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                  {Array.from({ length: selectedManga.totalVolumes }, (_, i) => i + 1).map((vol) => {
                    const isSelected = selectedBooks.some(b => b.manga.id === selectedManga.id && b.volume === vol);
                    return (
                      <div
                        key={vol}
                        onClick={() => selectVolume(selectedManga, vol)}
                        className={`flex-shrink-0 cursor-pointer transition-all ${isSelected ? 'scale-110' : ''}`}
                      >
                        <div className={`w-16 h-24 bg-gradient-to-br ${selectedManga.coverColor} rounded-lg shadow-md flex items-end justify-center pb-1 relative ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-105'}`}>
                          <span className="text-white text-xs font-bold drop-shadow">{vol}巻</span>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold">
                              ✓
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={closeDrawer}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-medium transition"
              >
                閉じる
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hidden Share Cards for html-to-image capture - MUST be outside modal for reliable rendering */}
      {
        appraisalResult && (
          <>
            <div
              id="share-card-full"
              style={{
                position: 'fixed',
                left: '-9999px',
                top: 0,
                width: 800,
                height: 450,
                visibility: 'hidden',
                zIndex: -1,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.25)' }} />
              <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>YOUR SOUL NAME</p>
                  <h2 style={{ fontSize: 28, fontWeight: 900, color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{appraisalResult.soulTitle}</h2>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 20, paddingLeft: 64, paddingRight: 64 }}>
                  {selectedBooks.map((book) => (
                    <div key={`card-${book.manga.id}-${book.volume}`} style={{ width: 112, height: 160, borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.3)', backgroundColor: 'white' }}>
                      <img src={book.manga.coverUrl} alt="Book cover" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>2026.01</p>
                </div>
              </div>
            </div>

            <div
              id="share-card-simple"
              style={{
                position: 'fixed',
                left: '-9999px',
                top: 0,
                width: 800,
                height: 450,
                backgroundColor: '#FAF9F6',
                visibility: 'hidden',
                zIndex: -1,
              }}
            >
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 24, padding: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '0.05em', color: '#1A1A1A', fontFamily: "'Shippori Mincho', serif" }}>私の５冊</h2>
                  <p style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 8, color: '#666', fontWeight: 500 }}>THE FIVE</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32, paddingLeft: 80, paddingRight: 80 }}>
                  {selectedBooks.map((book) => (
                    <div key={`simple-${book.manga.id}-${book.volume}`} style={{ width: 128, height: 192, borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', backgroundColor: 'white' }}>
                      <img src={book.manga.coverUrl} alt="Book cover" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )
      }

      {/* Hidden Share Cards for direct save (AI disabled mode) */}
      {
        selectedBooks.length === 5 && (
          <>
            {/* Magazine style - 本棚背景 */}
            <div
              id="share-card-full-direct"
              style={{
                position: 'fixed',
                left: '-9999px',
                top: 0,
                width: 800,
                height: 450,
                visibility: 'hidden',
                zIndex: -1,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 28 }}>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: 32, fontWeight: 900, color: 'white', textShadow: '0 2px 15px rgba(0,0,0,0.6)', letterSpacing: '0.05em' }}>{category === 'recommend' ? 'Recommended' : 'My Best Five'}</h2>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: '0.2em', marginTop: 4 }}>{category === 'recommend' ? '今読んでほしい、5冊。' : '私を形作る、5冊。'}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 20, paddingLeft: 48, paddingRight: 48 }}>
                  {selectedBooks.map((book) => (
                    <div key={`direct-mag-${book.manga.id}-${book.volume}`} style={{ width: 120, height: 176, borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.3)', backgroundColor: 'white' }}>
                      <img src={book.manga.coverUrl} alt="Book cover" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 500 }}>2026.01.30</p>
                </div>
              </div>
            </div>

            {/* Minimal style - 白背景 */}
            <div
              id="share-card-simple-direct"
              style={{
                position: 'fixed',
                left: '-9999px',
                top: 0,
                width: 800,
                height: 450,
                backgroundColor: '#FAF9F6',
                visibility: 'hidden',
                zIndex: -1,
              }}
            >
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 20, padding: 32 }}>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: 36, letterSpacing: '0.08em', color: '#1A1A1A', fontFamily: "'Shippori Mincho', serif", fontWeight: 300 }}>{category === 'recommend' ? 'Recommended' : 'My Best Five'}</h2>
                  <p style={{ fontSize: 11, letterSpacing: '0.25em', marginTop: 6, color: '#888', fontWeight: 400, fontFamily: "'Shippori Mincho', serif" }}>{category === 'recommend' ? '今読んでほしい、5冊。' : '私を形作る、5冊。'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, paddingLeft: 48, paddingRight: 48 }}>
                  {selectedBooks.map((book) => (
                    <div key={`direct-min-${book.manga.id}-${book.volume}`} style={{ width: 130, height: 195, borderRadius: 6, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.12)', backgroundColor: 'white' }}>
                      <img src={book.manga.coverUrl} alt="Book cover" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 10, letterSpacing: '0.15em', color: '#AAA', marginTop: 8 }}>2026.01.30</p>
              </div>
            </div>
          </>
        )
      }

      {/* AI Appraisal Modal */}
      <div className={`modal fixed inset-0 z-[60] flex items-center justify-center ${showAppraisalModal ? 'open' : ''}`}>
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 via-purple-100/20 to-pink-100/30" />

        <div className="modal-content relative w-full h-full overflow-y-auto overflow-x-hidden">
          {isAppraising ? (
            /* Loading State */
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center py-20">
                <div className="loading-pulse inline-block mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl">
                    <span className="text-4xl">📚</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">本棚を製作し、あなたの正体を分析中...</h3>
                <p className="text-gray-500 text-sm">選ばれた5冊から、あなたの本質を読み解いています</p>
                <div className="flex justify-center gap-1 mt-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          ) : appraisalResult && (
            /* Result Display */
            <div className="flex flex-col items-center py-8 px-4">
              {/* Step 1: Immersion Mode - Image + Title Only */}
              <div className="w-full max-w-md">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="鑑定結果"
                    className="w-full rounded-2xl shadow-2xl"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl animate-pulse flex items-center justify-center">
                    <span className="text-gray-400 text-sm">画像を生成中...</span>
                  </div>
                )}
              </div>

              {/* Soul Title */}
              <div className="text-center py-6 px-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-800 leading-tight">
                  {appraisalResult ? formatSoulTitle(displayedTitle) : displayedTitle}
                  {displayedTitle.length < (appraisalResult?.soulTitle?.length || 0) && (
                    <span className="typing-cursor text-blue-500" />
                  )}
                </h2>
              </div>

              {/* Step 2: Action Mode - Slides up after typing completes */}
              <div
                className={`w-full max-w-md transition-all duration-700 ease-out ${showDetails
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10 pointer-events-none'
                  }`}
              >
                {/* Analysis or Message */}
                {IS_AI_ENABLED ? (
                  <div className="glass-card rounded-2xl p-5 mb-6">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <span>🔮</span> AI鑑定結果
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{appraisalResult.analysis}</p>
                  </div>
                ) : (
                  <div className="text-center py-4 mb-6">
                    <p
                      className="text-gray-500 text-sm leading-relaxed"
                      style={{ fontFamily: "'Kaisei Tokumin', serif" }}
                    >
                      この5冊が、今のあなたを形づくっています。
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={shareToX}
                    className="w-full px-8 py-4 bg-black hover:bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl transition transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <span className="text-xl">𝕏</span>
                    <span>でシェア</span>
                  </button>

                  <button
                    onClick={saveImage}
                    className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg hover:from-amber-600 hover:to-orange-600 transition flex items-center justify-center gap-2"
                  >
                    <span>💾</span> 画像を保存・共有
                  </button>

                  <button
                    onClick={resetAndCloseModal}
                    className="w-full px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition flex items-center justify-center gap-2 border border-gray-200"
                  >
                    もう一度選ぶ（リセット）
                  </button>

                  <button
                    onClick={() => setShowAppraisalModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-sm mt-1 transition"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] transition-all duration-300 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-4'
          }`}
      >
        <div className="glass-card px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <p className="font-medium text-gray-800">{toastMessage}</p>
        </div>
      </div>

      {/* Disclaimer Modal */}
      {
        showDisclaimerModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowDisclaimerModal(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
              <button
                onClick={() => setShowDisclaimerModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
              >
                ✕
              </button>

              <div style={{ fontFamily: "'Kaisei Tokumin', serif" }}>
                <h2 className="text-lg font-bold text-gray-800 mb-4">著作権および画像利用について</h2>

                <div className="text-sm text-gray-600 leading-relaxed space-y-4">
                  <p>
                    当サイト（THE FIVE）は、個人のマンガファンによる非営利のファン活動として運営されています。
                  </p>

                  <p>
                    サイト内で表示される書影（表紙画像）および作品情報は、<strong>「楽天ブックス書籍検索API」</strong>等の公式APIを通じて取得したデータを利用しており、その著作権は各著者・出版社等、正当な権利者に帰属します。
                  </p>

                  <p>
                    当サイトは各作品の販売促進を応援するため、公式販売ページへのリンクを提供しています。
                  </p>

                  <p>
                    当サイトは、著作権の侵害を目的としたものではありません。提供される情報の正確性には細心の注意を払っておりますが、万一、権利者様からの削除依頼や掲載内容の修正依頼があった場合は、事実確認の上、速やかに対応させていただきます。
                  </p>

                  <p>
                    お問い合わせは、
                    <a
                      href="https://twitter.com/messages/compose?recipient_id=antigravity_dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      X（旧Twitter）のDM
                    </a>
                    までご連絡をお願いいたします。
                  </p>

                  <h3 className="text-md font-bold text-gray-800 pt-4">免責事項</h3>

                  <p>
                    当サイトの利用（画像の保存やシェア等を含む）によって生じた損害やトラブルについて、運営者は一切の責任を負いかねます。あらかじめご了承ください。
                  </p>
                </div>

                <button
                  onClick={() => setShowDisclaimerModal(false)}
                  className="mt-6 w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 font-medium transition"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
}
