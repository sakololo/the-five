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
    const { id } = await params;
    const shelf = await getShelf(id);

    if (!shelf) {
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
        ? '今おすすめしたい、5冊。'
        : 'あなたを、5冊で。';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 40,
                    backgroundColor: isMagazine ? '#1a1a2e' : '#FAF9F6',
                    backgroundImage: isMagazine
                        ? 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&q=80)'
                        : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
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
                            fontSize: 52,
                            fontWeight: 900,
                            color: isMagazine ? 'white' : '#1A1A1A',
                            textShadow: isMagazine ? '0 4px 20px rgba(0,0,0,0.5)' : 'none',
                            letterSpacing: '0.05em',
                        }}
                    >
                        {categoryTitle}
                    </div>
                    <div
                        style={{
                            fontSize: 20,
                            color: isMagazine ? 'rgba(255,255,255,0.7)' : '#666',
                            letterSpacing: '0.2em',
                            marginTop: 8,
                        }}
                    >
                        THE FIVE
                    </div>
                </div>

                {/* Books */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 32,
                    }}
                >
                    {shelf.books.map((book, index) => {
                        const isFeatured = index === 2;
                        const width = isFeatured ? 180 : 140;
                        const height = isFeatured ? 270 : 210;

                        return (
                            <div
                                key={`${book.id}-${book.volume}`}
                                style={{
                                    width,
                                    height,
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    boxShadow: isMagazine
                                        ? '0 12px 40px rgba(0,0,0,0.5)'
                                        : '0 8px 30px rgba(0,0,0,0.15)',
                                    border: isMagazine ? '3px solid rgba(255,255,255,0.3)' : 'none',
                                    display: 'flex',
                                }}
                            >
                                <img
                                    src={book.coverUrl}
                                    alt={book.title}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
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
                            fontSize: 24,
                            fontWeight: 'bold',
                            color: isMagazine ? 'rgba(255,255,255,0.6)' : '#999',
                        }}
                    >
                        THE FIVE
                    </div>
                    <div
                        style={{
                            fontSize: 18,
                            color: isMagazine ? 'rgba(255,255,255,0.5)' : '#AAA',
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
        ),
        {
            ...size,
        }
    );
}
