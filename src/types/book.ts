export interface Book {
    id: string;
    title: string;
    reading?: string; // ひらがな読み（検索用）
    author: string;
    coverUrl: string;
    genre: string;
    totalVolumes?: number;
    coverColor?: string;
    itemUrl?: string; // 楽天ブックスの販売ページURL
    publisher?: string; // 出版社
    coverUrlPerVolume?: Record<number, string>; // 巻ごとの書影マップ
    titleKana?: string; // カタカナタイトル（巻数検索用）
    volumeNumber?: number | null; // 巻数

    // サーバーサイド/検索スコアリング用
    hasImage?: boolean;
    score?: number;
    isbn?: string;
}
