'use client';

import { useState } from 'react';

// Sample book data
const SAMPLE_BOOKS = [
    { id: 1, title: 'ONE PIECE', coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0794/9784088820794.jpg', color: 'from-red-400 to-orange-500' },
    { id: 2, title: 'SLAM DUNK', coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/1012/9784088711010.jpg', color: 'from-blue-400 to-indigo-500' },
    { id: 3, title: 'ドラゴンボール', coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/8518/9784088518510.jpg', color: 'from-orange-400 to-yellow-500' },
    { id: 4, title: '鬼滅の刃', coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/7260/9784088807263.jpg', color: 'from-purple-400 to-pink-500' },
    { id: 5, title: '進撃の巨人', coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/8290/9784063848298.jpg', color: 'from-gray-600 to-gray-800' },
];

export default function BannerPage() {
    const [selectedPattern, setSelectedPattern] = useState<1 | 2>(1);

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Pattern Selector */}
            <div className="fixed top-4 left-4 z-50 bg-white/10 backdrop-blur-md rounded-xl p-4 space-y-3">
                <h3 className="text-white font-bold text-sm">📸 バナー撮影</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedPattern(1)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${selectedPattern === 1 ? 'bg-white text-gray-800' : 'bg-white/20 text-white'
                            }`}
                    >
                        パターン1
                    </button>
                    <button
                        onClick={() => setSelectedPattern(2)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${selectedPattern === 2 ? 'bg-white text-gray-800' : 'bg-white/20 text-white'
                            }`}
                    >
                        パターン2
                    </button>
                </div>
                <p className="text-white/50 text-xs mt-2">
                    スクロールして両パターンを確認できます
                </p>
            </div>

            {/* Pattern 1: Bookshelf Full View Banner */}
            <section className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden">
                {/* Background with blur */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&q=80')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(8px) brightness(0.7)',
                        transform: 'scale(1.1)',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

                {/* Content */}
                <div className="relative z-10 text-center max-w-4xl">
                    {/* Catchphrase */}
                    <h1
                        className="text-4xl md:text-5xl font-bold text-white mb-12 leading-tight tracking-wide"
                        style={{
                            fontFamily: "'Shippori Mincho', serif",
                            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        }}
                    >
                        あなたの魂を構成する5冊、<br />
                        教えてください。
                    </h1>

                    {/* Bookshelf */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
                        <div className="flex justify-center items-end gap-4 md:gap-6">
                            {SAMPLE_BOOKS.map((book, index) => {
                                const isFeatured = index === 2;
                                const size = isFeatured ? 'w-28 h-40 md:w-36 md:h-52' : 'w-20 h-30 md:w-28 md:h-40';

                                return (
                                    <div
                                        key={book.id}
                                        className={`${size} bg-gradient-to-br ${book.color} rounded-lg shadow-xl overflow-hidden border-2 border-white/30 transition-transform hover:scale-105`}
                                        style={{
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                                        }}
                                    >
                                        <img
                                            src={book.coverUrl}
                                            alt={book.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Subtle branding */}
                    <p
                        className="text-white/40 text-sm tracking-[0.5em] uppercase mt-8"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        THE FIVE
                    </p>
                </div>
            </section>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Pattern 2: Appraisal Result Banner */}
            <section className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/80 to-blue-900" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />

                {/* Content */}
                <div className="relative z-10 text-center max-w-2xl">
                    {/* Small catchphrase */}
                    <p
                        className="text-white/60 text-sm md:text-base tracking-widest uppercase mb-4"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        AIが暴き出す、あなたの正体。
                    </p>

                    {/* Soul Title */}
                    <div className="relative mb-8">
                        {/* Gradient backdrop for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl -m-4" />
                        <h1
                            className="relative text-5xl md:text-7xl font-black text-white leading-tight"
                            style={{
                                fontFamily: "'Shippori Mincho', serif",
                                textShadow: '0 4px 30px rgba(0,0,0,0.5)',
                            }}
                        >
                            孤独を愛する<br />
                            深夜の読書家
                        </h1>
                    </div>

                    {/* Analysis text */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-left">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">🔮</span>
                            <h4 className="text-white/80 text-sm font-bold">AI鑑定結果</h4>
                        </div>
                        <p
                            className="text-white/70 text-sm leading-relaxed"
                            style={{ fontFamily: "'Kaisei Tokumin', serif" }}
                        >
                            あなたの本棚には、静かな夜に一人で読み耽るのにふさわしい物語が並んでいます。
                            複雑な人間関係や、深い思索を求める知性の持ち主。
                            表面的なものには満足できない、本質を見抜く目を持っています。
                        </p>
                    </div>

                    {/* Subtle branding */}
                    <p
                        className="text-white/30 text-xs tracking-[0.5em] uppercase mt-8"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        THE FIVE © 2026
                    </p>
                </div>
            </section>

            {/* Instructions Footer */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md rounded-xl px-6 py-3">
                <p className="text-white/70 text-xs text-center">
                    💡 スクリーンショットを撮影してSNSに投稿しよう
                </p>
            </div>
        </div>
    );
}
