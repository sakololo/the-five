'use client';

import { useEffect, useState } from 'react';

// パターンB：ダイレクト・本棚ランディング（没入スタイル）
// アクセスした瞬間、スマホ全画面に本棚がアニメーションでフェードイン

const DUMMY_DATA = {
    soulTitle: '友情を信じすぎる熱血バカ',
    books: [
        { id: 1, title: 'ONE PIECE', volume: 1, coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/6018/9784088726018.jpg' },
        { id: 2, title: 'SLAM DUNK', volume: 1, coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/1016/9784088711010.jpg' },
        { id: 3, title: '鬼滅の刃', volume: 1, coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/7051/9784088807058.jpg' },
        { id: 4, title: '進撃の巨人', volume: 1, coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/4005/9784063714005.jpg' },
        { id: 5, title: '呪術廻戦', volume: 1, coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/2030/9784088812038.jpg' },
    ],
};

export default function PatternB() {
    const [isVisible, setIsVisible] = useState(false);
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        // Start fade-in animation
        const timer1 = setTimeout(() => setIsVisible(true), 100);
        // Show button after books appear
        const timer2 = setTimeout(() => setShowButton(true), 1500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex flex-col">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
                <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
                {/* Soul Title - Minimal */}
                <div
                    className={`text-center mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                >
                    <p className="text-white/40 text-xs tracking-[0.3em] uppercase mb-2">SOUL NAME</p>
                    <h1 className="text-2xl md:text-4xl font-black text-white">
                        『{DUMMY_DATA.soulTitle}』
                    </h1>
                </div>

                {/* Book Shelf - Full Width Focus */}
                <div
                    className={`flex items-end justify-center gap-3 sm:gap-4 md:gap-8 px-4 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                >
                    {DUMMY_DATA.books.map((book, index) => {
                        const isFeatured = index === 2;
                        const delay = index * 100;

                        return (
                            <div
                                key={book.id}
                                className={`
                  transition-all duration-700
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}
                `}
                                style={{ transitionDelay: `${delay + 500}ms` }}
                            >
                                <div
                                    className={`
                    ${isFeatured
                                            ? 'w-20 h-28 sm:w-28 sm:h-40 md:w-40 md:h-60'
                                            : 'w-14 h-20 sm:w-20 sm:h-28 md:w-32 md:h-48'
                                        }
                    rounded-lg shadow-2xl overflow-hidden border-2 border-white/20
                    transform hover:scale-110 hover:-translate-y-2 transition-transform duration-300
                    ${isFeatured ? 'ring-2 ring-amber-400/50 ring-offset-2 ring-offset-transparent' : ''}
                  `}
                                >
                                    <img
                                        src={book.coverUrl}
                                        alt={book.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Floating CTA Button */}
                <div
                    className={`mt-12 transition-all duration-700 ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                >
                    <a
                        href="/"
                        className="group relative inline-flex items-center gap-3 px-10 py-5 bg-white text-gray-900 rounded-full text-lg font-bold shadow-2xl shadow-white/20 hover:shadow-white/40 transition-all duration-300 transform hover:scale-105"
                    >
                        <span>自分もやってみる</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </a>
                </div>
            </div>

            {/* Minimal Footer */}
            <footer className="relative z-10 py-6 text-center">
                <p className="text-white/30 text-xs tracking-widest">THE FIVE</p>
            </footer>
        </div>
    );
}
