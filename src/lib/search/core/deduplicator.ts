import { ScoredBook } from './scorer';
import { extractVolumeNumber } from './normalizer';

/**
 * Deduplicate books by series title.
 * If multiple books belong to the same series, only the one with the highest score is kept.
 * 
 * Logic:
 * 1. Normalize title by removing volume numbers.
 * 2. Group by normalized title.
 * 3. Keep the best scored book for each group.
 */
export function deduplicateBooks(books: ScoredBook[]): ScoredBook[] {
    const seenSeries = new Map<string, ScoredBook>();

    for (const book of books) {
        // Create a normalized series title
        let seriesTitle = book.title;

        // Remove known volume patterns to get the series stem
        // Note: extractVolumeNumber returns a number, but we need to strip the *text* that represents the number.
        // We use a similar regex approach to what extractVolumeNumber handles, but for replacement.

        // Regexes adapted from extractVolumeNumber and common patterns
        seriesTitle = seriesTitle
            .replace(/\s*\d+$/, '')          // "Title 10" -> "Title"
            .replace(/\s*\(?\d+\)?$/, '')    // "Title (10)" -> "Title"
            .replace(/\s*（\d+）$/, '')        // "Title （10）" -> "Title"
            .replace(/\s*\d+\s*巻$/, '')     // "Title 10巻" -> "Title"
            .replace(/\s*第\d+巻$/, '')       // "Title 第10巻" -> "Title"
            .replace(/\s*Vol\.?\s*\d+$/i, '') // "Title Vol.10" -> "Title"
            .trim();

        // Normalize for key generation (lowercase, remove spaces)
        // This ensures "One Piece" and "ONE PIECE" and "OnePiece" collide
        const key = seriesTitle.toLowerCase().replace(/[\s　]/g, '');

        if (!seenSeries.has(key)) {
            seenSeries.set(key, book);
        } else {
            const existing = seenSeries.get(key)!;
            // If current book has higher score, replace existing
            if (book.score > existing.score) {
                seenSeries.set(key, book);
            }
            // If scores are equal, we stick with the first one found (since the list is already sorted by score)
            // The input `books` should ideally be sorted by score descending before calling this.
        }
    }

    // Convert map values back to array and re-sort (just in case the order got mixed up by Map iteration)
    return Array.from(seenSeries.values()).sort((a, b) => b.score - a.score);
}
