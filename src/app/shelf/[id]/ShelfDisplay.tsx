'use client';

import { ShelfData } from '@/lib/supabase';
import ClientDate from './ClientDate';

interface ShelfDisplayProps {
    shelf: ShelfData;
}

export default function ShelfDisplay({ shelf }: ShelfDisplayProps) {
    // gallery スタイル固定（本棚テーマは著作権配慮で削除）

    return (
        <div
            className="relative rounded-2xl overflow-hidden shadow-2xl bg-[#FAF9F6]"
            style={{ aspectRatio: '16/9' }}
        >
            {/* Content - Books Only (Title moved to page) */}
            <div className="relative z-10 h-full flex flex-col justify-center items-center p-4 md:p-6">
                {/* Books */}
                <div className="flex justify-center items-end gap-1.5 md:gap-6 px-1 md:px-4">
                    {shelf.books.map((book, index) => {
                        const isFeatured = index === 2;
                        // 書籍らしいアスペクト比 (約2:3) - モバイル最適化（枠内に収める）
                        const size = isFeatured
                            ? 'w-[4.5rem] sm:w-28 md:w-40'  // 72px on mobile
                            : 'w-[3.75rem] sm:w-20 md:w-32';  // 60px on mobile
                        const height = isFeatured
                            ? 'h-[6.25rem] sm:h-40 md:h-56'  // 100px on mobile
                            : 'h-[5rem] sm:h-30 md:h-44';  // 80px on mobile

                        return (
                            <a
                                key={`${book.id}-${book.volume}`}
                                href={book.itemUrl || `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent(book.title)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${size} ${height} rounded-lg overflow-hidden transition-all hover:scale-105 hover:-translate-y-2 cursor-pointer flex items-center justify-center bg-white shrink-0 shadow-lg hover:shadow-xl border border-gray-200`}
                                title={`${book.title} ${book.volume}巻 - 楽天ブックスで見る`}
                            >
                                <img
                                    src={book.coverUrl}
                                    alt={`${book.title} ${book.volume}巻`}
                                    className="w-full h-full object-contain p-0.5"
                                />
                            </a>
                        );
                    })}
                </div>

                {/* Date - Small and subtle */}
                <div className="absolute bottom-3 right-4 text-gray-300 text-xs">
                    <ClientDate date={shelf.created_at} />
                </div>
            </div>
        </div>
    );
}
