

const TERMS = [
    "ONE PIECE", // Control
    "はいぱー少女_ウッキー!",
    "茶の涙_〜Larmes_de_the〜",
    "アーシア",
    "星のカービィ_デデデでプププなものがた",
    "ココロ図書館",
    "ストップ!!_ひばりくん!"
];

async function verifySearch() {
    console.log("Starting search verification via API...");

    for (const term of TERMS) {
        try {
            // Use URLSearchParams to properly encode
            const params = new URLSearchParams({ q: term });
            const url = `http://localhost:3000/api/search?${params.toString()}`;

            console.log(`Searching for: ${term}`);
            const start = Date.now();
            const res = await fetch(url);
            const duration = Date.now() - start;

            if (!res.ok) {
                console.error(`❌ Failed: ${term} (Status: ${res.status})`);
                const text = await res.text();
                console.error(`   Response: ${text.slice(0, 200)}`);
                continue;
            }

            const data = await res.json() as any;
            const books = data.books || [];

            if (data.warning) {
                console.warn(`   ⚠️ Warning: ${data.warning}`);
            }

            if (books.length > 0) {
                console.log(`✅ Found ${books.length} results for "${term}" in ${duration}ms`);
                // Log first result title to verify relevance
                console.log(`   Top result: ${books[0].title}`);
            } else {
                console.log(`⚠️ No results for "${term}"`);
            }
        } catch (err) {
            console.error(`❌ Error searching for "${term}":`, err);
        }
        console.log("---");
    }
}

verifySearch();
