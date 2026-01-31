'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 text-gray-800">
                    <h2 className="text-2xl font-bold mb-4">致命的なエラーが発生しました</h2>
                    <div className="bg-red-50 border border-red-200 rounded p-4 mb-6 max-w-2xl w-full overflow-auto">
                        <p className="font-mono text-sm text-red-600 break-all">
                            {error.message || 'Unknown error occurred'}
                        </p>
                    </div>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        リロードする
                    </button>
                </div>
            </body>
        </html>
    );
}
