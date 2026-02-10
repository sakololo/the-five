'use client';

import { ShelfData } from '@/lib/supabase';

interface ShelfDisplayProps {
    shelf: ShelfData;
}

export default function ShelfDisplay({ shelf }: ShelfDisplayProps) {
    return (
        <div className="w-full max-w-sm mx-auto px-6 flex flex-col gap-32 sm:gap-40 pb-32">
            {shelf.books.map((book, index) => (
                <div key={`${book.id}-${book.volume}`} className="flex flex-col items-center group">
                    {/* Book Cover - Museum Style */}
                    <a
                        href={book.itemUrl || `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent(book.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                            w-56 sm:w-64 aspect-[2/3] 
                            bg-white 
                            shadow-2xl shadow-gray-200 
                            transition-transform duration-700 
                            group-hover:scale-105
                            overflow-hidden
                        "
                        title={`${book.title} ${book.volume}巻 - 楽天ブックスで見る`}
                    >
                        <img
                            src={book.coverUrl}
                            alt={`${book.title} ${book.volume}巻`}
                            className="w-full h-full object-contain opacity-95"
                        />
                    </a>

                    {/* Caption - Museum Style */}
                    <div className="mt-8 sm:mt-10 text-center">
                        <p className="text-[10px] text-gray-400 tracking-[0.3em] uppercase mb-2">
                            NO.{String(index + 1).padStart(2, '0')}
                        </p>
                        <h2
                            className="text-base sm:text-lg font-medium tracking-widest text-gray-900"
                            style={{ fontFamily: "'Shippori Mincho', serif" }}
                        >
                            {book.title}
                        </h2>
                        <p className="text-xs text-gray-400 mt-2 tracking-wider">
                            {book.volume}巻
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
