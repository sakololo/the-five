'use client';

import { useState, useEffect } from 'react';

// Sample book data for demonstration
const SAMPLE_BOOKS = [
    { id: 1, title: 'ONE PIECE', coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/0794/9784088820794.jpg', color: 'from-red-400 to-orange-500' },
    { id: 2, title: 'SLAM DUNK', coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/1012/9784088711010.jpg', color: 'from-blue-400 to-indigo-500' },
    { id: 3, title: 'ドラゴンボール', coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/8518/9784088518510.jpg', color: 'from-orange-400 to-yellow-500' },
    { id: 4, title: '鬼滅の刃', coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/7260/9784088807263.jpg', color: 'from-purple-400 to-pink-500' },
    { id: 5, title: '進撃の巨人', coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/8290/9784063848298.jpg', color: 'from-gray-600 to-gray-800' },
];

export default function ShootingPage() {
    const [animationSpeed, setAnimationSpeed] = useState(1);
    const [isAnimating, setIsAnimating] = useState(false);
    const [visibleBooks, setVisibleBooks] = useState<number[]>([]);
    const [showAfterimage, setShowAfterimage] = useState(true);

    // Start book absorption animation
    const startAnimation = () => {
        setIsAnimating(true);
        setVisibleBooks([]);

        // Animate books appearing one by one
        SAMPLE_BOOKS.forEach((_, index) => {
            setTimeout(() => {
                setVisibleBooks(prev => [...prev, index]);
            }, (index * 600) / animationSpeed);
        });

        // Animation complete
        setTimeout(() => {
            setIsAnimating(false);
        }, (SAMPLE_BOOKS.length * 600 + 1000) / animationSpeed);
    };

    const resetAnimation = () => {
        setVisibleBooks([]);
        setIsAnimating(false);
    };

    // Dynamic animation duration based on speed
    const getAnimationDuration = () => `${1.5 / animationSpeed}s`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Control Panel */}
            <div className="fixed top-4 left-4 z-50 bg-white/10 backdrop-blur-md rounded-xl p-4 space-y-4">
                <h3 className="text-white font-bold text-sm">🎬 撮影モード</h3>

                <div className="space-y-2">
                    <label className="text-white/70 text-xs">アニメーション速度</label>
                    <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={animationSpeed}
                        onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                        className="w-full"
                    />
                    <span className="text-white text-xs">{animationSpeed.toFixed(1)}x</span>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={showAfterimage}
                        onChange={(e) => setShowAfterimage(e.target.checked)}
                        id="afterimage"
                    />
                    <label htmlFor="afterimage" className="text-white/70 text-xs">残像エフェクト</label>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={startAnimation}
                        disabled={isAnimating}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
                    >
                        ▶ 再生
                    </button>
                    <button
                        onClick={resetAnimation}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition"
                    >
                        リセット
                    </button>
                </div>
            </div>

            {/* Main Animation Area */}
            <div className="flex items-center justify-center min-h-screen">
                <div className="relative">
                    {/* Background blur effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-purple-500/20 blur-3xl scale-150" />

                    {/* Bookshelf container */}
                    <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10">
                        <div className="text-center mb-8">
                            <p className="text-white/40 text-xs tracking-[0.5em] uppercase mb-2">YOUR SOUL NAME</p>
                            <h2 className="text-3xl font-black text-white drop-shadow-lg">サンプル二つ名</h2>
                        </div>

                        {/* Books display with animation */}
                        <div className="flex items-end gap-6">
                            {SAMPLE_BOOKS.map((book, index) => {
                                const isVisible = visibleBooks.includes(index);
                                const delay = `${index * 0.1}s`;

                                return (
                                    <div key={book.id} className="relative">
                                        {/* Afterimage effect */}
                                        {showAfterimage && isVisible && (
                                            <>
                                                <div
                                                    className={`absolute w-24 h-36 bg-gradient-to-br ${book.color} rounded-lg opacity-20 blur-sm`}
                                                    style={{
                                                        animation: `afterimage-1 ${getAnimationDuration()} ease-out forwards`,
                                                        animationDelay: delay,
                                                        transform: 'translateY(20px)',
                                                    }}
                                                />
                                                <div
                                                    className={`absolute w-24 h-36 bg-gradient-to-br ${book.color} rounded-lg opacity-10 blur-md`}
                                                    style={{
                                                        animation: `afterimage-2 ${getAnimationDuration()} ease-out forwards`,
                                                        animationDelay: delay,
                                                        transform: 'translateY(40px)',
                                                    }}
                                                />
                                                {/* Light trail effect */}
                                                <div
                                                    className="absolute inset-0 w-24 h-36"
                                                    style={{
                                                        background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)',
                                                        opacity: isVisible ? 0 : 0.8,
                                                        animation: `light-trail ${getAnimationDuration()} ease-out forwards`,
                                                        animationDelay: delay,
                                                    }}
                                                />
                                            </>
                                        )}

                                        {/* Main book */}
                                        <div
                                            className={`relative w-24 h-36 bg-gradient-to-br ${book.color} rounded-lg shadow-2xl overflow-hidden border-2 border-white/20 transition-all`}
                                            style={{
                                                opacity: isVisible ? 1 : 0,
                                                transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(100px) scale(1.2)',
                                                transition: `all ${getAnimationDuration()} cubic-bezier(0.34, 1.56, 0.64, 1)`,
                                                transitionDelay: delay,
                                                filter: isVisible ? 'drop-shadow(0 0 30px rgba(255,255,255,0.3))' : 'none',
                                            }}
                                        >
                                            <img
                                                src={book.coverUrl}
                                                alt={book.title}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Animation keyframes */}
            <style jsx global>{`
        @keyframes afterimage-1 {
          0% { opacity: 0.4; transform: translateY(30px) scale(1.1); }
          100% { opacity: 0; transform: translateY(0) scale(1); }
        }
        
        @keyframes afterimage-2 {
          0% { opacity: 0.3; transform: translateY(50px) scale(1.15); }
          100% { opacity: 0; transform: translateY(0) scale(1); }
        }
        
        @keyframes light-trail {
          0% { opacity: 0.8; height: 200%; }
          100% { opacity: 0; height: 0%; }
        }
      `}</style>
        </div>
    );
}
