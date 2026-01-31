import { ImageResponse } from 'next/og';
import { getShelf } from '@/lib/supabase';

export const runtime = 'edge';
export const alt = 'THE FIVE - 私を形づくる5冊';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function Image({ params }: Props) {
    try {
        const { id } = await params;
        console.log('[OGP] Generating image for shelf ID:', id);

        let shelf;
        try {
            shelf = await getShelf(id);
            console.log('[OGP] Shelf data retrieved:', shelf ? 'success' : 'null');
        } catch (shelfError) {
            console.error('[OGP] Error fetching shelf:', shelfError);
            shelf = null;
        }

        if (!shelf) {
            console.log('[OGP] Shelf not found, returning error image');
            return new ImageResponse(
                (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#1a1a2e',
                            color: 'white',
                            fontSize: 48,
                            fontWeight: 'bold',
                        }}
                    >
                        THE FIVE - 本棚が見つかりません
                    </div>
                ),
                { ...size }
            );
        }

        const isMagazine = shelf.theme === 'magazine';
        const categoryTitle = shelf.category === 'recommend'
            ? '今読んでほしい、5冊。'
            : '私を形作る、5冊。';
        const englishTitle = shelf.category === 'recommend'
            ? 'Recommended Books'
            : 'My Best Five';


        // Always use Minimal (gallery) theme - white card design for OGP to ensure high visibility and compliance
        console.log('[OGP] Generating image with', shelf.books.length, 'books');
        return new ImageResponse(
            (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FAF9F6',
                        padding: 40,
                    }}
                >
                    {/* White Card */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'white',
                            borderRadius: 24,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                            padding: 40,
                            width: 1100,
                            height: 550,
                        }}
                    >
                        {/* Title */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 42,
                                    fontWeight: 300,
                                    color: '#1A1A1A',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                {englishTitle}
                            </div>
                            <div
                                style={{
                                    fontSize: 22,
                                    color: '#666',
                                    letterSpacing: '0.15em',
                                    marginTop: 8,
                                }}
                            >
                                {categoryTitle}
                            </div>
                        </div>

                        {/* Books */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: 28,
                            }}
                        >
                            {shelf.books.map((book, index) => {
                                const isFeatured = index === 2;
                                const width = isFeatured ? 160 : 120;
                                const height = isFeatured ? 240 : 180;

                                return (
                                    <div
                                        key={`${book.id}-${book.volume}`}
                                        style={{
                                            width,
                                            height,
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                            display: 'flex',
                                            backgroundColor: book.coverUrl ? 'transparent' : '#ddd',
                                        }}
                                    >
                                        {book.coverUrl ? (
                                            <img
                                                src={book.coverUrl}
                                                alt={book.title}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: '#e0e0e0',
                                                    color: '#666',
                                                    fontSize: 14,
                                                }}
                                            >
                                                No Image
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                width: '100%',
                                alignItems: 'center',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 18,
                                    fontWeight: 'bold',
                                    color: '#aaa',
                                }}
                            >
                                THE FIVE
                            </div>
                            <div
                                style={{
                                    fontSize: 16,
                                    color: '#bbb',
                                }}
                            >
                                {new Date(shelf.created_at || Date.now()).toLocaleDateString('ja-JP', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                }).replace(/\//g, '.')}
                            </div>
                        </div>
                    </div>
                </div>
            ),
            { ...size }
        );
    } catch (error) {
        console.error('[OGP] Fatal error generating image:', error);
        // Return error image
        return new ImageResponse(
            (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        fontSize: 32,
                        fontWeight: 'bold',
                        padding: 40,
                    }}
                >
                    <div>THE FIVE</div>
                    <div style={{ fontSize: 24, marginTop: 20 }}>画像生成エラー</div>
                    <div style={{ fontSize: 16, marginTop: 10, fontWeight: 'normal' }}>
                        {error instanceof Error ? error.message : 'Unknown error'}
                    </div>
                </div>
            ),
            { ...size }
        );
    }
}
