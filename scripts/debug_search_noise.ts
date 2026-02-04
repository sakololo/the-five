
const TERMS = [
    "ハヤテのごとく",
    "はいぱー少女_ウッキー!"
];

async function verifySearch() {
    console.log("Starting Search Noise Investigation...");

    for (const term of TERMS) {
        try {
            const params = new URLSearchParams({ q: term });
            const url = `http://localhost:3000/api/search?${params.toString()}`;

            console.log(`\n🔍 Searching for: ${term}`);
            const res = await fetch(url);

            if (!res.ok) {
                console.error(`❌ Failed: ${term} (Status: ${res.status})`);
                continue;
            }

            const data = await res.json() as any;
            const books = data.books || [];

            console.log(`   Found ${books.length} results.`);
            if (books.length > 0) {
                console.log("   --- Top 10 Results ---");
                books.slice(0, 10).forEach((b: any, i: number) => {
                    console.log(`   ${i + 1}. [${b.score}] ${b.title} (ISBN: ${b.isbn})`);
                });
            }
        } catch (err) {
            console.error(`❌ Error scanning "${term}":`, err);
        }
    }
}

verifySearch();
