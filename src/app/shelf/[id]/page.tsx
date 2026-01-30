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

    if (!shelf) {
        return {
            title: 'THE FIVE - 本棚が見つかりません',
        };
    }

    const bookTitles = shelf.books.map(b => b.title).join('、');

    return {
        title: 'THE FIVE - 私を形づくる5冊',
        description: `${bookTitles}`,
        openGraph: {
            title: 'THE FIVE - 私を形づくる5冊',
            description: `${bookTitles}`,
            type: 'website',
            images: [`/shelf/${id}/opengraph-image`],
        },
        twitter: {
            card: 'summary_large_image',
            title: 'THE FIVE - 私を形づくる5冊',
            description: `${bookTitles}`,
            images: [`/shelf/${id}/opengraph-image`],
        },
    };
}

export default async function ShelfPage({ params }: PageProps) {
    const { id } = await params;
    const shelf = await getShelf(id);

    if (!shelf) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <header className="text-center mb-8">
                    <h1
                        className="text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent tracking-tight"
                    >
                        THE FIVE
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">私を形づくる5冊</p>
                </header>

                {/* Shelf Display */}
                <ShelfDisplay shelf={shelf} />

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
