/**
 * レート制限ユーティリティ
 *
 * Misskey.io など、投稿頻度に制限があるサーバー向けのクールダウン管理。
 * カラムの lowRate フラグが true の場合に適用される。
 */

/** Misskey.io のホスト名パターン */
const MISSKEY_IO_HOSTS = ['misskey.io', 'https://misskey.io'];

/** デフォルトのクールダウン時間 (ms) */
const DEFAULT_COOLDOWN_MS = 3000;

/**
 * 指定されたホストが Misskey.io かどうかを判定する
 */
export function isMisskeyIo(hostUrl: string): boolean {
  const normalized = hostUrl.replace(/\/+$/, '');
  return MISSKEY_IO_HOSTS.some(
    (h) => normalized === h || normalized === `https://${h}`,
  );
}

/**
 * アカウントごとの最後の投稿時刻を管理するマップ
 */
const lastPostTimes = new Map<number, number>();

/**
 * 指定アカウントが投稿可能かどうかを判定する。
 * クールダウン中の場合は残り時間 (ms) を返す。投稿可能なら 0 を返す。
 */
export function getRemainingCooldown(
  accountId: number,
  cooldownMs: number = DEFAULT_COOLDOWN_MS,
): number {
  const lastTime = lastPostTimes.get(accountId);
  if (!lastTime) return 0;
  const elapsed = Date.now() - lastTime;
  return Math.max(0, cooldownMs - elapsed);
}

/**
 * 投稿完了時に呼び出し、最後の投稿時刻を記録する
 */
export function recordPost(accountId: number): void {
  lastPostTimes.set(accountId, Date.now());
}

/**
 * クールダウンをクリアする（テスト用）
 */
export function clearCooldowns(): void {
  lastPostTimes.clear();
}
