/**
 * Volume Parser
 * 
 * タイトルから巻数を抽出するためのユーティリティ関数。
 * 楽天APIのレスポンスには明確なvolumeNumberフィールドがないため、
 * タイトル文字列から推測する必要がある。
 */

/**
 * タイトルから巻数を抽出する
 * 
 * 対応パターン:
 * - "ONE PIECE 114" -> 114
 * - "進撃の巨人(34)" -> 34
 * - "鬼滅の刃 23巻" -> 23
 * - "HUNTER×HUNTER No.37" -> 37
 * - "Vol.12" -> 12
 */
export function extractVolumeNumber(title: string): number | null {
    if (!title || typeof title !== 'string') return null;

    // 正規化: 全角数字を半角に
    const normalizedTitle = title.replace(/[０-９]/g, (c) =>
        String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
    );

    const patterns = [
        // 優先度1: 末尾の数字 (空白区切り) "Title 10"
        /[\s　]+(\d+)$/,

        // 優先度2: 「巻」付き "第10巻", "10巻"
        /(?:第)?(\d+)巻/,

        // 優先度3: 括弧付き "(10)", "（10）"
        /[(（](\d+)[)）]/,

        // 優先度4: Vol表記 "Vol.10", "Vol 10"
        /Vol\.?\s*(\d+)/i,

        // 優先度5: No表記 "No.10"
        /No\.?\s*(\d+)/i,

        // 優先度6: 末尾の数字 (区切りなしは危険だが、シリーズ名+数字のパターンが多いので採用)
        // ただし、数字が4桁以上の場合は年の可能性があるので除外 (例: 2024)
        /(\d{1,3})$/
    ];

    for (const pattern of patterns) {
        const match = normalizedTitle.match(pattern);
        if (match) {
            const num = parseInt(match[1], 10);
            // 妥当性チェック: 0巻〜1500巻 (こち亀が200巻なので余裕を持つ)
            if (!isNaN(num) && num >= 0 && num <= 1500) {
                return num;
            }
        }
    }

    return null;
}
