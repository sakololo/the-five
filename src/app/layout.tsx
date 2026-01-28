import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "THE FIVE - 私を形作る、5つの物語",
    description: "好きなマンガ5冊を選んで、AIがあなたの感性を読み解き、特別な「二つ名」を命名します。",
    openGraph: {
        title: "THE FIVE - 私を形作る、5つの物語",
        description: "好きなマンガ5冊を選んで、AIがあなたの感性を読み解き、特別な「二つ名」を命名します。",
        type: "website",
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
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Permanent+Marker&family=Kaisei+Tokumin:wght@400;500&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="min-h-screen antialiased">
                {children}
            </body>
        </html>
    );
}
