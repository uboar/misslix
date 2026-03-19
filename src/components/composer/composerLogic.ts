/**
 * composer ロジック — PostModal / InlineComposer 共通のビジネスロジック
 *
 * Svelte コンポーネントから切り出した純粋関数群。
 * 外部 API 呼出しは引数の cli に委譲するため、テストでモック可能。
 */

import type { api } from 'misskey-js';
import type { Account, AccountRuntime, Visibility } from '$lib/types';

type APIClient = api.APIClient;

// ─── 投稿パラメータ ───

export type PostParams = {
  text: string;
  cw?: string | null;
  visibility: Visibility;
  localOnly: boolean;
  replyId?: string | null;
  renoteId?: string | null;
};

// ─── アカウント選択 ───

/**
 * 全アカウントを選択した ID セットを返す。
 */
export function selectAll(accounts: Account[]): Set<number> {
  return new Set(accounts.map((a) => a.id));
}

/**
 * 全アカウントを解除した空セットを返す。
 */
export function deselectAll(): Set<number> {
  return new Set<number>();
}

/**
 * 1 つのアカウントのトグル。含まれていれば削除、なければ追加。
 * 元の Set を変更せず新しい Set を返す。
 */
export function toggleAccount(selected: Set<number>, id: number): Set<number> {
  const next = new Set(selected);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

// ─── CW ───

/**
 * CW を有効化したときに返すデフォルト文字列（空文字）。
 * 無効化したときは null を返す。
 */
export function toggleCw(enabled: boolean): string | null {
  return enabled ? '' : null;
}

// ─── バリデーション ───

/**
 * 投稿可能かどうかを判定する。
 *
 * - text が空でも renoteId があれば投稿可能（Renote）
 * - selectedAccounts が 1 以上
 */
export function canPost(
  text: string,
  selectedCount: number,
  renoteId?: string | null,
): boolean {
  if (selectedCount === 0) return false;
  if (renoteId) return true;
  return text.trim().length > 0;
}

// ─── API 呼出し ───

/**
 * `notes/create` エンドポイントに投稿する。
 * テスト用に cli を引数で受け取る。
 */
export async function postNote(cli: APIClient, params: PostParams): Promise<unknown> {
  const body: Record<string, unknown> = {
    text: params.text || undefined,
    visibility: params.visibility,
    localOnly: params.localOnly,
  };

  if (params.cw !== null && params.cw !== undefined) {
    body.cw = params.cw;
  }
  if (params.replyId) {
    body.replyId = params.replyId;
  }
  if (params.renoteId) {
    body.renoteId = params.renoteId;
  }

  return cli.request('notes/create', body as Parameters<APIClient['request']>[1]);
}

/**
 * 複数アカウントに同時投稿する。
 * Promise.allSettled で全アカウントの結果を返す。
 */
export async function postToMultipleAccounts(
  runtimes: Map<number, AccountRuntime>,
  selectedIds: Set<number>,
  params: PostParams,
): Promise<PromiseSettledResult<unknown>[]> {
  const promises: Promise<unknown>[] = [];

  for (const id of selectedIds) {
    const runtime = runtimes.get(id);
    if (runtime) {
      promises.push(postNote(runtime.cli, params));
    }
  }

  return Promise.allSettled(promises);
}

// ─── 可視性ラベル ───

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  public: '公開',
  home: 'ホーム',
  followers: 'フォロワー',
  specified: '指定ユーザー',
};
