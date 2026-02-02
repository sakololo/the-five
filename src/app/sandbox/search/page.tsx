'use client';

import { useState, FormEvent } from 'react';

// 型定義
interface SearchState {
    type: 'CONFIDENT_MATCH' | 'AMBIGUOUS_MATCH' | 'TITLE_ONLY' | 'NOT_FOUND';
    message: string;
    subMessage?: string;
    primaryAction: string;
    secondaryAction?: string;
    recognizedTitle?: string;
    candidates?: string[];
}

interface BookResult {
    title: string;
    author?: string;
    isbn?: string;
    coverUrl?: string;
}

interface DebugLog {
    step: string;
    detail: string;
    timestamp: number;
}

interface SearchResponse {
    originalQuery: string;
    normalizedQuery: string;
    searchState: SearchState;
    books: BookResult[];
    totalBooks: number;
    debugLogs: DebugLog[];
    error?: string;
}

// 状態タイプに応じた色
const stateColors: Record<string, { bg: string; border: string; text: string }> = {
    CONFIDENT_MATCH: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' },
    AMBIGUOUS_MATCH: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800' },
    TITLE_ONLY: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
    NOT_FOUND: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800' },
};

export default function SandboxSearchPage() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SearchResponse | null>(null);
    const [showDebug, setShowDebug] = useState(true);

    const handleSearch = async (e: FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setResult(null);

        try {
            const response = await fetch(`/api/sandbox/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error('Search error:', error);
            setResult({
                originalQuery: query,
                normalizedQuery: '',
                searchState: { type: 'NOT_FOUND', message: 'エラー', primaryAction: '再試行' },
                books: [],
                totalBooks: 0,
                debugLogs: [],
                error: 'APIエラーが発生しました',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                {/* ヘッダー */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">🔬 検索予測エンジン 実験室</h1>
                    <p className="text-gray-400">
                        このページは開発者専用です。検索ロジックの動作を確認・デバッグできます。
                    </p>
                </div>

                {/* 検索フォーム */}
                <form onSubmit={handleSearch} className="mb-8">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="検索ワードを入力（例: ワンピ、鬼滅、スラダン）"
                            className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-blue-500 focus:outline-none text-white"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '検索中...' : '検索'}
                        </button>
                    </div>
                </form>

                {/* テスト用クイックボタン */}
                <div className="mb-8">
                    <p className="text-gray-400 text-sm mb-2">クイックテスト:</p>
                    <div className="flex flex-wrap gap-2">
                        {['ワンピ', '鬼滅', 'スラダン', 'ハンター', 'ドラゴン', 'あいうえお'].map((word) => (
                            <button
                                key={word}
                                onClick={() => setQuery(word)}
                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                            >
                                {word}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 結果表示 */}
                {result && (
                    <div className="space-y-6">
                        {/* 予測結果カード */}
                        <div className={`p-6 rounded-lg border-2 ${stateColors[result.searchState.type]?.bg || 'bg-gray-800'} ${stateColors[result.searchState.type]?.border || 'border-gray-600'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-lg font-bold ${stateColors[result.searchState.type]?.text || 'text-white'}`}>
                                    {result.searchState.type}
                                </span>
                                <span className="text-gray-600 text-sm">
                                    {result.totalBooks}件の本
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 mb-2">
                                {result.searchState.message}
                            </p>
                            {result.searchState.subMessage && (
                                <p className="text-gray-700">
                                    {result.searchState.subMessage}
                                </p>
                            )}
                            {result.searchState.candidates && result.searchState.candidates.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-gray-700 text-sm mb-2">候補:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {result.searchState.candidates.map((candidate, i) => (
                                            <span key={i} className="px-3 py-1 bg-white rounded-full text-gray-800 text-sm">
                                                {candidate}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="mt-4 flex gap-2">
                                <button className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800">
                                    {result.searchState.primaryAction}
                                </button>
                                {result.searchState.secondaryAction && (
                                    <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-200">
                                        {result.searchState.secondaryAction}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* クエリ情報 */}
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">📝 クエリ情報</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-400">元の入力:</span>
                                    <span className="ml-2 font-mono">{result.originalQuery}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">正規化後:</span>
                                    <span className="ml-2 font-mono">{result.normalizedQuery}</span>
                                </div>
                            </div>
                        </div>

                        {/* デバッグログ */}
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold">🐛 デバッグログ</h3>
                                <button
                                    onClick={() => setShowDebug(!showDebug)}
                                    className="text-sm text-gray-400 hover:text-white"
                                >
                                    {showDebug ? '非表示' : '表示'}
                                </button>
                            </div>
                            {showDebug && (
                                <div className="space-y-1 font-mono text-sm">
                                    {result.debugLogs.map((log, i) => (
                                        <div key={i} className="flex">
                                            <span className="text-blue-400 w-32 flex-shrink-0">[{log.step}]</span>
                                            <span className="text-gray-300">{log.detail}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 本の結果 */}
                        {result.books.length > 0 && (
                            <div className="bg-gray-800 p-4 rounded-lg">
                                <h3 className="font-semibold mb-4">📚 検索結果の本（上位5件）</h3>
                                <div className="grid grid-cols-5 gap-4">
                                    {result.books.slice(0, 5).map((book, i) => (
                                        <div key={i} className="text-center">
                                            {book.coverUrl ? (
                                                <img
                                                    src={book.coverUrl}
                                                    alt={book.title}
                                                    className="w-full h-auto rounded mb-2"
                                                />
                                            ) : (
                                                <div className="w-full h-32 bg-gray-700 rounded mb-2 flex items-center justify-center text-gray-500">
                                                    No Image
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-300 truncate">{book.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 生JSON */}
                        <details className="bg-gray-800 p-4 rounded-lg">
                            <summary className="cursor-pointer font-semibold">📄 生のレスポンス (JSON)</summary>
                            <pre className="mt-4 text-xs overflow-auto max-h-96 bg-gray-900 p-4 rounded">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
}
