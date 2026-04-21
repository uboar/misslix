import * as mfm from 'mfm-js';
import type { MfmNode, MfmSimpleNode } from 'mfm-js';

const MAX_PARSE_CACHE_SIZE = 500;

const blockParseCache = new Map<string, MfmNode[]>();
const plainParseCache = new Map<string, MfmSimpleNode[]>();

function getCachedParseResult<T>(
  cache: Map<string, T>,
  text: string,
  parser: (value: string) => T,
): T {
  const cached = cache.get(text);
  if (cached) {
    // LRU風に更新して、頻出テキストを残しやすくする
    cache.delete(text);
    cache.set(text, cached);
    return cached;
  }

  const parsed = parser(text);
  cache.set(text, parsed);

  if (cache.size > MAX_PARSE_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  return parsed;
}

/**
 * MFMテキストをASTに変換する (ブロックモード)
 */
export function parseMfm(text: string): MfmNode[] {
  return getCachedParseResult(blockParseCache, text, (value) => mfm.parse(value));
}

/**
 * MFMテキストをASTに変換する (シンプル/プレーンモード)
 */
export function parseMfmPlain(text: string): MfmSimpleNode[] {
  return getCachedParseResult(plainParseCache, text, (value) => mfm.parseSimple(value));
}
