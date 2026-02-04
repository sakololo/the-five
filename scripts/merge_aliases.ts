
import * as fs from 'fs';
import * as path from 'path';

const MARKDOWN_PATH = path.join(process.cwd(), 'src', 'app', 'api', 'search', 'ADDITIONAL_ALIASES.md');
const TS_PATH = path.join(process.cwd(), 'src', 'app', 'api', 'search', 'aliases.ts');

async function mergeAliases() {
    console.log('🚀 Starting Alias Merge (Fixed Regex)...');

    // 1. Read Markdown
    if (!fs.existsSync(MARKDOWN_PATH)) {
        console.error('❌ Markdown file not found:', MARKDOWN_PATH);
        process.exit(1);
    }
    const mdContent = fs.readFileSync(MARKDOWN_PATH, 'utf-8');

    // Extract aliases from Markdown using Robust Regex
    // Matches: 'key': 'value',
    // Handles escaped characters (like \') inside the string
    const mdRegex = /'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g;
    const newAliases = new Map<string, string>();

    let match;
    let count = 0;
    while ((match = mdRegex.exec(mdContent)) !== null) {
        if (match[1] === '略称1' || match[1] === '略称') continue;

        newAliases.set(match[1], match[2]);
        count++;
    }
    console.log(`📦 Extracted ${count} aliases from Markdown.`);

    // 2. Read Existing TS File
    if (!fs.existsSync(TS_PATH)) {
        console.error('❌ TypeScript file not found:', TS_PATH);
        process.exit(1);
    }
    const tsContent = fs.readFileSync(TS_PATH, 'utf-8');

    // Extract existing aliases
    const existingAliases = new Map<string, string>();
    // Same robust regex for existing file
    const tsRegex = /'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g;

    let tsMatch;
    let tsCount = 0;
    while ((tsMatch = tsRegex.exec(tsContent)) !== null) {
        if (tsMatch[1] === '略称1' || tsMatch[1] === '略称') continue;
        existingAliases.set(tsMatch[1], tsMatch[2]);
        tsCount++;
    }
    console.log(`📂 Read ${tsCount} existing aliases from TS file.`);

    // 3. Merge (New overwrites Old if collision)
    const mergedAliases = new Map(existingAliases);
    let addedOrUpdated = 0;

    for (const [key, value] of newAliases) {
        if (!mergedAliases.has(key) || mergedAliases.get(key) !== value) {
            mergedAliases.set(key, value);
            addedOrUpdated++;
        }
    }
    console.log(`🔄 Merged: ${mergedAliases.size} total entries (${addedOrUpdated} added/updated).`);

    // 4. Generate New Content
    const sortedKeys = Array.from(mergedAliases.keys()).sort();

    const lines = [];
    lines.push(`// Auto-generated alias dictionary for manga search`);
    lines.push(`// Total entries: ${mergedAliases.size}`);
    lines.push(`// Last updated: ${new Date().toISOString().split('T')[0]}`);
    lines.push(``);
    lines.push(`export const MANGA_ALIASES: Record<string, string> = {`);

    for (const key of sortedKeys) {
        const value = mergedAliases.get(key);
        // We TRUST the value captured by regex is already properly escaped for a single-quoted string
        // because it came from a single-quoted string.
        lines.push(`  '${key}': '${value}',`);
    }

    lines.push(`};`);
    lines.push(``);

    // 5. Write File
    fs.writeFileSync(TS_PATH, lines.join('\n'), 'utf-8');
    console.log(`✅ Successfully wrote to ${TS_PATH}`);
}

mergeAliases().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
