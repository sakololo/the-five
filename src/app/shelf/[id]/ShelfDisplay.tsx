'use client';

import { ShelfData } from '@/lib/supabase';

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
                    <div className="absolute inset-0 bg-white/20" />
                </>
            ) : null}

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-8">
                {/* Title */}
                <div className="text-center">
                    {isMagazine ? (
                        <>
                            <h2
                                className="text-2xl md:text-3xl font-black text-white drop-shadow-lg"
                                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                            >
                                My Best Five
                            </h2>
                            <p className="text-white/60 text-xs tracking-[0.3em] uppercase mt-1">私を形づくる5冊</p>
                        </>
                    ) : (
                        <>
                            <h2
                                className="text-3xl md:text-4xl tracking-wide"
                                style={{ fontFamily: "'Shippori Mincho', serif", color: '#1A1A1A', fontWeight: 300 }}
                            >
                                My Best Five
                            </h2>
                            <p
                                className="text-xs tracking-[0.3em] uppercase mt-2"
                                style={{ color: '#666', fontWeight: 400, fontFamily: "'Shippori Mincho', serif" }}
                            >
                                私を形づくる5冊
                            </p>
                        </>
                    )}
                </div>

                {/* Books */}
                <div className="flex justify-center items-end gap-4 md:gap-6 px-4 md:px-8">
                    {shelf.books.map((book, index) => {
                        const isFeatured = index === 2;
                        const size = isFeatured
                            ? 'w-20 h-28 md:w-32 md:h-48'
                            : 'w-16 h-24 md:w-24 md:h-36';

                        return (
                            <a
                                key={`${book.id}-${book.volume}`}
                                href={book.itemUrl || `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent(book.title)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${size} rounded-lg overflow-hidden transition-all hover:scale-105 hover:-translate-y-2 cursor-pointer ${isMagazine
                                        ? 'shadow-2xl border-2 border-white/30'
                                        : 'shadow-lg hover:shadow-xl'
                                    }`}
                                title={`${book.title} ${book.volume}巻 - 楽天ブックスで見る`}
                            >
                                <img
                                    src={book.coverUrl}
                                    alt={`${book.title} ${book.volume}巻`}
                                    className="w-full h-full object-cover"
                                />
                            </a>
                        );
                    })}
                </div>

                {/* Date */}
                <div className={`text-right ${isMagazine ? 'text-white/50' : 'text-gray-400'} text-xs`}>
                    {new Date(shelf.created_at || Date.now()).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    }).replace(/\//g, '.')}
                </div>
            </div>
        </div>
    );
}
