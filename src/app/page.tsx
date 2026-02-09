'use client';

// AI機能の有効/無効フラグ
const IS_AI_ENABLED = false;

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import popularMangaData from '@/data/popular-manga.json';
import { ONE_PIECE_VOLUMES, isOnePiece, getOnePieceCoverUrl } from '@/data/onepiece-volumes';
import type { SearchState, SearchApiResponse } from '@/types/search';
import { extractVolumeNumber } from '@/lib/search/core/volume-parser';
import type { Book } from '@/types/book';

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
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import BookSearchResultItem from './BookSearchResultItem';

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
// Types
const PUBLISHERS = ['all', '集英社', '講談社', '小学館', 'KADOKAWA', 'スクウェア・エニックス', '白泉社'];

interface SelectedBook {
  manga: Book;
  volume: number;
}

interface AppraisalResult {
  soulTitle: string;
  analysis: string;
}

// Mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return isMobile;
}

// ===== Volume Parser imported from @/lib/search/core/volume-parser =====
// 以前の extractVolumeNumber は削除されました


// Mock manga data (same as mockup)
const MOCK_MANGA_DATA: Book[] = [
  // --- 集英社 (Shueisha) ---
  { id: "1", title: "ワンピース", reading: "わんぴーす", author: "尾田栄一郎", genre: "少年", publisher: "集英社", totalVolumes: 107, coverColor: "from-red-400 to-red-600", coverUrl: "https://placehold.co/150x220/ef4444/ffffff?text=ONE+PIECE" },
  { id: "2", title: "鬼滅の刃", reading: "きめつのやいば", author: "吾峠呼世晴", genre: "少年", publisher: "集英社", totalVolumes: 23, coverColor: "from-teal-400 to-teal-600", coverUrl: "https://placehold.co/150x220/14b8a6/ffffff?text=鬼滅の刃" },
  { id: "3", title: "呪術廻戦", reading: "じゅじゅつかいせん", author: "芥見下々", genre: "少年", publisher: "集英社", totalVolumes: 25, coverColor: "from-purple-400 to-purple-600", coverUrl: "https://placehold.co/150x220/a855f7/ffffff?text=呪術廻戦" },
  { id: "4", title: "SPY×FAMILY", reading: "すぱいふぁみりー", author: "遠藤達哉", genre: "少年", publisher: "集英社", totalVolumes: 13, coverColor: "from-pink-400 to-rose-500", coverUrl: "https://placehold.co/150x220/ec4899/ffffff?text=SPY×FAMILY" },
  { id: "6", title: "チェンソーマン", reading: "ちぇんそーまん", author: "藤本タツキ", genre: "少年", publisher: "集英社", totalVolumes: 16, coverColor: "from-orange-500 to-red-600", coverUrl: "https://placehold.co/150x220/f97316/ffffff?text=チェンソーマン" },
  { id: "7", title: "NARUTO", reading: "なると", author: "岸本斉史", genre: "少年", publisher: "集英社", totalVolumes: 72, coverColor: "from-orange-400 to-orange-600", coverUrl: "https://placehold.co/150x220/fb923c/ffffff?text=NARUTO" },
  { id: "8", title: "BLEACH", reading: "ぶりーち", author: "久保帯人", genre: "少年", publisher: "集英社", totalVolumes: 74, coverColor: "from-blue-500 to-indigo-600", coverUrl: "https://placehold.co/150x220/3b82f6/ffffff?text=BLEACH" },
  { id: "9", title: "ハイキュー!!", reading: "はいきゅー", author: "古舘春一", genre: "少年", publisher: "集英社", totalVolumes: 45, coverColor: "from-orange-400 to-amber-500", coverUrl: "https://placehold.co/150x220/f59e0b/ffffff?text=ハイキュー!!" },
  { id: "10", title: "僕のヒーローアカデミア", reading: "ぼくのひーろーあかでみあ", author: "堀越耕平", genre: "少年", publisher: "集英社", totalVolumes: 39, coverColor: "from-green-400 to-emerald-600", coverUrl: "https://placehold.co/150x220/22c55e/ffffff?text=ヒロアカ" },
  { id: "11", title: "君に届け", reading: "きみにとどけ", author: "椎名軽穂", genre: "少女", publisher: "集英社", totalVolumes: 30, coverColor: "from-pink-300 to-pink-500", coverUrl: "https://placehold.co/150x220/f472b6/ffffff?text=君に届け" },
  { id: "13", title: "NANA", reading: "なな", author: "矢沢あい", genre: "少女", publisher: "集英社", totalVolumes: 21, coverColor: "from-rose-400 to-red-500", coverUrl: "https://placehold.co/150x220/f43f5e/ffffff?text=NANA" },
  { id: "15", title: "GANTZ", reading: "がんつ", author: "奥浩哉", genre: "青年", publisher: "集英社", totalVolumes: 37, coverColor: "from-gray-800 to-black", coverUrl: "https://placehold.co/150x220/1f2937/ffffff?text=GANTZ" },
  { id: "30", title: "ドラゴンボール", reading: "どらごんぼーる", author: "鳥山明", genre: "少年", publisher: "集英社", totalVolumes: 42, coverColor: "from-orange-500 to-yellow-500", coverUrl: "https://placehold.co/150x220/f97316/ffffff?text=DB" },
  { id: "31", title: "SLAM DUNK", reading: "すらむだんく", author: "井上雄彦", genre: "少年", publisher: "集英社", totalVolumes: 31, coverColor: "from-red-500 to-orange-500", coverUrl: "https://placehold.co/150x220/ef4444/ffffff?text=SLAM+DUNK" },
  { id: "32", title: "ジョジョの奇妙な冒険", reading: "じょじょのきみょうなぼうけん", author: "荒木飛呂彦", genre: "少年", publisher: "集英社", totalVolumes: 63, coverColor: "from-purple-500 to-yellow-500", coverUrl: "https://placehold.co/150x220/a855f7/ffffff?text=JOJO" },
  { id: "33", title: "HUNTER×HUNTER", reading: "はんたーはんたー", author: "冨樫義博", genre: "少年", publisher: "集英社", totalVolumes: 37, coverColor: "from-green-600 to-blue-600", coverUrl: "https://placehold.co/150x220/16a34a/ffffff?text=HUNTER" },
  { id: "34", title: "デスノート", reading: "ですのーと", author: "小畑健", genre: "少年", publisher: "集英社", totalVolumes: 12, coverColor: "from-gray-900 to-black", coverUrl: "https://placehold.co/150x220/000000/ffffff?text=DEATH+NOTE" },
  { id: "35", title: "銀魂", reading: "ぎんたま", author: "空知英秋", genre: "少年", publisher: "集英社", totalVolumes: 77, coverColor: "from-blue-300 to-gray-300", coverUrl: "https://placehold.co/150x220/93c5fd/ffffff?text=銀魂" },
  { id: "36", title: "ゴールデンカムイ", reading: "ごーるでんかむい", author: "野田サトル", genre: "青年", publisher: "集英社", totalVolumes: 31, coverColor: "from-yellow-600 to-amber-700", coverUrl: "https://placehold.co/150x220/d97706/ffffff?text=金カム" },
  { id: "37", title: "キングダム", reading: "きんぐだむ", author: "原泰久", genre: "青年", publisher: "集英社", totalVolumes: 69, coverColor: "from-red-700 to-orange-700", coverUrl: "https://placehold.co/150x220/b91c1c/ffffff?text=KINGDOM" },
  { id: "38", title: "推しの子", reading: "おしのこ", author: "赤坂アカ", genre: "青年", publisher: "集英社", totalVolumes: 13, coverColor: "from-pink-500 to-purple-600", coverUrl: "https://placehold.co/150x220/ec4899/ffffff?text=推しの子" },
  { id: "39", title: "かぐや様は告らせたい", reading: "かぐやさまはこくらせたい", author: "赤坂アカ", genre: "青年", publisher: "集英社", totalVolumes: 28, coverColor: "from-red-500 to-black", coverUrl: "https://placehold.co/150x220/ef4444/ffffff?text=かぐや様" },
  { id: "40", title: "アオハライド", reading: "あおはらいど", author: "咲坂伊緒", genre: "少女", publisher: "集英社", totalVolumes: 13, coverColor: "from-blue-200 to-blue-400", coverUrl: "https://placehold.co/150x220/60a5fa/ffffff?text=アオハライド" },

  // --- 講談社 (Kodansha) ---
  { id: "5", title: "進撃の巨人", reading: "しんげきのきょじん", author: "諫山創", genre: "少年", publisher: "講談社", totalVolumes: 34, coverColor: "from-gray-600 to-gray-800", coverUrl: "https://placehold.co/150x220/4b5563/ffffff?text=進撃の巨人" },
  { id: "16", title: "AKIRA", reading: "あきら", author: "大友克洋", genre: "SF", publisher: "講談社", totalVolumes: 6, coverColor: "from-red-600 to-red-800", coverUrl: "https://placehold.co/150x220/dc2626/ffffff?text=AKIRA" },
  { id: "17", title: "攻殻機動隊", reading: "こうかくきどうたい", author: "士郎正宗", genre: "SF", publisher: "講談社", totalVolumes: 3, coverColor: "from-cyan-500 to-blue-600", coverUrl: "https://placehold.co/150x220/06b6d4/ffffff?text=攻殻機動隊" },
  { id: "41", title: "東京卍リベンジャーズ", reading: "とうきょうりべんじゃーず", author: "和久井健", genre: "少年", publisher: "講談社", totalVolumes: 31, coverColor: "from-black to-red-600", coverUrl: "https://placehold.co/150x220/000000/ffffff?text=東リベ" },
  { id: "42", title: "五等分の花嫁", reading: "ごとうぶんのはなよめ", author: "春場ねぎ", genre: "少年", publisher: "講談社", totalVolumes: 14, coverColor: "from-pink-300 to-yellow-300", coverUrl: "https://placehold.co/150x220/f9a8d4/ffffff?text=五等分" },
  { id: "43", title: "ブルーロック", reading: "ぶるーろっく", author: "金城宗幸", genre: "少年", publisher: "講談社", totalVolumes: 26, coverColor: "from-blue-600 to-black", coverUrl: "https://placehold.co/150x220/2563eb/ffffff?text=BLUELOCK" },
  { id: "44", title: "宇宙兄弟", reading: "うちゅうきょうだい", author: "小山宙哉", genre: "青年", publisher: "講談社", totalVolumes: 43, coverColor: "from-blue-800 to-black", coverUrl: "https://placehold.co/150x220/1e40af/ffffff?text=宇宙兄弟" },
  { id: "45", title: "寄生獣", reading: "きせいじゅう", author: "岩明均", genre: "青年", publisher: "講談社", totalVolumes: 10, coverColor: "from-green-700 to-gray-800", coverUrl: "https://placehold.co/150x220/15803d/ffffff?text=寄生獣" },
  { id: "46", title: "のだめカンタービレ", reading: "のだめかんたーびれ", author: "二ノ宮知子", genre: "少女", publisher: "講談社", totalVolumes: 25, coverColor: "from-yellow-200 to-orange-300", coverUrl: "https://placehold.co/150x220/fde047/ffffff?text=のだめ" },
  { id: "47", title: "ちはやふる", reading: "ちはやふる", author: "末次由紀", genre: "少女", publisher: "講談社", totalVolumes: 50, coverColor: "from-red-400 to-pink-500", coverUrl: "https://placehold.co/150x220/f87171/ffffff?text=ちはやふる" },
  { id: "48", title: "七つの大罪", reading: "ななつのたいざい", author: "鈴木央", genre: "少年", publisher: "講談社", totalVolumes: 41, coverColor: "from-orange-500 to-red-600", coverUrl: "https://placehold.co/150x220/f97316/ffffff?text=七つの大罪" },
  { id: "49", title: "FAIRY TAIL", reading: "ふぇありーている", author: "真島ヒロ", genre: "少年", publisher: "講談社", totalVolumes: 63, coverColor: "from-pink-500 to-blue-500", coverUrl: "https://placehold.co/150x220/ec4899/ffffff?text=FAIRY+TAIL" },

  // --- 小学館 (Shogakukan) ---
  { id: "18", title: "葬送のフリーレン", reading: "そうそうのふりーれん", author: "山田鐘人", genre: "ファンタジー", publisher: "小学館", totalVolumes: 12, coverColor: "from-emerald-400 to-teal-500", coverUrl: "https://placehold.co/150x220/2dd4bf/ffffff?text=フリーレン" },
  { id: "50", title: "名探偵コナン", reading: "めいたんていこなん", author: "青山剛昌", genre: "少年", publisher: "小学館", totalVolumes: 104, coverColor: "from-blue-600 to-red-600", coverUrl: "https://placehold.co/150x220/2563eb/ffffff?text=コナン" },
  { id: "51", title: "ミステリと言う勿れ", reading: "みすてリというなかれ", author: "田村由美", genre: "少女", publisher: "小学館", totalVolumes: 13, coverColor: "from-gray-300 to-gray-500", coverUrl: "https://placehold.co/150x220/d1d5db/ffffff?text=ミステリ" },
  { id: "52", title: "アオアシ", reading: "あおあし", author: "小林有吾", genre: "青年", publisher: "小学館", totalVolumes: 34, coverColor: "from-green-500 to-blue-500", coverUrl: "https://placehold.co/150x220/22c55e/ffffff?text=アオアシ" },
  { id: "53", title: "金色のガッシュ!!", reading: "こんじきのがっしゅ", author: "雷句誠", genre: "少年", publisher: "小学館", totalVolumes: 33, coverColor: "from-red-500 to-yellow-500", coverUrl: "https://placehold.co/150x220/ef4444/ffffff?text=ガッシュ" },
  { id: "54", title: "うしおととら", reading: "うしおととら", author: "藤田和日郎", genre: "少年", publisher: "小学館", totalVolumes: 33, coverColor: "from-orange-600 to-yellow-600", coverUrl: "https://placehold.co/150x220/ea580c/ffffff?text=うしおととら" },
  { id: "55", title: "銀の匙 Silver Spoon", reading: "ぎんのさじ", author: "荒川弘", genre: "少年", publisher: "小学館", totalVolumes: 15, coverColor: "from-green-300 to-green-500", coverUrl: "https://placehold.co/150x220/86efac/ffffff?text=銀の匙" },
  { id: "56", title: "からかい上手の高木さん", reading: "からかいじょうずのたかぎさん", author: "山本崇一朗", genre: "少年", publisher: "小学館", totalVolumes: 20, coverColor: "from-pink-300 to-orange-200", coverUrl: "https://placehold.co/150x220/fca5a5/ffffff?text=高木さん" },
  { id: "57", title: "BANANA FISH", reading: "ばななふぃっしゅ", author: "吉田秋生", genre: "少女", publisher: "小学館", totalVolumes: 19, coverColor: "from-yellow-400 to-black", coverUrl: "https://placehold.co/150x220/facc15/ffffff?text=BANANA" },
  { id: "58", title: "マギ", reading: "まぎ", author: "大高忍", genre: "少年", publisher: "小学館", totalVolumes: 37, coverColor: "from-blue-400 to-yellow-400", coverUrl: "https://placehold.co/150x220/60a5fa/ffffff?text=MAGI" },

  // --- スクウェア・エニックス (Square Enix) ---
  { id: "19", title: "薬屋のひとりごと", reading: "くすりやのひとりごと", author: "日向夏", genre: "ファンタジー", publisher: "スクウェア・エニックス", totalVolumes: 11, coverColor: "from-amber-400 to-orange-500", coverUrl: "https://placehold.co/150x220/fbbf24/ffffff?text=薬屋" },
  { id: "20", title: "ホリミヤ", reading: "ほりみや", author: "萩原ダイスケ", genre: "恋愛", publisher: "スクウェア・エニックス", totalVolumes: 16, coverColor: "from-sky-400 to-blue-500", coverUrl: "https://placehold.co/150x220/38bdf8/ffffff?text=ホリミヤ" },
  { id: "59", title: "鋼の錬金術師", reading: "はがねのれんきんじゅつし", author: "荒川弘", genre: "少年", publisher: "スクウェア・エニックス", totalVolumes: 27, coverColor: "from-gray-400 to-red-600", coverUrl: "https://placehold.co/150x220/9ca3af/ffffff?text=ハガレン" },
  { id: "60", title: "黒執事", reading: "くろしつじ", author: "枢やな", genre: "少年", publisher: "スクウェア・エニックス", totalVolumes: 33, coverColor: "from-gray-900 to-blue-900", coverUrl: "https://placehold.co/150x220/111827/ffffff?text=黒執事" },
  { id: "61", title: "その着せ替え人形は恋をする", reading: "そのビスクドールはこいをする", author: "福田晋一", genre: "青年", publisher: "スクウェア・エニックス", totalVolumes: 12, coverColor: "from-pink-400 to-purple-400", coverUrl: "https://placehold.co/150x220/f472b6/ffffff?text=着せ恋" },
  { id: "62", title: "ソウルイーター", reading: "そうるいーたー", author: "大久保篤", genre: "少年", publisher: "スクウェア・エニックス", totalVolumes: 25, coverColor: "from-gray-800 to-yellow-500", coverUrl: "https://placehold.co/150x220/1f2937/ffffff?text=SOUL+EATER" },
  { id: "63", title: "月刊少女野崎くん", reading: "げっかんしょうじょのざきくん", author: "椿いづみ", genre: "少年", publisher: "スクウェア・エニックス", totalVolumes: 15, coverColor: "from-orange-400 to-pink-400", coverUrl: "https://placehold.co/150x220/fb923c/ffffff?text=野崎くん" },

  // --- 白泉社 (Hakusensha) ---
  { id: "12", title: "フルーツバスケット", reading: "ふるーつばすけっと", author: "高屋奈月", genre: "少女", publisher: "白泉社", totalVolumes: 23, coverColor: "from-violet-300 to-purple-500", coverUrl: "https://placehold.co/150x220/8b5cf6/ffffff?text=フルバ" },
  { id: "14", title: "ベルセルク", reading: "べるせるく", author: "三浦建太郎", genre: "青年", publisher: "白泉社", totalVolumes: 41, coverColor: "from-slate-700 to-slate-900", coverUrl: "https://placehold.co/150x220/334155/ffffff?text=ベルセルク" },
  { id: "64", title: "3月のライオン", reading: "さんがつのらいおん", author: "羽海野チカ", genre: "青年", publisher: "白泉社", totalVolumes: 17, coverColor: "from-blue-200 to-gray-300", coverUrl: "https://placehold.co/150x220/bfdbfe/ffffff?text=3月のライオン" },
  { id: "65", title: "暁のヨナ", reading: "あかつきのよな", author: "草凪みずほ", genre: "少女", publisher: "白泉社", totalVolumes: 42, coverColor: "from-red-500 to-pink-500", coverUrl: "https://placehold.co/150x220/ef4444/ffffff?text=暁のヨナ" },
  { id: "66", title: "夏目友人帳", reading: "なつめゆうじんちょう", author: "緑川ゆき", genre: "少女", publisher: "白泉社", totalVolumes: 30, coverColor: "from-green-200 to-green-400", coverUrl: "https://placehold.co/150x220/bbf7d0/ffffff?text=夏目" },

  // --- KADOKAWA ---
  { id: "67", title: "ダンジョン飯", reading: "だんじょんめし", author: "九井諒子", genre: "ファンタジー", publisher: "KADOKAWA", totalVolumes: 14, coverColor: "from-yellow-600 to-orange-700", coverUrl: "https://placehold.co/150x220/ca8a04/ffffff?text=ダンジョン飯" },
  { id: "68", title: "乙嫁語り", reading: "おとよめがたり", author: "森薫", genre: "青年", publisher: "KADOKAWA", totalVolumes: 14, coverColor: "from-red-700 to-orange-800", coverUrl: "https://placehold.co/150x220/b91c1c/ffffff?text=乙嫁" },
  { id: "69", title: "よつばと!", reading: "よつばと", author: "あずまきよひこ", genre: "青年", publisher: "KADOKAWA", totalVolumes: 15, coverColor: "from-green-400 to-yellow-400", coverUrl: "https://placehold.co/150x220/4ade80/ffffff?text=よつばと" },
  { id: "70", title: "文豪ストレイドッグス", reading: "ぶんごうすとれいどっぐす", author: "朝霧カフカ", genre: "青年", publisher: "KADOKAWA", totalVolumes: 24, coverColor: "from-slate-500 to-purple-500", coverUrl: "https://placehold.co/150x220/64748b/ffffff?text=文スト" },
  { id: "71", title: "新世紀エヴァンゲリオン", reading: "しんせいきえゔぁんげりおん", author: "貞本義行", genre: "SF", publisher: "KADOKAWA", totalVolumes: 14, coverColor: "from-purple-600 to-green-500", coverUrl: "https://placehold.co/150x220/9333ea/ffffff?text=EVA" },
  { id: "72", title: "涼宮ハルヒの憂鬱", reading: "すずみやはるひのゆううつ", author: "ツガノガク", genre: "少年", publisher: "KADOKAWA", totalVolumes: 20, coverColor: "from-blue-500 to-yellow-500", coverUrl: "https://placehold.co/150x220/3b82f6/ffffff?text=ハルヒ" },
  { id: "73", title: "ケロロ軍曹", reading: "けろろぐんそう", author: "吉崎観音", genre: "少年", publisher: "KADOKAWA", totalVolumes: 33, coverColor: "from-green-500 to-yellow-400", coverUrl: "https://placehold.co/150x220/22c55e/ffffff?text=ケロロ" },
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
  onRemove: (index: number) => void;
}

