const fs = require('fs');
const path = require('path');

// Read the ADDITIONAL_ALIASES.md file
const mdPath = path.join(__dirname, '..', 'src', 'app', 'api', 'search', 'ADDITIONAL_ALIASES.md');
const content = fs.readFileSync(mdPath, 'utf-8');

// Extract all alias lines from TypeScript code blocks
const aliases = new Map();
const lines = content.split('\n');
let inCodeBlock = false;

for (const line of lines) {
    if (line.includes('```typescript') || line.includes('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
    }
    if (inCodeBlock) {
        // Match pattern: 'key': 'value' or "key": "value"
        const match = line.match(/^\s*['"](.+?)['"]\s*:\s*['"](.+?)['"]\s*,?\s*(\/\/.*)?$/);
        if (match) {
            const key = match[1];
            const value = match[2];
            // Only add if not already present (avoid duplicates)
            if (!aliases.has(key)) {
                aliases.set(key, value);
            }
        }
    }
}

console.log('Total unique aliases extracted:', aliases.size);

// Generate the TypeScript file
let tsContent = `// Auto-generated alias dictionary for manga search
// Total entries: ${aliases.size}
// Last updated: ${new Date().toISOString().split('T')[0]}

export const MANGA_ALIASES: Record<string, string> = {
`;

// Sort aliases by key for maintainability
const sortedEntries = Array.from(aliases.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ja'));

for (const [key, value] of sortedEntries) {
    // Use double quotes if the value contains a single quote
    if (value.includes("'")) {
        tsContent += `  '${key}': "${value}",\n`;
    } else {
        tsContent += `  '${key}': '${value}',\n`;
    }
}

tsContent += `};\n`;

// Write the new aliases.ts file
const outputPath = path.join(__dirname, '..', 'src', 'app', 'api', 'search', 'aliases.ts');
fs.writeFileSync(outputPath, tsContent, 'utf-8');

console.log('Generated aliases.ts with', aliases.size, 'entries');
console.log('Output path:', outputPath);
