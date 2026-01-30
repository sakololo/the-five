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
    const englishTitle = shelf.category === 'recommend'
        ? 'Recommended Books'
        : 'My Best Five';

    // Minimal (gallery) theme - white card design
    if (!isMagazine) {
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
                                                    objectFit: 'cover',
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
    }

    // Magazine (bookshelf) theme - background image design
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
                    backgroundColor: '#1a1a2e',
                    backgroundImage: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&q=80)',
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
                            fontSize: 48,
                            fontWeight: 900,
                            color: 'white',
                            textShadow: '0 4px 20px rgba(0,0,0,0.6)',
                            letterSpacing: '0.05em',
                        }}
                    >
                        {englishTitle}
                    </div>
                    <div
                        style={{
                            fontSize: 22,
                            color: 'rgba(255,255,255,0.8)',
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
                        gap: 32,
                    }}
                >
                    {shelf.books.map((book, index) => {
                        const isFeatured = index === 2;
                        const width = isFeatured ? 170 : 130;
                        const height = isFeatured ? 255 : 195;

                        return (
                            <div
                                key={`${book.id}-${book.volume}`}
                                style={{
                                    width,
                                    height,
                                    borderRadius: 10,
                                    overflow: 'hidden',
                                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                                    border: '3px solid rgba(255,255,255,0.3)',
                                    display: 'flex',
                                    backgroundColor: book.coverUrl ? 'transparent' : '#444',
                                }}
                            >
                                {book.coverUrl ? (
                                    <img
                                        src={book.coverUrl}
                                        alt={book.title}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
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
                                            backgroundColor: '#555',
                                            color: '#ccc',
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
                            fontSize: 22,
                            fontWeight: 'bold',
                            color: 'rgba(255,255,255,0.6)',
                        }}
                    >
                        THE FIVE
                    </div>
                    <div
                        style={{
                            fontSize: 18,
                            color: 'rgba(255,255,255,0.5)',
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
        { ...size }
    );
}

