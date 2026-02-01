'use client';

import { ShelfData } from '@/lib/supabase';
import ClientDate from './ClientDate';

interface ShelfDisplayProps {
    shelf: ShelfData;
}

export default function ShelfDisplay({ shelf }: ShelfDisplayProps) {
    const isMagazine = shelf.theme === 'magazine';

    return (
        <div
            className={`relative rounded-2xl overflow-hidden shadow-2xl ${isMagazine ? '' : 'bg-[#FAF9F6]'
                }`}
            style={{ aspectRatio: '16/9' }}
        >
            {/* Background */}
            {isMagazine ? (
                <>
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80')",
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />
                    <div className="absolute inset-0 bg-black/30" />
                </>
            ) : null}

            {/* Content - Books Only (Title moved to page) */}
            <div className="relative z-10 h-full flex flex-col justify-center items-center p-6 md:p-8">
                {/* Books */}
                <div className="flex justify-center items-end gap-3 md:gap-6 px-2 md:px-4">
                    {shelf.books.map((book, index) => {
                        const isFeatured = index === 2;
                        // 書籍らしいアスペクト比 (約2:3) - モバイル対応サイズ
                        const size = isFeatured
                            ? 'w-20 sm:w-28 md:w-40'
                            : 'w-16 sm:w-20 md:w-32';
                        const height = isFeatured
                            ? 'h-28 sm:h-40 md:h-56'
                            : 'h-22 sm:h-30 md:h-44';

                        return (
                            <a
                                key={`${book.id}-${book.volume}`}
                                href={book.itemUrl || `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent(book.title)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${size} ${height} rounded-lg overflow-hidden transition-all hover:scale-105 hover:-translate-y-2 cursor-pointer flex items-center justify-center bg-white ${isMagazine
                                    ? 'shadow-2xl border-2 border-white/30'
                                    : 'shadow-lg hover:shadow-xl border border-gray-200'
                                    }`}
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
                <div className={`absolute bottom-3 right-4 ${isMagazine ? 'text-white/40' : 'text-gray-300'} text-xs`}>
                    <ClientDate date={shelf.created_at} />
                </div>
            </div>
        </div>
    );
}

