/**
 * composerRequest — 「削除して編集」などによるPostModal起動リクエストを伝達するストア
 *
 * NoteMoreMenuが削除完了後にリクエストをセットし、
 * App.svelteがそれを監視してPostModalを開く。
 */

type ComposerRequest = {
  initialText: string;
  /** PostModalで事前選択するアカウントID */
  accountId?: number;
};

let _pending = $state<ComposerRequest | null>(null);

export const composerRequestStore = {
  get pending() {
    return _pending;
  },
  open(initialText: string, accountId?: number) {
    _pending = { initialText, accountId };
  },
  clear() {
    _pending = null;
  },
};
