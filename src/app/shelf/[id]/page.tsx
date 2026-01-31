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

    const categoryTitle = shelf.category === 'recommend'
        ? '今読んでほしい、5冊。'
        : '私を形作る、5冊。';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <header className="text-center mb-8">
                    <a href="/" className="inline-block cursor-pointer">
                        <h1
                            className="text-4xl font-bold tracking-wide"
                            style={{
                                fontFamily: "'Permanent Marker', cursive",
                                fontStyle: 'italic',
                                transform: 'skewX(-8deg)',
                            }}
                        >
                            THE FIVE
                        </h1>
                    </a>
                    <p
                        className="text-lg text-gray-700 mt-4 font-medium"
                        style={{ fontFamily: "'Kaisei Tokumin', serif" }}
                    >
                        {categoryTitle}
                    </p>
                </header>

                {/* Shelf Display */}
                <ShelfDisplay shelf={shelf} />

                {/* Hint */}
                <p className="text-center text-sm text-gray-500 mt-4">
                    📚 本の表紙をタップすると、購入ページへ移動します
                </p>

                {/* Call to Action */}
                <div className="text-center mt-12">
                    <a
                        href="/"
                        className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:from-blue-700 hover:to-indigo-700 transition transform hover:scale-105"
                    >
                        あなたの5冊を選ぶ
                    </a>
                </div>

                {/* Footer */}
                <footer className="text-center mt-16 py-8 border-t border-gray-200">
                    <p className="text-sm text-gray-500">THE FIVE © 2026</p>
                </footer>
            </div>
        </div>
    );
}
