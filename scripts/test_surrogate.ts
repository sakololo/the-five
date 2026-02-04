
import { truncateQuery } from '../src/lib/search/core/normalizer';

function testSurrogateTruncation() {
    console.log("🧪 Testing Surrogate Pair Truncation...\n");

    // Case 1: Simple ASCII (101 chars)
    const longAscii = "a".repeat(101);
    const truncAscii = truncateQuery(longAscii);
    console.log(`ASCII (101): ${truncAscii.length === 100 ? "✅" : "❌"} (${truncAscii.length})`);

    // Case 2: Surrogate Pair at Boundary
    // "𠮷" is 2 chars (units). 
    // We want a string where index 99 is the first unit of a surrogate pair.
    // 99 "a"s + "𠮷" -> Total 101 length (99 + 2).
    // slice(0, 100) will take 99 "a"s and the first unit of "𠮷".
    // This results in a lone surrogate \uD842 (invalid).
    const prefix = "a".repeat(99);
    const surrogateChar = "𠮷"; // \uD842\uDFB7
    const dangerousStr = prefix + surrogateChar;

    console.log(`Input Length: ${dangerousStr.length}`); // Should be 101

    const result = truncateQuery(dangerousStr);
    console.log(`Output Length: ${result.length}`);

    // Check for lone surrogate at the end
    const lastChar = result.charCodeAt(result.length - 1);
    console.log(`Last Char Code: 0x${lastChar.toString(16)}`);

    if (lastChar >= 0xD800 && lastChar <= 0xDBFF) {
        console.log("❌ FAILED: Lone High Surrogate detected at end of string!");
        console.log("   The character '𠮷' was split.");
    } else if (result.length === 99) {
        console.log("✅ PASSED: Surrogate pair was safely removed (shortened to 99).");
    } else if (result.length === 101) {
        console.log("❌ FAILED: String was not truncated?");
    } else {
        console.log("❓ UNKNOWN Result");
    }
}

testSurrogateTruncation();
