'use client';

import { useState, useEffect, useCallback } from 'react';
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

// 巻数を検出する正規表現パターン
const VOLUME_PATTERNS = [
  /第(\d+)巻/,           // 第1巻
  /(\d+)巻/,             // 1巻
  /\((\d+)\)/,           // (1)
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
  let base = title;
  for (const pattern of VOLUME_PATTERNS) {
    base = base.replace(pattern, '').trim();
  }
  return base;
}

// 検索結果を1巻に集約（同じベースタイトルの中で最も若い巻数のみを残す）
function consolidateToFirstVolume(manga: Book[]): Book[] {
  const titleMap = new Map<string, Book>();

  for (const book of manga) {
    const baseTitle = getBaseTitle(book.title);
    const volumeNum = extractVolumeNumber(book.title) ?? 1;

    const existing = titleMap.get(baseTitle);
    if (!existing) {
      titleMap.set(baseTitle, book);
    } else {
      const existingVolume = extractVolumeNumber(existing.title) ?? 1;
      if (volumeNum < existingVolume) {
        titleMap.set(baseTitle, book);
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

// Mock AI appraisals
const MOCK_APPRAISALS: Record<string, { titles: string[]; analysis: string }> = {
  '少年': {
    titles: ['熱血の求道者', '永遠の挑戦者', '覇道を歩む者', '不屈の闘志'],
    analysis: 'あなたの魂には「挑戦」と「成長」への飽くなき渇望が宿っています。困難に立ち向かうヒーローたちの物語に惹かれるあなたは、自身も常に高みを目指し続ける生き方を選んでいます。'
  },
  '少女': {
    titles: ['純愛の守護者', '心の翻訳者', '感情の錬金術師', '絆を紡ぐ者'],
    analysis: 'あなたの魂は「人と人との繋がり」を何より大切にしています。登場人物の心の機微を丁寧に描いた作品を好むあなたは、共感力と想像力に満ちた、温かい心の持ち主です。'
  },
  '青年': {
    titles: ['深淵の思索者', '真実の探求者', '暗黒を見据える者', '現実の解読者'],
    analysis: 'あなたの魂は表面的な物語では満足しません。人間の本質、社会の闇、生と死の境界線——そういった深いテーマに真正面から向き合う強さを持っています。'
  },
  'SF': {
    titles: ['未来の預言者', '科学の夢想家', '可能性の開拓者', '時空を超える者'],
    analysis: 'あなたの魂は「まだ見ぬ世界」への強い好奇心で満ちています。テクノロジーと人間性の交差点に興味を持つあなたは、既存の枠にとらわれない自由な発想の持ち主です。'
  },
  'ファンタジー': {
    titles: ['異界の旅人', '魔法を纏う者', '神話の継承者', '冒険の化身'],
    analysis: 'あなたの魂は日常を超えた「可能性」を信じています。魔法や冒険に惹かれるあなたは、現実世界でも創造性と想像力を武器に、自分だけの道を切り開いていく力を持っています。'
  },
  '恋愛': {
    titles: ['愛の哲学者', '心の架け橋', '永遠を誓う者', '運命の紡ぎ手'],
    analysis: 'あなたの魂は「愛」という普遍的なテーマに深い関心を持っています。人を愛し、愛されることの尊さを知るあなたは、日々の中にある小さな幸せを見つける目を持っています。'
  },
  'mixed': {
    titles: ['多彩なる魂', '越境者', '全てを愛する者', '無限の可能性'],
    analysis: 'あなたの読書傾向は一つのジャンルに収まりません。様々なジャンルを横断するあなたは、多角的な視点と豊かな感受性を持ち、どんな世界観も受け入れられる柔軟な精神の持ち主です。'
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col items-center gap-2 relative group"
    >
      <div
        {...attributes}
        {...listeners}
        className={`${baseSize} bg-gradient-to-br ${book.manga.coverColor} rounded shadow-lg hover:scale-105 hover:-translate-y-2 transition-all cursor-grab active:cursor-grabbing border-2 ${mode === 'magazine' ? 'border-white/30' : 'border-white'} overflow-hidden relative`}
      >
        <img src={book.manga.coverUrl} alt={book.manga.title} className="w-full h-full object-cover" />
        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="absolute top-1 right-1 w-5 h-5 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
        >
          <span className="text-gray-700 text-xs font-bold">×</span>
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
  const [mode, setMode] = useState<'magazine' | 'gallery'>('magazine');

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedManga, setSelectedManga] = useState<Book | null>(null);

  // Modal state
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);
  const [isAppraising, setIsAppraising] = useState(false);
  const [appraisalResult, setAppraisalResult] = useState<AppraisalResult | null>(null);
  const [displayedTitle, setDisplayedTitle] = useState('');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
    const bookTitles = selectedBooks.map((b) => b.manga.title).join('\n・');
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const bookIds = selectedBooks.map((b) => `${b.manga.id}-${b.volume}`).join(',');
    const shareUrl = `${siteUrl}?books=${encodeURIComponent(bookIds)}&title=${encodeURIComponent(appraisalResult.soulTitle)}`;

    const text = `【鑑定完了】私の人生を形作る5冊はこれ！

▪︎ 選んだ5冊
・${bookTitles}

▪︎ AIが授けた私の二つ名は…
　『 ${appraisalResult.soulTitle} 』

　あなたの最高の5冊は？ここで鑑定 ▷
${shareUrl}

#THE_FIVE #マンガ鑑定 #私を構成する5冊`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
  };

  // Filter manga
  const filteredManga = (() => {
    // Step 1: ジャンル・検索語でフィルター
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

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    const dominantGenre = getDominantGenre();
    const appraisal = MOCK_APPRAISALS[dominantGenre];
    const soulTitle = appraisal.titles[Math.floor(Math.random() * appraisal.titles.length)];

    setAppraisalResult({ soulTitle, analysis: appraisal.analysis });
    setIsAppraising(false);

    // Typing effect
    for (let i = 0; i <= soulTitle.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setDisplayedTitle(soulTitle.slice(0, i));
    }
  };

  // Save image based on current mode
  const saveImage = async () => {
    const cardId = mode === 'magazine' ? 'share-card-full' : 'share-card-simple';
    const card = document.getElementById(cardId);
    if (!card || typeof window === 'undefined') return;

    try {
      const dataUrl = await htmlToImage.toPng(card, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: mode === 'gallery' ? '#FAF9F6' : undefined,
      });

      const link = document.createElement('a');
      link.download = `the-five-${mode}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      showToastMessage('画像を保存しました！Xに添付してシェアしよう！');
    } catch (error) {
      console.error('Image save error:', error);
      showToastMessage('画像の保存中にエラーが発生しました。');
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
              <p
                className="mt-2 text-sm opacity-70"
                style={{ fontFamily: "'Kaisei Tokumin', serif", letterSpacing: '0.12em' }}
              >
                私を形作る、5つの物語。
              </p>
            </div>

            {/* Description */}
            <div className="max-w-xl text-center px-4">
              <p
                className="text-base leading-loose opacity-85"
                style={{ fontFamily: "'Kaisei Tokumin', serif", lineHeight: '2' }}
              >
                好きなマンガ、そして人生で最も記憶に残っている<br />
                <span className="font-bold text-lg">5冊</span>を選んでください。
              </p>
              <p
                className="text-sm mt-3 opacity-70 leading-relaxed"
                style={{ fontFamily: "'Kaisei Tokumin', serif'" }}
              >
                5つの表紙を1枚の美しい画像にまとめるとともに、<br />
                AIがあなたの感性を読み解き、特別な<span className="font-semibold">「二つ名」</span>を命名します。
              </p>
              <p
                className="text-xs mt-3 opacity-50"
                style={{ fontFamily: "'Kaisei Tokumin', serif" }}
              >
                ※AIによる命名のない5冊の表紙だけの画像も作れます。
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex flex-col items-center gap-2 mt-10">
              <p className="text-sm font-medium text-gray-400">モードを選択</p>
              <div className="glass-card flex rounded-full p-1.5 gap-1">
                <button
                  onClick={() => setMode('magazine')}
                  className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${mode === 'magazine'
                    ? 'bg-white shadow-md font-bold text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  二つ名あり
                </button>
                <button
                  onClick={() => setMode('gallery')}
                  className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${mode === 'gallery'
                    ? 'bg-white shadow-md font-bold text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  二つ名なし
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
                      <p className="text-white/50 text-[10px] tracking-[0.3em] uppercase mb-2">YOUR SOUL NAME</p>
                      <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg">
                        あなたの二つ名
                      </h2>
                    </>
                  ) : (
                    <>
                      <h2
                        className="text-4xl font-bold tracking-wide"
                        style={{ fontFamily: "'Shippori Mincho', serif", color: '#1A1A1A' }}
                      >
                        私の５冊
                      </h2>
                      <p className="text-xs tracking-[0.3em] uppercase mt-2" style={{ color: '#666', fontWeight: 500 }}>
                        THE FIVE
                      </p>
                    </>
                  )}
                </div>

                {/* Books Area with Drag and Drop */}
                <div className="relative z-10 flex-1 p-2 md:p-4 flex flex-col items-center justify-center">
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
                        <span className={`animate-pulse ${mode === 'magazine' ? 'text-amber-300' : 'text-blue-500'}`}>
                          ✨ ドラッグで並び替えできます（スマホは長押し）
                        </span>
                      ) : (
                        <>本を選んでください（{selectedBooks.length}/5冊）</>
                      )}
                    </p>
                    {selectedBooks.length > 0 && (
                      <button
                        onClick={resetSelection}
                        className={`text-xs mt-2 transition ${mode === 'magazine' ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        🗑️ 選択をリセット
                      </button>
                    )}
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
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={startAppraisal}
                  disabled={!isFull}
                  className="px-20 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-2xl font-bold hover:from-blue-700 hover:to-indigo-700 transition shadow-xl shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 tracking-wide"
                >
                  生成する
                </button>
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
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="マンガを検索...（例：ワンピ、スラダン）"
                  className="flex-1 px-5 py-3.5 rounded-xl border-0 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner text-gray-700 font-medium placeholder:text-gray-400"
                />
                <button className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-lg shadow-blue-500/25">
                  検索
                </button>
              </div>

              {/* Genre Section with Label */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">📚 カテゴリーから探す</p>
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
                  <p className="text-xs font-medium text-gray-500 mb-3">🔥 みんなが選んでいる作品</p>
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
          <section className="mb-8">
            <div className="text-center mb-3">
              <h2 className="text-base font-bold text-gray-800 mb-0.5">検索結果</h2>
              <p className="text-xs text-gray-500">1巻のサムネイルをタップして巻を選択</p>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {filteredManga.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-400">検索結果がありません</p>
                </div>
              ) : (
                filteredManga.map((manga) => {
                  const isSelected = selectedBooks.some(b => b.manga.id === manga.id);
                  return (
                    <div
                      key={manga.id}
                      onClick={() => openDrawer(manga)}
                      className="group cursor-pointer"
                    >
                      <div
                        className={`book-card aspect-[2/3] bg-gradient-to-br ${manga.coverColor} rounded-xl shadow-lg mb-2 relative overflow-hidden ${isSelected ? 'book-selected' : ''}`}
                      >
                        <img
                          src={manga.coverUrl}
                          alt={manga.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                          全{manga.totalVolumes}巻
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
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
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="py-8 mt-12">
          <p className="text-center text-sm text-gray-500 font-medium">THE FIVE © 2026</p>
          <p className="text-center text-xs text-gray-400 mt-1">最高の5冊を選び、AIに鑑定してもらおう</p>
        </footer>
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

      {/* AI Appraisal Modal */}
      <div className={`modal fixed inset-0 z-[60] flex items-center justify-center p-4 ${showAppraisalModal ? 'open' : ''}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 bg-fade" />
        <div className="modal-content relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {isAppraising ? (
            <div className="text-center py-20">
              <div className="loading-pulse inline-block mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl">
                  <span className="text-4xl">📚</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">あなたの魂を鑑定中...</h3>
              <p className="text-white/60 text-sm">選ばれた5冊から、あなたの本質を読み解いています</p>
              <div className="flex justify-center gap-1 mt-4">
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          ) : appraisalResult && (
            <div>
              {/* Share Card (for capture) */}
              <div id="share-card-full" className="relative mx-auto rounded-2xl overflow-hidden" style={{ width: 800, aspectRatio: '16/9' }}>
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div className="absolute inset-0 bg-white/25" />
                <div className="relative z-10 h-full flex flex-col justify-between p-6">
                  <div className="text-center">
                    <p className="text-white/50 text-[10px] tracking-[0.3em] uppercase mb-2">YOUR SOUL NAME</p>
                    <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg">{appraisalResult.soulTitle}</h2>
                  </div>
                  <div className="flex justify-center items-end gap-5 px-16">
                    {selectedBooks.map((book) => (
                      <div key={`${book.manga.id}-${book.volume}`} className={`w-28 h-40 bg-gradient-to-br ${book.manga.coverColor} rounded shadow-lg border-2 border-white/30 overflow-hidden`}>
                        <img src={book.manga.coverUrl} alt={book.manga.title} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-end">
                    <p className="text-white/40 text-[10px]">2026.01</p>
                  </div>
                </div>
              </div>

              {/* Simple Share Card (hidden for capture) */}
              <div id="share-card-simple" className="fixed -left-[9999px]" style={{ width: 800, aspectRatio: '16/9' }}>
                <div className="w-full h-full flex flex-col justify-center items-center gap-6 p-6" style={{ backgroundColor: '#FAF9F6' }}>
                  <div className="text-center">
                    <h2
                      className="text-4xl font-bold tracking-wide"
                      style={{ fontFamily: "'Shippori Mincho', serif", color: '#1A1A1A' }}
                    >
                      私の５冊
                    </h2>
                    <p className="text-xs tracking-[0.3em] uppercase mt-2" style={{ color: '#666', fontWeight: 500 }}>
                      THE FIVE
                    </p>
                  </div>
                  <div className="flex items-end gap-8 px-20">
                    {selectedBooks.map((book) => (
                      <div key={`simple-${book.manga.id}-${book.volume}`} className={`w-32 h-48 bg-gradient-to-br ${book.manga.coverColor} rounded-lg shadow-xl overflow-hidden`}>
                        <img src={book.manga.coverUrl} alt={book.manga.title} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Title Display */}
              <div className="text-center py-4">
                <h2 className="text-3xl md:text-5xl font-black text-white drop-shadow-lg mb-2">
                  {displayedTitle}
                  <span className="typing-cursor text-amber-400" />
                </h2>
              </div>

              {/* Analysis Text */}
              <div className="glass-card rounded-2xl p-6 mx-4 mb-6">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span>🔮</span> AI鑑定結果
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">{appraisalResult.analysis}</p>
              </div>

              {/* Action Buttons - Priority Order */}
              <div className="flex flex-col items-center gap-4 pb-8 px-4">
                {/* X Share Button - Top Priority */}
                <button
                  onClick={shareToX}
                  className="w-full max-w-md px-8 py-5 bg-black hover:bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl transition transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                >
                  <span className="text-2xl">𝕏</span>
                  <span>でシェア</span>
                </button>

                {/* Save Image Button */}
                <button
                  onClick={saveImage}
                  className="w-full max-w-md px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg hover:from-amber-600 hover:to-orange-600 transition flex items-center justify-center gap-2"
                >
                  <span>💾</span> 画像を保存
                </button>

                {/* Reset and Try Again Button */}
                <button
                  onClick={resetAndCloseModal}
                  className="w-full max-w-md px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 border border-white/30"
                >
                  <span>🔄</span> もう一度選ぶ（リセット）
                </button>

                {/* Close Button - Subtle */}
                <button
                  onClick={() => setShowAppraisalModal(false)}
                  className="text-white/50 hover:text-white text-sm mt-2 transition"
                >
                  閉じる
                </button>
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
    </>
  );
}
