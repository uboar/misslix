import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  extractErrorMessage,
  withRetry,
  showToast,
  dismissToast,
  subscribeToasts,
  showApiError,
  type Toast,
} from './error';

// モジュールレベルの状態をリセットするためのヘルパー
function clearAllToasts(toasts: Toast[]) {
  for (const t of toasts) {
    dismissToast(t.id);
  }
}

describe('extractErrorMessage', () => {
  it('Error インスタンスの message を返す', () => {
    const err = new Error('something went wrong');
    expect(extractErrorMessage(err)).toBe('something went wrong');
  });

  it('文字列をそのまま返す', () => {
    expect(extractErrorMessage('custom error string')).toBe('custom error string');
  });

  it('その他の値ではデフォルトメッセージを返す', () => {
    expect(extractErrorMessage(null)).toBe('不明なエラーが発生しました');
    expect(extractErrorMessage(undefined)).toBe('不明なエラーが発生しました');
    expect(extractErrorMessage(42)).toBe('不明なエラーが発生しました');
    expect(extractErrorMessage({ message: 'obj' })).toBe('不明なエラーが発生しました');
  });

  it('info.error.message を持つ Error → API エラーメッセージを返す', () => {
    const err = new Error('wrapper');
    (err as any).info = { error: { message: 'RATE_LIMIT_EXCEEDED' } };
    expect(extractErrorMessage(err)).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('info はあるが error.message がない場合は Error の message を返す', () => {
    const err = new Error('fallback message');
    (err as any).info = { error: {} };
    expect(extractErrorMessage(err)).toBe('fallback message');
  });

  it('info が null の場合は Error の message を返す', () => {
    const err = new Error('null info');
    (err as any).info = null;
    expect(extractErrorMessage(err)).toBe('null info');
  });
});

describe('withRetry', () => {
  // リアルタイマーを使用（delayMs=0 で setTimeout が即時解決されることを利用）

  it('成功時に結果を返す', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, 2, 0);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('1 回失敗後に成功 → 結果を返す', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('first fail'))
      .mockResolvedValue('recovered');

    const result = await withRetry(fn, 2, 0);

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('全リトライ失敗 → 最後のエラーを throw する', async () => {
    const lastError = new Error('always fails');
    const fn = vi.fn().mockRejectedValue(lastError);

    await expect(withRetry(fn, 2, 0)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // 初回 + 2回リトライ
  });

  it('maxRetries=0 の場合は 1 回だけ試行する', async () => {
    const err = new Error('single fail');
    const fn = vi.fn().mockRejectedValue(err);

    await expect(withRetry(fn, 0, 0)).rejects.toThrow('single fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('showToast / dismissToast / subscribeToasts', () => {
  let unsubscribe: (() => void) | null = null;
  let received: Toast[][] = [];

  beforeEach(() => {
    received = [];
    vi.useFakeTimers();
    unsubscribe = subscribeToasts((toasts) => {
      received.push(toasts);
    });
    // subscribeToasts は即座に現在のリストをリスナーに送る。
    // 前のテストの残留トーストをクリアする。
    const current = received[received.length - 1] ?? [];
    clearAllToasts(current);
    received = [];
  });

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = null;
    vi.useRealTimers();
  });

  describe('showToast', () => {
    it('リスナーにトーストが届く', () => {
      const id = showToast('hello', 'info', 4000);
      expect(id).toBeGreaterThan(0);
      const last = received[received.length - 1];
      expect(last.some((t) => t.message === 'hello')).toBe(true);
    });

    it('返り値の id でトーストを特定できる', () => {
      const id = showToast('identify me', 'success', 4000);
      const last = received[received.length - 1];
      expect(last.find((t) => t.id === id)?.message).toBe('identify me');
    });

    it('duration > 0 の場合、指定時間後に自動削除される', async () => {
      showToast('auto dismiss', 'info', 1000);
      const beforeDismiss = received[received.length - 1];
      expect(beforeDismiss.some((t) => t.message === 'auto dismiss')).toBe(true);

      vi.advanceTimersByTime(1000);

      const afterDismiss = received[received.length - 1];
      expect(afterDismiss.some((t) => t.message === 'auto dismiss')).toBe(false);
    });

    it('duration が 0 の場合は自動削除されない', () => {
      showToast('persistent', 'warning', 0);
      vi.advanceTimersByTime(60000);

      const current = received[received.length - 1];
      expect(current.some((t) => t.message === 'persistent')).toBe(true);

      // 後片付け
      clearAllToasts(current);
    });

    it('複数のトーストが蓄積される', () => {
      showToast('first', 'info', 0);
      showToast('second', 'error', 0);

      const current = received[received.length - 1];
      expect(current.some((t) => t.message === 'first')).toBe(true);
      expect(current.some((t) => t.message === 'second')).toBe(true);

      clearAllToasts(current);
    });
  });

  describe('dismissToast', () => {
    it('指定した id のトーストが削除される', () => {
      const id = showToast('to remove', 'info', 0);
      dismissToast(id);

      const current = received[received.length - 1];
      expect(current.some((t) => t.id === id)).toBe(false);
    });

    it('存在しない id を渡しても throw しない', () => {
      expect(() => dismissToast(-9999)).not.toThrow();
    });

    it('削除後に他のトーストは残る', () => {
      const id1 = showToast('keep', 'info', 0);
      const id2 = showToast('remove', 'info', 0);
      dismissToast(id2);

      const current = received[received.length - 1];
      expect(current.some((t) => t.id === id1)).toBe(true);
      expect(current.some((t) => t.id === id2)).toBe(false);

      clearAllToasts(current);
    });
  });

  describe('subscribeToasts', () => {
    it('購読解除後はリスナーが呼ばれない', () => {
      const listener = vi.fn();
      const unsub = subscribeToasts(listener);
      listener.mockClear();

      unsub();
      showToast('after unsub', 'info', 0);

      expect(listener).not.toHaveBeenCalled();

      // 後片付け（別のリスナーで削除）
      const current = received[received.length - 1] ?? [];
      clearAllToasts(current);
    });

    it('購読直後に現在のトースト一覧を受け取る', () => {
      const id = showToast('existing', 'info', 0);

      const snapshots: Toast[][] = [];
      const unsub = subscribeToasts((t) => snapshots.push(t));

      expect(snapshots[0].some((t) => t.id === id)).toBe(true);
      unsub();

      dismissToast(id);
    });
  });
});

describe('showApiError', () => {
  let unsubscribe: (() => void) | null = null;
  let received: Toast[][] = [];

  beforeEach(() => {
    received = [];
    vi.useFakeTimers();
    unsubscribe = subscribeToasts((toasts) => {
      received.push(toasts);
    });
    const current = received[received.length - 1] ?? [];
    for (const t of current) {
      dismissToast(t.id);
    }
    received = [];
  });

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = null;
    vi.useRealTimers();
  });

  it('エラーメッセージがトーストに表示される', () => {
    showApiError(new Error('api error'));
    const current = received[received.length - 1];
    expect(current.some((t) => t.message === 'api error' && t.type === 'error')).toBe(true);
    for (const t of current) dismissToast(t.id);
  });

  it('context が指定された場合はプレフィックス付きで表示される', () => {
    showApiError(new Error('failed'), '投稿');
    const current = received[received.length - 1];
    expect(current.some((t) => t.message === '投稿: failed')).toBe(true);
    for (const t of current) dismissToast(t.id);
  });

  it('context が省略された場合はプレフィックスなしで表示される', () => {
    showApiError('unknown error');
    const current = received[received.length - 1];
    expect(current.some((t) => t.message === 'unknown error')).toBe(true);
    for (const t of current) dismissToast(t.id);
  });
});
