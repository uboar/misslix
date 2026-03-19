import * as mfm from 'mfm-js';
import type { MfmNode, MfmSimpleNode } from 'mfm-js';

/**
 * MFMテキストをASTに変換する (ブロックモード)
 */
export function parseMfm(text: string): MfmNode[] {
  return mfm.parse(text);
}

/**
 * MFMテキストをASTに変換する (シンプル/プレーンモード)
 */
export function parseMfmPlain(text: string): MfmSimpleNode[] {
  return mfm.parseSimple(text);
}
