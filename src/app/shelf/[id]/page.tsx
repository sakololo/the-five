import { Metadata } from 'next';
import { getShelf } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import ShelfDisplay from './ShelfDisplay';

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const shelf = await getShelf(id);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://the-five-beige.vercel.app';
    const pageUrl = `${siteUrl}/shelf/${id}`;

    if (!shelf) {
        return {
            title: 'THE FIVE - 本棚が見つかりません',
        };
    }

    const bookTitles = shelf.books.map(b => b.title).join('、');
    const categoryTitle = shelf.category === 'recommend'
        ? 'THE FIVE - 今おすすめしたい、5冊。'
        : 'THE FIVE - あなたを、5冊で。';
    const ogImageUrl = `${siteUrl}/shelf/${id}/opengraph-image`;

    return {
        title: categoryTitle,
        description: `${bookTitles}`,
        metadataBase: new URL(siteUrl),
        openGraph: {
            title: categoryTitle,
            description: `${bookTitles}`,
            url: pageUrl,
            siteName: 'THE FIVE',
            type: 'website',
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: categoryTitle,
                }
            ],
        },
        twitter: {
            card: 'summary_large_image',
            site: '@',
            title: categoryTitle,
            description: `${bookTitles}`,
            images: [{
                url: ogImageUrl,
                alt: categoryTitle,
            }],
        },
    };
}

export default async function ShelfPage({ params }: PageProps) {
    const { id } = await params;
    const shelf = await getShelf(id);

    if (!shelf) {
        notFound();
    }

    const categorySubtitle = shelf.category === 'recommend'
        ? '今読んでほしい、5冊。'
        : '私が選んだ、5つの物語。';

    return (
        <div
            className="min-h-screen flex flex-col items-center py-16 sm:py-24 font-serif text-gray-800"
            style={{ backgroundColor: '#F9F9F9' }}
        >
            {/* Museum Header */}
            <div className="mb-24 sm:mb-32 text-center px-6">
                <p className="text-[10px] text-gray-400 tracking-[0.3em] uppercase mb-4">
                    THE FIVE
                </p>
                <h1
                    className="text-lg sm:text-xl font-medium tracking-widest leading-relaxed"
                    style={{ fontFamily: "'Shippori Mincho', serif" }}
                >
                    {categorySubtitle.split('、').map((part, i) => (
                        <span key={i}>
                            {part}{i === 0 && <br />}
                        </span>
                    ))}
                </h1>
                {/* Vertical divider line */}
                <div className="w-px h-12 sm:h-16 bg-gray-200 mx-auto mt-8 sm:mt-10" />
                {/* Hint text */}
                <p className="text-[11px] sm:text-xs text-gray-400 mt-6 tracking-wide">
                    本の表紙をタップすると、楽天の購入ページへ移動します。
                </p>
            </div>

            {/* Books - Museum Gallery */}
            <ShelfDisplay shelf={shelf} />

            {/* Call to Action - Minimal */}
            <div className="mt-16 sm:mt-20 mb-16 sm:mb-20 text-center">
                <p className="text-xs text-gray-400 mb-6 tracking-widest">
                    あなたも、本棚を作りませんか？
                </p>
                <a
                    href="/"
                    className="inline-block bg-black text-white px-8 py-3 rounded-full text-xs tracking-widest shadow-xl hover:scale-105 transition-transform"
                >
                    自分の5冊を選ぶ
                </a>
            </div>

            {/* Footer - Minimal */}
            <footer className="text-center py-8">
                <p className="text-[10px] text-gray-300 tracking-widest">THE FIVE © 2026</p>
            </footer>
        </div>
    );
}
