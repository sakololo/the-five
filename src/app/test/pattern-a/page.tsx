'use client';

// パターンA：詳細表示 兼 招待状（マガジンスタイル）
// ダミーデータを使用して表示

const DUMMY_DATA = {
    username: 'マンガ好き太郎',
    soulTitle: '友情を信じすぎる熱血バカ',
    analysis: 'あなたは「熱い展開」と「仲間との絆」が大好物ですね。主人公が覚醒するシーンで涙しがち。現実でも周りを巻き込んで何かを始めたいタイプでは？',
    books: [
        { id: 1, title: 'ONE PIECE', volume: 1, coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/6018/9784088726018.jpg' },
        { id: 2, title: 'SLAM DUNK', volume: 1, coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/1016/9784088711010.jpg' },
        { id: 3, title: '鬼滅の刃', volume: 1, coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/7051/9784088807058.jpg' },
        { id: 4, title: '進撃の巨人', volume: 1, coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/4005/9784063714005.jpg' },
        { id: 5, title: '呪術廻戦', volume: 1, coverUrl: 'https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/2030/9784088812038.jpg' },
    ],
};

export default function PatternA() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            {/* Hero Section with OGP Image */}
            <section className="relative py-12 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <p className="text-sm text-gray-500 mb-2">🔮 鑑定結果</p>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                            {DUMMY_DATA.username}さんの二つ名
                        </h1>
                    </div>

                    {/* OGP-like Card */}
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-8">
                        {/* Background */}
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80')",
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                        />
                        <div className="absolute inset-0 bg-black/30" />

                        {/* Content */}
                        <div className="relative z-10 p-8 md:p-12">
                            {/* Soul Title */}
                            <div className="text-center mb-8">
                                <p className="text-white/60 text-xs tracking-widest uppercase mb-2">YOUR SOUL NAME</p>
                                <h2 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">
                                    『{DUMMY_DATA.soulTitle}』
                                </h2>
                            </div>

                            {/* Books */}
                            <div className="flex justify-center items-end gap-3 md:gap-6">
                                {DUMMY_DATA.books.map((book, index) => {
                                    const isFeatured = index === 2;
                                    return (
                                        <div
                                            key={book.id}
                                            className={`
                        ${isFeatured ? 'w-24 h-36 md:w-32 md:h-48' : 'w-16 h-24 md:w-24 md:h-36'}
                        rounded-lg shadow-xl overflow-hidden border-2 border-white/30
                        transition-transform hover:scale-105
                      `}
                                        >
                                            <img
                                                src={book.coverUrl}
                                                alt={book.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Analysis Section */}
                    <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg mb-8">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <span>🔮</span> AI鑑定理由
                        </h3>
                        <p className="text-gray-600 leading-relaxed">{DUMMY_DATA.analysis}</p>
                    </div>

                    {/* Selected Books List */}
                    <div className="bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg mb-8">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">📚 選んだ5冊</h3>
                        <ul className="space-y-2">
                            {DUMMY_DATA.books.map((book) => (
                                <li key={book.id} className="flex items-center gap-3 text-gray-700">
                                    <span className="text-blue-500">•</span>
                                    {book.title}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* CTA Button */}
                    <div className="text-center">
                        <a
                            href="/"
                            className="inline-block px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-xl font-bold shadow-xl shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition transform hover:scale-105 active:scale-95"
                        >
                            あなたも診断する
                        </a>
                        <p className="text-gray-500 text-sm mt-4">
                            好きなマンガ5冊から、あなたの「二つ名」を発見しよう
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 text-center text-gray-400 text-sm">
                <p>THE FIVE ｜ あなたの正体を、5冊で読み解く。</p>
            </footer>
        </div>
    );
}
