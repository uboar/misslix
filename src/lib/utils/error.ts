/**
 * エラーハンドリングユーティリティ
 *
 * API呼び出し失敗時のリトライ、エラーメッセージ抽出、トースト通知を提供する。
 */

/**
 * API エラーからユーザー向けメッセージを抽出する
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // misskey-js の APIError は message に詳細が含まれる
    if ('info' in error && typeof (error as any).info === 'object') {
      const info = (error as any).info;
      if (info?.error?.message) {
        return String(info.error.message);
      }
    }
    return error.message;
  }
  if (typeof error === 'string') return error;
  return '不明なエラーが発生しました';
}

/**
 * リトライ付き非同期関数実行
 *
 * @param fn - 実行する非同期関数
 * @param maxRetries - 最大リトライ回数 (デフォルト: 2)
 * @param delayMs - リトライ間隔 (デフォルト: 1000ms、指数バックオフ)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * Math.pow(2, attempt)),
        );
      }
    }
  }
  throw lastError;
}

// ─── トースト通知 ───

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export type Toast = {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
};

let toastIdCounter = 0;

/** 現在表示中のトースト一覧（リアクティブストアから参照） */
let _toasts: Toast[] = [];
let _listeners: Array<(toasts: Toast[]) => void> = [];

function notifyListeners() {
  for (const listener of _listeners) {
    listener([..._toasts]);
  }
}

/**
 * トースト通知を表示する
 */
export function showToast(
  message: string,
  type: ToastType = 'info',
  duration: number = 4000,
): number {
  const id = ++toastIdCounter;
  const toast: Toast = { id, message, type, duration };
  _toasts = [..._toasts, toast];
  notifyListeners();

  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }

  return id;
}

/**
 * トースト通知を閉じる
 */
export function dismissToast(id: number): void {
  _toasts = _toasts.filter((t) => t.id !== id);
  notifyListeners();
}

/**
 * トースト一覧の変更を購読する
 */
export function subscribeToasts(
  listener: (toasts: Toast[]) => void,
): () => void {
  _listeners.push(listener);
  listener([..._toasts]);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

/**
 * API エラーをトーストで表示する
 */
export function showApiError(error: unknown, context?: string): void {
  const msg = extractErrorMessage(error);
  const prefix = context ? `${context}: ` : '';
  showToast(`${prefix}${msg}`, 'error', 6000);
}
