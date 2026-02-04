
const TERMS = [
    // Tea of Tears variations
    "茶の涙",
    "茶の涙 Larmes de the",
    "茶の涙_Larmes_de_the",

    // Kokoro Library variations
    "ココロ図書館",
    "ココロ 図書館",

    // Stop Hibari-kun variations
    "ストップ!! ひばりくん!",
    "ストップ ひばりくん",
    "ストップ!!ひばりくん!",
];

async function verifySearch() {
    console.log("Starting search DEBUG verification via API...");

    for (const term of TERMS) {
        try {
            const params = new URLSearchParams({ q: term });
            const url = `http://localhost:3000/api/search?${params.toString()}`;

            console.log(`Searching for: ${term}`);
            const start = Date.now();
            const res = await fetch(url);
            const duration = Date.now() - start;

            if (!res.ok) {
                console.error(`❌ Failed: ${term} (Status: ${res.status})`);
                continue;
            }

            const data = await res.json() as any;
            const books = data.books || [];

            if (books.length > 0) {
                console.log(`✅ Found ${books.length} results for "${term}" in ${duration}ms`);
                console.log(`   Top: ${books[0].title}`);
            } else {
                console.log(`⚠️ No results for "${term}"`);
            }
        } catch (err) {
            console.error(`❌ Error scanning "${term}":`, err);
        }
        console.log("---");
    }
}

verifySearch();