function SortableBookItem({ book, index, onRemove }: SortableBookItemProps) {
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

  // 拡大サイズ（モバイル100px幅 → 表紙が認識できるギリギリのサイズ）
  // 比率 2:3 (幅:高さ) で書籍カバーに最適
  const baseSize = 'w-[100px] h-[150px] sm:w-28 sm:h-[168px] md:w-36 md:h-[216px]';

  // フローティングシャドウ（美術館スタイル）
  const shadowStyle = 'shadow-lg hover:shadow-2xl';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col items-center gap-1 relative group"
    >
      <div
        {...attributes}
        {...listeners}
        className={`${baseSize} bg-gradient-to-br ${book.manga.coverColor} rounded-lg ${shadowStyle} hover:scale-105 hover:-translate-y-1 transition-all cursor-grab active:cursor-grabbing border border-white/50 overflow-hidden relative`}
      >
        <img src={book.manga.coverUrlPerVolume?.[book.volume] ?? book.manga.coverUrl} alt={book.manga.title} className="w-full h-full object-contain" />
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
      <span className="text-[8px] sm:text-[9px] font-medium text-gray-400">{book.volume}巻</span>
    </div>
  );
}

export default function Home() {
  // Issue #3: Toast deduplication refs
  const lastToastMessageRef = useRef<string>('');
  const lastToastTimeRef = useRef<number>(0);

  // Issue #4: AbortController for search cancellation
  const abortControllerRef = useRef<AbortController | null>(null);


  const [selectedBooks, setSelectedBooks] = useState<SelectedBook[]>([]);
  const [currentGenre, setCurrentGenre] = useState('all');
  const [currentPublisher, setCurrentPublisher] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // mode は 'gallery' に固定（本棚テーマは著作権配慮で削除）
  const mode = 'gallery';
  const isMobile = useIsMobile();

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
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Show toast
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Issue #3: Show toast with deduplication
  const showToastMessageOnce = (message: string) => {
    const now = Date.now();
    if (
      message === lastToastMessageRef.current &&
      now - lastToastTimeRef.current < 500
    ) {
      return;
    }
    lastToastMessageRef.current = message;
    lastToastTimeRef.current = now;
    showToastMessage(message);
  };

  // Volume data for drawer (fetched from API when drawer opens)
  const [volumeData, setVolumeData] = useState<Record<string, Book[]>>({});
  const [loadingVolumes, setLoadingVolumes] = useState(false);

  // AbortController for canceling volume fetch requests (競合状態対策)
  const volumeFetchControllerRef = useRef<AbortController | null>(null);

  // Disabled: Fetch initial popular manga on page load
  // We now show MOCK_MANGA_DATA initially for faster load and no API errors
  /*
  const fetchInitialData = async () => {
    try {
      setIsSearching(true);
      setSearchError(null);

      // Fetch popular titles from MOCK_MANGA_DATA (top 15 titles)
      const titlesToFetch = MOCK_MANGA_DATA.slice(0, 15).map(m => m.title);
      const allResults: Book[] = [];

      for (const title of titlesToFetch) {
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(title)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.books && Array.isArray(data.books)) {
              allResults.push(...data.books);
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch ${title}:`, err);
        }
      }

      // Consolidate volumes and set results
      const consolidated = consolidateToFirstVolume(allResults);
      setApiSearchResults(consolidated);
      
      // Clear any previously selected books from mock data
      setSelectedBooks([]);
      
      setInitialLoadComplete(true);
    } catch (error) {
      console.error('Initial data fetch error:', error);
      setSearchError('初期データの取得に失敗しました');
    } finally {
      setIsSearching(false);
    }
  };

  // Load initial data on mount
  React.useEffect(() => {
    fetchInitialData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  */

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
    const shareUrl = `${siteUrl}?books=${encodeURIComponent(bookIds)}&title=${encodeURIComponent(appraisalResult?.soulTitle || '')}`;

    const text = `【鑑定完了】私の5冊はこれ！

・${bookTitles}

二つ名『${appraisalResult?.soulTitle}』

▶ ${shareUrl}

#わたしの五冊 #おすすめの５冊`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
  };

  // Filter manga - use MOCK_MANGA_DATA when not searching, API results when searching
  const filteredManga = (() => {
    // If user is actively searching, use API results directly (no grouping)
    // Red Team Fix: If query exists, ALWAYS return API results (even if empty)
    // Do not fallback to popular manga, to avoid confusing the user.
    if (searchQuery.trim()) {
      // Apply genre and publisher filters if needed
      let filtered = apiSearchResults;

      if (currentGenre !== 'all') {
        filtered = filtered.filter(manga => manga.genre === currentGenre);
      }

      if (currentPublisher !== 'all') {
        filtered = filtered.filter(manga => manga.publisher?.includes(currentPublisher));
      }

      return filtered;
    }

    // Otherwise, show popular manga data with real book covers from Rakuten API
    // Note: Popular data is manually curated and doesn't need consolidation
    const basicFiltered = (popularMangaData as any[]).filter((manga: any) => {
      const matchesGenre = currentGenre === 'all' || manga.genre === currentGenre;
      const matchesPublisher = currentPublisher === 'all' || manga.publisher?.includes(currentPublisher);
      return matchesGenre && matchesPublisher;
    });

    return basicFiltered;
  })();

  // API search function
  const performApiSearch = async (query: string) => {
    if (!query.trim()) {
      setApiSearchResults([]);
      return;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchApiResponse = await response.json();
      const books: Book[] = (data.books || []).map((book: any, index: number) => ({
        id: book.id ? String(book.id) : String(1000 + index),
        title: book.title || '',
        reading: '',
        author: book.author || '',
        genre: '検索結果',
        publisher: book.publisher || '',
        totalVolumes: book.volumeNumber || 1, // API returns volumeNumber, use it as current volume indicator
        coverColor: 'from-gray-400 to-gray-600',
        coverUrl: book.coverUrl || '',
        itemUrl: undefined,
      }));

      setApiSearchResults(books);

      // Handle Search State
      const state = data.searchState;

      if (state) {
        if (state.type === 'CONFIDENT_MATCH' && books.length > 0) {
          // トースト通知のみ（ユーザーが検索結果から手動で選択）
          showToastMessage(`「${state.recognizedTitle}」が見つかりました`);
        } else if (state.type === 'AMBIGUOUS_MATCH') {
          showToastMessageOnce(state.message || 'もしかして、どれか近いものはありますか？');
        } else if (state.type === 'NOT_FOUND') {
          // setSearchError(state.message); // UI側で標準メッセージを出すため、ここではエラーセットしない方が自然かもだが、Red Team指示に従いメッセージを出すなら残す。
          // しかしRed Teamは「見つかりません」のUX改善を求めている。
          // 検索結果0件の場合、filteredManga.length === 0 のUIが表示される。
          // ここでsearchErrorを入れると、エラー表示優先になる可能性があるが、現在のUI実装ではsearchErrorの表示箇所がない？
          // searchError state is used... actually where is it used?
          // Looking at the JSX... wait, I don't see searchError being rendered in the main content area in the previous view_file output.
          // It might be used for Toast or something?
          // Ah, I see setSearchError('検索に失敗しました') in catch block.
          // Let's keep it for now, but the main "No results" UI is handled by filteredManga.length === 0.
        } else if (state.type === 'TITLE_ONLY') {
          // setSearchError(state.subMessage || state.message);
        } else {
          console.warn(`Unknown searchState type: ${state.type}`);
        }
      } else {
        console.warn('[Search] searchState is undefined');
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Search aborted');
        return;
      }
      console.error('Search error:', error);
      // Only set error if not aborted
      setSearchError('検索に失敗しました');
      setApiSearchResults([]);
    } finally {
      // Only turn off loading if this is the active controller (or if we didn't use one?)
      // Actually, if aborted, we might not want to turn off loading if a new one started?
      // But setIsSearching is global.
      // Ideally: if (abortControllerRef.current === controller) setIsSearching(false);
      if (abortControllerRef.current === controller) {
        setIsSearching(false);
        abortControllerRef.current = null;
      }
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performApiSearch(searchQuery);
      } else {
        setApiSearchResults([]);
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      // Abort active request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Fetch volumes for a manga from API (max 30 volumes)
  const fetchVolumesForManga = async (manga: Book) => {
    // Skip if already fetched
    if (volumeData[manga.id]) return;

    // Cancel any previous request (競合状態対策)
    if (volumeFetchControllerRef.current) {
      volumeFetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    volumeFetchControllerRef.current = controller;

    setLoadingVolumes(true);
    try {
      // 1. Prepare search query for volumes
      // Use reading (kana) if available, otherwise clean up the title
      let searchQuery = manga.reading || '';

      if (!searchQuery) {
        // Remove volume numbers to get the series title
        const baseTitle = manga.title.replace(/\s?(第?\d+巻?|vol\.?\d+|\(\d+\)|（\d+）)$/i, '').trim();
        searchQuery = baseTitle;
      }

      // 2. Handle ONE PIECE specifically (Hardcoded data is trusted)
      if (isOnePiece(manga.title) || manga.title.includes('ONE PIECE') || manga.title.includes('ワンピース')) {
        const onePieceBooks: Book[] = ONE_PIECE_VOLUMES.map(v => ({
          id: v.isbn,
          title: v.title,
          reading: 'わんぴーす',
          author: '尾田栄一郎',
          coverUrl: v.coverUrl,
          genre: '少年コミック',
          totalVolumes: 110,
          coverColor: 'from-red-400 to-orange-500',
          itemUrl: `https://books.rakuten.co.jp/rb/${v.isbn}/`,
          volumeNumber: v.volume,
        }));

        setVolumeData(prev => ({
          ...prev,
          [manga.id]: onePieceBooks
        }));
        setLoadingVolumes(false);
        return;
      }

      // 3. Call the dedicated Volumes API with AbortController
      const response = await fetch(
        `/api/volumes?titleKana=${encodeURIComponent(searchQuery)}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const volumes: Book[] = data.books || [];

      // 4. Update State (only if not aborted)
      if (!controller.signal.aborted) {
        setVolumeData(prev => ({
          ...prev,
          [manga.id]: volumes
        }));
      }

    } catch (error) {
      // Ignore AbortError (expected when user clicks another item)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Volume fetch aborted (user clicked another item)');
        return;
      }
      console.error('Error fetching volumes:', error);
    } finally {
      // Only reset loading if this is still the active request
      if (volumeFetchControllerRef.current === controller) {
        setLoadingVolumes(false);
      }
    }
  };

  // Open drawer for volume selection (with spam protection)
  const openDrawer = async (manga: Book) => {
    // Spam protection: ignore if already opening for the same manga
    if (selectedManga?.id === manga.id && drawerOpen) {
      return;
    }

    // If loading, cancel previous and start new
    // (AbortController already handles API cancellation)

    setSelectedManga(manga);
    setDrawerOpen(true);

    // Fetch volume data in background
    await fetchVolumesForManga(manga);
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

      // Get the correct cover URL for the selected volume from volumeData
      const volumeBooks = volumeData[manga.id] || [];
      const selectedVolumeBook = volumeBooks.find(b => extractVolumeNumber(b.title) === volume);
      const mangaWithCorrectCover = {
        ...manga,
        coverUrl: selectedVolumeBook?.coverUrl || manga.coverUrl
      };

      setSelectedBooks(prev => [...prev, { manga: mangaWithCorrectCover, volume }]);
    }
    closeDrawer();
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

    // Generate preview image for responsive display - DISABLED client-side generation
    /*
    setTimeout(async () => {
      // Preview logic removed to avoid CORS issues
    }, 1500);
    */

    // Typing effect
    for (let i = 0; i <= soulTitle.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setDisplayedTitle(soulTitle.slice(0, i));
    }

    // Show details after typing completes (2.5 seconds after result)
    setTimeout(() => setShowDetails(true), 500);
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

      // Generate smart share text with book titles
      // 100点の並び順: タイトル → 空行 → 決め台詞+ハッシュタグ → 空行 → URL（最後）
      const MAX_TWITTER_LENGTH = 280;
      const URL_RESERVED_LENGTH = 23; // t.co shortened URL length
      const BUFFER = 5; // Safety buffer

      // Prepare book titles (trim long titles to 15 chars)
      const bookTitles = selectedBooks.map(book => {
        const title = book.manga.title;
        return title.length > 15 ? title.substring(0, 15) + '...' : title;
      });

      // Create tagline based on category
      const tagline = category === 'recommend'
        ? '今読んでほしい、5つのマンガ。 #THE_FIVE'
        : '私を構成する、5つのマンガ。 #THE_FIVE';

      // Calculate available length for book list
      const availableLength = MAX_TWITTER_LENGTH - URL_RESERVED_LENGTH - tagline.length - 6 - BUFFER; // 6 = 空行x2

      // Try to fit all books, otherwise reduce
      let bookListText = '';

      // Pattern A: All 5 books (改行区切り、・なし)
      const fullList = bookTitles.join('\n');
      if (fullList.length + tagline.length + 6 <= MAX_TWITTER_LENGTH - URL_RESERVED_LENGTH - BUFFER) {
        bookListText = fullList;
      }
      // Pattern B: 4 books + "ほか1作"
      else if ((bookTitles.slice(0, 4).join('\n') + '\nほか1作').length + tagline.length + 6 <= MAX_TWITTER_LENGTH - URL_RESERVED_LENGTH - BUFFER) {
        bookListText = bookTitles.slice(0, 4).join('\n') + '\nほか1作';
      }
      // Pattern C: 3 books + "ほか2作"
      else {
        bookListText = bookTitles.slice(0, 3).join('\n') + '\nほか2作';
      }

      // 100点の並び順: タイトル → 空行 → 決め台詞+ハッシュタグ
      // URLは別パラメータで最後に追加
      const finalText = `${bookListText}\n\n${tagline}`;

      const shareText = encodeURIComponent(finalText);
      const encodedUrl = encodeURIComponent(shelfUrl);

      // Detect mobile and try to open X app directly
      const isNativeMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isNativeMobileDevice) {
        // Try X app first with intent URL
        // URLを最後に配置（text内ではなくurl=パラメータで）
        const xAppUrl = `twitter://post?message=${shareText}%0A%0A${encodedUrl}`;
        const webUrl = `https://twitter.com/intent/tweet?text=${shareText}%0A%0A&url=${encodedUrl}`;

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
        // URLを最後に配置
        const xUrl = `https://twitter.com/intent/tweet?text=${shareText}%0A%0A&url=${encodedUrl}`;
        window.open(xUrl, '_blank');
      }

      // Toast message removed - no actual shelf save feature
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
              <Link
                href="/"
                className="cursor-pointer inline-block touch-manipulation"
              >
                <h1
                  className="text-5xl font-bold tracking-wide select-none"
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
                人生で最も記憶に残っているマンガ、<br className="sm:hidden" />
                今おすすめしたいマンガを５冊選んで、<br />
                あなただけの本棚を作りましょう。
              </p>
            </div>



            {/* Category Selection - 本棚タイトル選択 */}
            <div className="flex flex-col items-center gap-2 mt-6">
              <p className="text-sm font-medium text-gray-400">本棚のタイトル</p>
              <div className="glass-card flex rounded-full p-2 gap-2 w-full max-w-[400px]">
                <button
                  onClick={() => setCategory('identity')}
                  className={`flex-1 min-w-0 py-3 px-6 rounded-full text-sm font-medium transition-all flex items-center justify-center whitespace-nowrap ${category === 'identity'
                    ? 'bg-gradient-to-r from-slate-600 to-gray-700 text-white shadow-lg ring-2 ring-slate-400 font-bold'
                    : 'bg-white/50 text-gray-500 hover:text-gray-700'
                    }`}
                >
                  私を形作る5冊
                </button>
                <button
                  onClick={() => setCategory('recommend')}
                  className={`flex-1 min-w-0 py-3 px-6 rounded-full text-sm font-medium transition-all flex items-center justify-center whitespace-nowrap ${category === 'recommend'
                    ? 'bg-gradient-to-r from-slate-600 to-gray-700 text-white shadow-lg ring-2 ring-slate-400 font-bold'
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
              <p className="text-sm text-gray-500">この順番で表紙が並びます</p>
              <p className="text-xs text-gray-400 mt-1 md:hidden">※ ドラッグで順番を変更できます</p>
            </div>

            <div className="flex justify-center w-full px-2 md:px-0">
              <div className="relative w-full max-w-4xl min-h-[420px] sm:min-h-[460px] md:h-[550px] rounded-2xl overflow-hidden shadow-2xl flex flex-col border transition-all duration-300 border-gray-200 bg-white">
                {/* Background - gallery style */}
                <div className="absolute inset-0" style={{ backgroundColor: '#FAF9F6' }} />

                {/* Top Title */}
                <div className="relative z-20 py-4 px-6 text-center border-b border-gray-200/50">
                  <h2
                    className="text-lg sm:text-xl md:text-2xl tracking-wide"
                    style={{ fontFamily: "'Shippori Mincho', serif", color: '#1A1A1A', fontWeight: 300 }}
                  >
                    {category === 'recommend' ? 'Recommended' : 'My Best Five'}
                  </h2>
                  <p className="text-[10px] sm:text-xs tracking-widest uppercase mt-1" style={{ color: '#666', fontWeight: 400, fontFamily: "'Shippori Mincho', serif", letterSpacing: '0.1em' }}>
                    {category === 'recommend' ? '今読んでほしい、5冊。' : '私を形作る、5冊。'}
                  </p>
                </div>

                {/* Books Area with Drag and Drop - Museum Gallery Style */}
                <div className="relative z-10 flex-1 p-4 md:p-8 flex flex-col items-center justify-center gap-4 md:gap-6">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedBooks.map((b) => `${b.manga.id}-${b.volume}`)}
                      strategy={rectSortingStrategy}
                    >
                      {/* 2-row layout: Top row (3 books), Bottom row (2 books) */}
                      <div className="flex flex-col items-center gap-4 md:gap-8 w-full">
                        {/* Top Row - 3 books */}
                        <div className="flex items-center justify-center gap-3 md:gap-8">
                          {[0, 1, 2].map((i) => {
                            const book = selectedBooks[i];
                            const baseSize = 'w-[100px] h-[150px] sm:w-28 sm:h-[168px] md:w-36 md:h-[216px]';

                            if (book) {
                              return (
                                <SortableBookItem
                                  key={`${book.manga.id}-${book.volume}`}
                                  book={book}
                                  index={i}
                                  onRemove={removeBook}
                                />
                              );
                            } else {
                              return (
                                <div key={`empty-${i}`} className="flex flex-col items-center gap-1">
                                  <div
                                    className={`${baseSize} rounded-lg border-2 border-dashed border-gray-200 bg-white/50 flex items-center justify-center shadow-sm`}
                                  >
                                    <span className="text-xl font-extralight text-gray-300">{i + 1}</span>
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                        {/* Bottom Row - 2 books */}
                        <div className="flex items-center justify-center gap-3 md:gap-8">
                          {[3, 4].map((i) => {
                            const book = selectedBooks[i];
                            const baseSize = 'w-[100px] h-[150px] sm:w-28 sm:h-[168px] md:w-36 md:h-[216px]';

                            if (book) {
                              return (
                                <SortableBookItem
                                  key={`${book.manga.id}-${book.volume}`}
                                  book={book}
                                  index={i}
                                  onRemove={removeBook}
                                />
                              );
                            } else {
                              return (
                                <div key={`empty-${i}`} className="flex flex-col items-center gap-1">
                                  <div
                                    className={`${baseSize} rounded-lg border-2 border-dashed border-gray-200 bg-white/50 flex items-center justify-center shadow-sm`}
                                  >
                                    <span className="text-xl font-extralight text-gray-300">{i + 1}</span>
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    </SortableContext>
                  </DndContext>

                  {/* Instruction Text */}
                  <div className="text-center mt-2">
                    <p className="text-xs sm:text-sm text-gray-400">
                      {selectedBooks.length === 5 ? (
                        <>
                          {/* Mobile: show long-press message */}
                          <span className="sm:hidden animate-pulse text-blue-400">
                            長押しで並び替え
                          </span>
                          {/* Desktop: show drag message */}
                          <span className="hidden sm:inline animate-pulse text-blue-400">
                            ドラッグで並び替え
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400">本を選んでください（{selectedBooks.length}/5冊）</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="relative z-20 py-2 text-center flex items-center justify-between px-6">
                  <p className="text-gray-400 text-[10px] tracking-widest w-full text-center">2026.01</p>
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
                  <div className="flex flex-col sm:flex-row gap-3 items-center w-full justify-center">
                    <button
                      onClick={shareToXWithSave}
                      disabled={!isFull || isSaving}
                      className={`px-20 py-4 rounded-xl text-lg font-bold transition transform active:scale-95 tracking-wide flex items-center gap-3 shadow-xl ${isFull && !isSaving
                        ? 'bg-black text-white hover:bg-gray-800 hover:scale-105'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                      <span className="text-2xl">𝕏</span>
                      <span>{isSaving ? '保存中...' : 'で結果をシェア'}</span>
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
                      placeholder="タイトルで検索"
                      className="w-full px-5 py-4 pr-12 rounded-xl border-2 border-blue-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-gray-700 font-medium placeholder:text-gray-400 placeholder:text-xs sm:placeholder:text-base text-base"
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

              {/* Publisher Section */}
              <div className="space-y-2 mt-4">
                <p className="text-xs font-medium text-gray-500">出版社から探す</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {PUBLISHERS.map((publisher) => (
                    <button
                      key={publisher}
                      onClick={() => setCurrentPublisher(publisher)}
                      className={`
                        px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border-2
                        ${currentPublisher === publisher
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-500'
                        }
                      `}
                    >
                      {publisher === 'all' ? 'すべて' : publisher}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendations when search is empty */}
              {!searchQuery.trim() && currentGenre === 'all' && (
                <div className="mt-6 pt-4 border-t border-gray-200/50">
                  <p className="text-xs font-medium text-gray-500 mb-3">みんなが選んでいる作品</p>
                  <div className="flex flex-wrap gap-2">
                    {(popularMangaData as any[]).slice(0, 8).map((manga: any, i) => (
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
                  <p className="text-gray-400 mb-2">検索結果がありません</p>
                  {searchQuery && (
                    <p className="text-sm text-gray-500">
                      「<span className="font-bold text-gray-700">{searchQuery}</span>」に一致するマンガは見つかりませんでした
                    </p>
                  )}
                </div>
              ) : (
                filteredManga.map((manga) => (
                  <BookSearchResultItem
                    key={manga.id}
                    manga={manga}
                    isSelected={selectedBooks.some(b => b.manga.id === manga.id)}
                    onClick={openDrawer}
                  />
                ))
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
          <div className="mt-4 text-center">
            {/* Rakuten Credit */}
            <a
              href="https://webservice.rakuten.co.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Supported by Rakuten Developers
            </a>
          </div>
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
                <div
                  onClick={() => selectedManga && selectVolume(selectedManga, 1)}
                  className={`w-16 h-24 bg-gradient-to-br ${selectedManga?.coverColor} rounded-lg shadow-lg overflow-hidden cursor-pointer hover:scale-105 hover:ring-2 hover:ring-blue-400 transition-all`}
                  title="1巻を本棚に追加"
                >
                  <img src={selectedManga?.coverUrl} alt={selectedManga?.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{selectedManga?.title}</h3>
                  <p className="text-sm text-gray-500">{selectedManga?.author}</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">全{(() => {
                    const vols = volumeData[selectedManga?.id || ''] || [];
                    const maxVolNum = vols.length > 0 ? Math.max(...vols.map(v => v.volumeNumber || 0)) : 0;
                    return maxVolNum || selectedManga?.totalVolumes || '?';
                  })()}巻</p>
                </div>
              </div>

              {/* Volume Selector */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">どの巻を本棚に飾りますか？</p>
                {loadingVolumes && (
                  <p className="text-xs text-gray-500 mb-2">巻データを読み込み中...</p>
                )}
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                  {(() => {
                    const vols = volumeData[selectedManga?.id || ''] || [];
                    const maxVolNum = vols.length > 0 ? Math.max(...vols.map(v => v.volumeNumber || 0)) : 0;
                    const totalVols = maxVolNum || selectedManga?.totalVolumes || 0;
                    return Array.from({ length: totalVols }, (_, i) => i + 1);
                  })().map((vol) => {
                    const isSelected = selectedBooks.some(b => b.manga.id === selectedManga?.id && b.volume === vol);

                    // Try to get cover from API-fetched volume data
                    const volumeBooks = volumeData[selectedManga?.id || ''] || [];
                    const volumeBook = volumeBooks.find(b => b.volumeNumber === vol);
                    const volumeCoverUrl = volumeBook?.coverUrl;


                    return (
                      <div
                        key={vol}
                        onClick={() => selectedManga && selectVolume(selectedManga, vol)}
                        className={`flex-shrink-0 cursor-pointer transition-all ${isSelected ? 'scale-110' : ''}`}
                      >
                        <div className={`w-16 h-24 rounded-lg shadow-md relative overflow-hidden ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-105'}`}>
                          {volumeCoverUrl ? (
                            <>
                              <img
                                src={volumeCoverUrl}
                                alt={`${selectedManga?.title} ${vol}巻`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-1">
                                <span className="text-white text-xs font-bold drop-shadow">{vol}巻</span>
                              </div>
                            </>
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${selectedManga?.coverColor} flex items-end justify-center pb-1`}>
                              <span className="text-white text-xs font-bold drop-shadow">{vol}巻</span>
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold z-10">
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
      {/* Hidden Share Cards for html-to-image capture - MUST be outside modal for reliable rendering */}


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
                    onClick={shareToXWithSave}
                    disabled={isSaving}
                    className="w-full px-8 py-4 bg-black hover:bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl transition transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                  >
                    {isSaving ? (
                      <span className="animate-pulse">保存中...</span>
                    ) : (
                      <>
                        <span className="text-xl">𝕏</span>
                        <span>でシェア</span>
                      </>
                    )}
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
                      href="https://x.com/flj9r"
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
                    当サイトの利用によって生じた損害やトラブルについて、運営者は一切の責任を負いかねます。あらかじめご了承ください。
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
