
const TERMS = [
    "アーシア",
    "はいぱー少女_ウッキー!"
];

async function verifySearch() {
    console.log("Starting Arsia/Hyper Debug...");

    for (const term of TERMS) {
        try {
            const params = new URLSearchParams({ q: term });
            const url = `http://localhost:3000/api/search?${params.toString()}`;

            console.log(`\n🔍 Searching for: ${term}`);
            const res = await fetch(url);

            const data = await res.json() as any;
            const books = data.books || [];

            console.log(`   Found ${books.length} results.`);
            if (books.length > 0) {
                console.log("   --- Top Results ---");
                books.slice(0, 5).forEach((b: any) => {
                    console.log(`   [${b.score}] ${b.title}`);
                });
            }
        } catch (err) {
            console.error(err);
        }
    }
}

verifySearch();
