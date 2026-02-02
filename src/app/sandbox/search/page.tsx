'use client';

import { useState } from 'react';

interface SearchResult {
    type: string;
    message: string;
    candidates?: Array<{
        id: string;
        title: string;
        author: string;
        volume?: number;
    }>;
    suggestions?: string[];
    popularSearches?: string[];
    parsedQuery?: {
        raw: string;
        normalized: string;
        volume?: number;
        isCharacter: boolean;
        isAuthor: boolean;
        isTag: boolean;
    };
    cached: boolean;
    processingTimeMs: number;
}

export default function SandboxSearchPage() {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<SearchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<string[]>([]);

    const handleSearch = async (searchQuery?: string) => {
        const q = searchQuery || query;
        if (!q.trim()) {
            // Fetch popular searches
            setLoading(true);
            const res = await fetch('/api/sandbox/search?q=');
            const data = await res.json();
            setResult(data);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/sandbox/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            setResult(data);

            // Add to history
            if (!history.includes(q)) {
                setHistory(prev => [q, ...prev.slice(0, 9)]);
            }
        } catch (error) {
            setResult({
                type: 'ERROR',
                message: 'ネットワークエラー',
                cached: false,
                processingTimeMs: 0,
            });
        }
        setLoading(false);
    };

    const getStateColor = (type: string) => {
        switch (type) {
            case 'CONFIDENT_MATCH': return 'bg-green-500';
            case 'SUGGESTION_MATCH': return 'bg-yellow-500';
            case 'AMBIGUOUS_MATCH': return 'bg-blue-500';
            case 'TITLE_ONLY': return 'bg-purple-500';
            case 'KEYWORD_FALLBACK': return 'bg-orange-500';
            case 'NOT_FOUND': return 'bg-red-500';
            case 'EMPTY': return 'bg-gray-500';
            default: return 'bg-gray-700';
        }
    };

    const testQueries = [
        { label: 'ワンピ', desc: '略称 → ONE PIECE' },
        { label: 'ワンピ 100', desc: '巻数付き' },
        { label: 'luffy', desc: 'キャラクター名' },
        { label: 'sakura', desc: '複数作品キャラ' },
        { label: '尾田栄一郎', desc: '著者名' },
        { label: 'ホラー', desc: 'ジャンルタグ' },
        { label: 'ＯＮＥＰＩＥＣＥ', desc: '全角テスト' },
        { label: 'xyzabcdef', desc: 'NOT_FOUND' },
        { label: '😀😀😀', desc: '絵文字攻撃' },
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">🔍 検索予測エンジン v0.7 デモ</h1>
                <p className="text-gray-400 mb-8">Red Team承認済み・35テストパス</p>

                {/* Search Input */}
                <div className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="検索ワードを入力..."
                        className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <button
                        onClick={() => handleSearch()}
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50"
                    >
                        {loading ? '...' : '検索'}
                    </button>
                </div>

                {/* Test Queries */}
                <div className="mb-8">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">テスト用クエリ:</h3>
                    <div className="flex flex-wrap gap-2">
                        {testQueries.map((tq) => (
                            <button
                                key={tq.label}
                                onClick={() => {
                                    setQuery(tq.label);
                                    handleSearch(tq.label);
                                }}
                                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                                title={tq.desc}
                            >
                                {tq.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Result Display */}
                {result && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        {/* State Badge */}
                        <div className="flex items-center gap-4 mb-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStateColor(result.type)}`}>
                                {result.type}
                            </span>
                            {result.cached && (
                                <span className="px-2 py-0.5 bg-cyan-600 rounded text-xs">CACHED</span>
                            )}
                            <span className="text-gray-500 text-sm">
                                {result.processingTimeMs}ms
                            </span>
                        </div>

                        {/* Message */}
                        <p className="text-lg mb-4">{result.message}</p>

                        {/* Parsed Query Debug */}
                        {result.parsedQuery && (
                            <div className="bg-gray-900 rounded p-4 mb-4">
                                <h4 className="text-sm font-medium text-gray-400 mb-2">パース結果:</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>Raw: <code className="text-green-400">{result.parsedQuery.raw}</code></div>
                                    <div>Normalized: <code className="text-blue-400">{result.parsedQuery.normalized}</code></div>
                                    {result.parsedQuery.volume && (
                                        <div>Volume: <code className="text-yellow-400">{result.parsedQuery.volume}</code></div>
                                    )}
                                    <div className="flex gap-2">
                                        {result.parsedQuery.isCharacter && <span className="text-purple-400">キャラ</span>}
                                        {result.parsedQuery.isAuthor && <span className="text-pink-400">著者</span>}
                                        {result.parsedQuery.isTag && <span className="text-orange-400">タグ</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Suggestions */}
                        {result.suggestions && result.suggestions.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-gray-400 mb-2">候補:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setQuery(s);
                                                handleSearch(s);
                                            }}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Popular Searches */}
                        {result.popularSearches && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2">人気の検索:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.popularSearches.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setQuery(s);
                                                handleSearch(s);
                                            }}
                                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Candidates (Books) */}
                        {result.candidates && result.candidates.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2">検索結果:</h4>
                                <div className="space-y-2">
                                    {result.candidates.map((book) => (
                                        <div key={book.id} className="flex items-center gap-4 p-3 bg-gray-700 rounded">
                                            <div>
                                                <div className="font-medium">{book.title}</div>
                                                <div className="text-sm text-gray-400">{book.author}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* History */}
                {history.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">検索履歴:</h3>
                        <div className="flex flex-wrap gap-2">
                            {history.map((h, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setQuery(h);
                                        handleSearch(h);
                                    }}
                                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm border border-gray-700"
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
