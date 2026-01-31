'use client';

import React, { useState } from 'react';

// Types (re-defined here to avoid circular imports or complex type sharing given the single-file nature, 
// ideally should be in types.ts but keeping it simple for this fix)
interface Book {
    id: string;
    title: string;
    reading: string;
    author: string;
    coverUrl: string;
    genre: string;
    totalVolumes: number;
    coverColor: string;
    itemUrl?: string;
}

interface BookSearchResultItemProps {
    manga: Book;
    isSelected: boolean;
    onClick: (manga: Book) => void;
}

export default function BookSearchResultItem({ manga, isSelected, onClick }: BookSearchResultItemProps) {
    const [imageError, setImageError] = useState(false);
    const hasValidImage = manga.coverUrl && !imageError;

    return (
        <div
            onClick={() => onClick(manga)}
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
}
