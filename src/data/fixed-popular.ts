// Fixed popular manga titles (25 titles)
// These are always shown to ensure light users and new users see familiar titles

export const FIXED_POPULAR_TITLES = [
    // 少年漫画（10作品）
    'ワンピース',
    '鬼滅の刃',
    '呪術廻戦',
    'NARUTO',

    'SLAM DUNK',
    'ハイキュー!!',
    '僕のヒーローアカデミア',
    'HUNTER×HUNTER',
    'SPY×FAMILY',

    // 少女漫画（5作品）
    '君に届け',

    'フルーツバスケット',
    'ちはやふる',
    '暁のヨナ',

    // 青年漫画（5作品）
    '進撃の巨人',
    'キングダム',
    '推しの子',
    'ゴールデンカムイ',
    '3月のライオン',

    // その他（5作品）
    '葬送のフリーレン',
    '薬屋のひとりごと',
    '東京卍リベンジャーズ',
    'チェンソーマン',
    'デスノート',
];

// Total volumes for each fixed popular title
// Updated as of January 2026
export const TOTAL_VOLUMES_MAPPING: Record<string, number> = {
    // 少年漫画
    'ワンピース': 110,
    '鬼滅の刃': 23,
    '呪術廻戦': 28,
    'NARUTO': 72,

    'SLAM DUNK': 31,
    'ハイキュー!!': 45,
    '僕のヒーローアカデミア': 42,
    'HUNTER×HUNTER': 37,
    'SPY×FAMILY': 14,

    // 少女漫画
    '君に届け': 30,

    'フルーツバスケット': 23,
    'ちはやふる': 50,
    '暁のヨナ': 44,

    // 青年漫画
    '進撃の巨人': 34,
    'キングダム': 73,
    '推しの子': 16,
    'ゴールデンカムイ': 31,
    '3月のライオン': 18,

    // その他
    '葬送のフリーレン': 14,
    '薬屋のひとりごと': 19,
    '東京卍リベンジャーズ': 31,
    'チェンソーマン': 18,
    'デスノート': 12,
};
