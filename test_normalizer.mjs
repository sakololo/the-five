// Quick test to check normalizer behavior
import { normalizeSearchQuery } from './src/lib/search/core/normalizer.ts';

const result = normalizeSearchQuery('ワンピース チョッパー');
console.log(JSON.stringify(result, null, 2));
