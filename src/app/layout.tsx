import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
    title: "THE FIVE ｜ あなたの正体を、5冊で読み解く。",
    description: "好きなマンガ5冊を選んで、AIがあなたの感性を読み解き、特別な「二つ名」を命名します。",
    metadataBase: new URL(siteUrl),
    openGraph: {
        title: "THE FIVE ｜ あなたの正体を、5冊で読み解く。",
        description: "好きなマンガ5冊を選んで、AIがあなたの感性を読み解き、特別な「二つ名」を命名します。",
        type: "website",
        url: siteUrl,
        siteName: "THE FIVE",
        images: [
            {
                url: `${siteUrl}/api/og`,
                width: 1200,
                height: 630,
                alt: "THE FIVE ｜ あなたの正体を、5冊で読み解く。",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "THE FIVE ｜ あなたの正体を、5冊で読み解く。",
        description: "好きなマンガ5冊を選んで、AIがあなたの感性を読み解き、特別な「二つ名」を命名します。",
        images: [`${siteUrl}/api/og`],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Permanent+Marker&family=Kaisei+Tokumin:wght@400;500&family=Shippori+Mincho:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="min-h-screen antialiased">
                {children}
            </body>
        </html>
    );
}
