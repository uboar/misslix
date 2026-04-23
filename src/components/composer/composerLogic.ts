/**
 * composer ロジック — PostModal / InlineComposer 共通のビジネスロジック
 *
 * Svelte コンポーネントから切り出した純粋関数群。
 * 外部 API 呼出しは引数の cli に委譲するため、テストでモック可能。
 */

import type { api } from 'misskey-js';
import type { Account, AccountRuntime, PostPoll, Visibility } from '$lib/types';
import { getRemainingCooldown, recordPost, isMisskeyIo } from '$lib/utils/rateLimit';

type APIClient = api.APIClient;

// ─── 投稿パラメータ ───

export type PostParams = {
  text: string;
  cw?: string | null;
  visibility: Visibility;
  localOnly: boolean;
  replyId?: string | null;
  renoteId?: string | null;
  channelId?: string | null;
  fileIds?: string[];
  poll?: PostPoll | null;
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
 * - text が空でも fileCount > 0 があれば投稿可能（ファイル添付）
 * - selectedAccounts が 1 以上
 */
export function canPost(
  text: string,
  selectedCount: number,
  renoteId?: string | null,
  fileCount = 0,
  hasPoll = false,
): boolean {
  if (selectedCount === 0) return false;
  if (renoteId) return true;
  if (fileCount > 0) return true;
  if (hasPoll) return true;
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
  if (params.channelId) {
    body.channelId = params.channelId;
  }
  if (params.fileIds && params.fileIds.length > 0) {
    body.fileIds = params.fileIds;
  }
  if (params.poll) {
    body.poll = params.poll;
  }

  return (cli as any).request('notes/create', body);
}

/**
 * 複数アカウントに同時投稿する。
 * Promise.allSettled で全アカウントの結果を返す。
 * レート制限対象アカウントはクールダウン後に投稿する。
 */
export async function postToMultipleAccounts(
  runtimes: Map<number, AccountRuntime>,
  selectedIds: Set<number>,
  params: PostParams,
  accounts?: Account[],
): Promise<PromiseSettledResult<unknown>[]> {
  const promises: Promise<unknown>[] = [];

  for (const id of selectedIds) {
    const runtime = runtimes.get(id);
    if (!runtime) continue;

    // レート制限チェック
    const account = accounts?.find((a) => a.id === id);
    const needsCooldown = account && isMisskeyIo(account.hostUrl);
    const remaining = needsCooldown ? getRemainingCooldown(id) : 0;

    const doPost = async () => {
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      const result = await postNote(runtime.cli, params);
      recordPost(id);
      return result;
    };

    promises.push(doPost());
  }

  return Promise.allSettled(promises);
}

// ─── ファイルアップロード ───

/**
 * ファイルを Misskey ドライブにアップロードし、ドライブファイル ID を返す。
 * misskey-js の APIClient は multipart/form-data をサポートしないため fetch を直接使用する。
 */
export async function uploadFileToDrive(
  hostUrl: string,
  token: string,
  file: File,
  isSensitive = false,
): Promise<string> {
  const origin = hostUrl.startsWith('http') ? hostUrl : `https://${hostUrl}`;
  const formData = new FormData();
  formData.append('i', token);
  formData.append('file', file);
  formData.append('name', file.name);
  if (isSensitive) formData.append('isSensitive', 'true');

  const res = await fetch(`${origin}/api/drive/files/create`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`ファイルアップロード失敗: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

// ─── UI用定数 ───

export const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: string }[] = [
  { value: 'public', label: 'パブリック', icon: '🌐' },
  { value: 'home', label: 'ホーム', icon: '🏠' },
  { value: 'followers', label: 'フォロワー', icon: '🔒' },
];

/**
 * テキストエリアのカーソル位置に絵文字を挿入する。
 * textareaEl が null の場合はテキスト末尾に追記する。
 * 戻り値: 新テキストとカーソル位置 (cursorPos が -1 の場合はカーソル更新不要)
 */
export function insertEmojiAtCursor(
  name: string,
  text: string,
  textareaEl: HTMLTextAreaElement | null,
): { text: string; cursorPos: number } {
  const isUnicodeEmoji = /[^\x00-\x7F]/.test(name);
  const insertion = isUnicodeEmoji ? `${name} ` : `:${name}: `;
  if (!textareaEl) {
    return { text: text + insertion, cursorPos: -1 };
  }
  const start = textareaEl.selectionStart ?? text.length;
  const end = textareaEl.selectionEnd ?? text.length;
  return {
    text: text.slice(0, start) + insertion + text.slice(end),
    cursorPos: start + insertion.length,
  };
}

/**
 * ClipboardEvent から画像ファイルを抽出する。
 * 画像がなければ空配列を返す。
 */
export function extractImageFilesFromClipboard(e: ClipboardEvent): File[] {
  const items = e.clipboardData?.items;
  if (!items) return [];
  const imageFiles: File[] = [];
  for (const item of Array.from(items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) imageFiles.push(file);
    }
  }
  return imageFiles;
}

// ─── 可視性ラベル ───

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  public: '公開',
  home: 'ホーム',
  followers: 'フォロワー',
  specified: '指定ユーザー',
};
