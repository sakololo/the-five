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
                            backgroundColor: '#F9F9F9',
                            color: '#333',
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

        // カテゴリに応じた静的OGP画像を返す
        // 画像ファイル: public/og/my-five.png, public/og/recommend.png
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://the-five-beige.vercel.app';
        const ogImagePath = shelf.category === 'recommend'
            ? '/og/recommend.png'
            : '/og/my-five.png';
        const imageUrl = `${siteUrl}${ogImagePath}`;

        console.log('[OGP] Redirecting to static image:', imageUrl);

        // 静的画像を読み込んでそのまま返す
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch OGP image: ${imageResponse.status}`);
        }

        const imageBuffer = await imageResponse.arrayBuffer();

        return new Response(imageBuffer, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });

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
                        backgroundColor: '#F9F9F9',
                        color: '#333',
                        fontSize: 32,
                        fontWeight: 'bold',
                        padding: 40,
                    }}
                >
                    <div>THE FIVE</div>
                    <div style={{ fontSize: 24, marginTop: 20 }}>画像生成エラー</div>
                </div>
            ),
            { ...size }
        );
    }
}
