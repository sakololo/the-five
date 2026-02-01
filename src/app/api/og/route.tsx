import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Load font
async function loadFont() {
    const fontUrl = new URL('/fonts/NotoSansJP-Bold.ttf', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
    try {
        const fontData = await fetch(fontUrl).then((res) => res.arrayBuffer());
        return fontData;
    } catch {
        // Fallback: use default font if custom font fails
        return null;
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    // Get parameters
    const title = searchParams.get('title') || 'あなたの二つ名';
    const books = searchParams.get('books') || '';
    // mode パラメータは互換性のため受け取るが、常に gallery スタイルを使用
    // const mode = searchParams.get('mode') || 'gallery';

    // Parse book IDs (format: "id1-vol1,id2-vol2,...")
    const bookList = books.split(',').filter(Boolean).slice(0, 5);

    // Load font
    const fontData = await loadFont();

    // OGP dimensions (1.91:1 ratio for X/Twitter)
    const width = 1200;
    const height = 630;

    // Safety zone padding
    const padding = 40;

    // Book dimensions
    const bookWidth = 140;
    const bookHeight = 200;
    const bookGap = 20;

    // Calculate positions for 5 books centered
    const totalBooksWidth = 5 * bookWidth + 4 * bookGap;
    const startX = (width - totalBooksWidth) / 2;

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
                    padding: `${padding}px`,
                    fontFamily: fontData ? 'NotoSansJP' : 'sans-serif',
                    background: '#FAF9F6',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 10,
                    }}
                >
                    <span
                        style={{
                            fontSize: 42,
                            fontWeight: 700,
                            color: '#1A1A1A',
                        }}
                    >
                        私の５冊
                    </span>
                    <span
                        style={{
                            fontSize: 14,
                            color: '#666',
                            letterSpacing: '0.3em',
                            marginTop: 8,
                        }}
                    >
                        THE FIVE
                    </span>
                </div>

                {/* Books display */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        gap: bookGap,
                        zIndex: 10,
                    }}
                >
                    {Array.from({ length: 5 }, (_, i) => {
                        const isFeatured = i === 2;
                        const currentHeight = isFeatured ? bookHeight * 1.2 : bookHeight;
                        const currentWidth = isFeatured ? bookWidth * 1.2 : bookWidth;

                        return (
                            <div
                                key={i}
                                style={{
                                    width: currentWidth,
                                    height: currentHeight,
                                    borderRadius: 8,
                                    background: bookList[i]
                                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                                        : 'rgba(0,0,0,0.1)',
                                    border: '2px solid rgba(0,0,0,0.1)',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 32,
                                    color: 'rgba(0,0,0,0.3)',
                                }}
                            >
                                {!bookList[i] && (i + 1)}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        zIndex: 10,
                    }}
                >
                    <span
                        style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#666',
                            fontStyle: 'italic',
                        }}
                    >
                        THE FIVE
                    </span>
                    <span
                        style={{
                            fontSize: 12,
                            color: '#999',
                        }}
                    >
                        私を形作る、5つの物語。
                    </span>
                </div>
            </div>
        ),
        {
            width,
            height,
            fonts: fontData ? [
                {
                    name: 'NotoSansJP',
                    data: fontData,
                    style: 'normal',
                    weight: 700,
                },
            ] : undefined,
        }
    );
}
