/**
 * マージタイムライン用ノートストア
 *
 * 複数ソースからのノートを重複排除しつつ時系列順に管理する。
 */
import type { entities } from 'misskey-js';
import type { MergedNoteWrapper } from '$lib/types';
import { getDeduplicationKey, shouldReplace } from '$lib/utils/mergeDedup';

export class MergeNoteStore {
  notes = $state<MergedNoteWrapper[]>([]);
  private dedupMap = new Map<string, string>(); // dedupKey → note.id
  private bufferSize: number;

  constructor(bufferSize: number = 250) {
    this.bufferSize = bufferSize;
  }

  /**
   * ストリーミングで受信した単一ノートを追加する。
   * 重複チェックを行い、createdAt降順でソート挿入する。
   */
  addNote(
    note: entities.Note,
    sourceLabel: string,
    sourceAccountId: number,
    sourceColor: string,
    accountHostUrl: string,
  ): boolean {
    const dedupKey = getDeduplicationKey(note, accountHostUrl);
    const existingNoteId = this.dedupMap.get(dedupKey);

    if (existingNoteId) {
      // 既存ノートがある場合、オリジンコピーで置換すべきか判定
      const existingIdx = this.notes.findIndex(w => w.note.id === existingNoteId);
      if (existingIdx !== -1 && shouldReplace(this.notes[existingIdx].note, note)) {
        this.dedupMap.set(dedupKey, note.id);
        this.notes[existingIdx] = { note, sourceLabel, sourceAccountId, sourceColor, dedupKey };
      }
      return false; // 重複
    }

    const wrapper: MergedNoteWrapper = { note, sourceLabel, sourceAccountId, sourceColor, dedupKey };
    this.dedupMap.set(dedupKey, note.id);

    // createdAt降順で挿入位置を探す
    const noteTime = new Date(note.createdAt).getTime();
    let insertIdx = this.notes.findIndex(w => new Date(w.note.createdAt).getTime() < noteTime);
    if (insertIdx === -1) insertIdx = this.notes.length;

    this.notes.splice(insertIdx, 0, wrapper);

    // バッファサイズ制限
    if (this.notes.length > this.bufferSize) {
      const removed = this.notes.splice(this.bufferSize);
      for (const r of removed) {
        this.dedupMap.delete(r.dedupKey);
      }
    }

    return true; // 新規追加
  }

  /**
   * 初期ロード用: 複数ノートを一括追加後にソートする。
   */
  addNotesBulk(
    items: Array<{
      note: entities.Note;
      sourceLabel: string;
      sourceAccountId: number;
      sourceColor: string;
      accountHostUrl: string;
    }>,
  ) {
    for (const item of items) {
      const dedupKey = getDeduplicationKey(item.note, item.accountHostUrl);
      const existingNoteId = this.dedupMap.get(dedupKey);

      if (existingNoteId) {
        const existingIdx = this.notes.findIndex(w => w.note.id === existingNoteId);
        if (existingIdx !== -1 && shouldReplace(this.notes[existingIdx].note, item.note)) {
          this.dedupMap.set(dedupKey, item.note.id);
          this.notes[existingIdx] = {
            note: item.note,
            sourceLabel: item.sourceLabel,
            sourceAccountId: item.sourceAccountId,
            sourceColor: item.sourceColor,
            dedupKey,
          };
        }
        continue;
      }

      this.dedupMap.set(dedupKey, item.note.id);
      this.notes.push({
        note: item.note,
        sourceLabel: item.sourceLabel,
        sourceAccountId: item.sourceAccountId,
        sourceColor: item.sourceColor,
        dedupKey,
      });
    }

    // createdAt降順ソート
    this.notes.sort((a, b) =>
      new Date(b.note.createdAt).getTime() - new Date(a.note.createdAt).getTime()
    );

    // バッファサイズ制限
    if (this.notes.length > this.bufferSize) {
      const removed = this.notes.splice(this.bufferSize);
      for (const r of removed) {
        this.dedupMap.delete(r.dedupKey);
      }
    }
  }

  removeNote(noteId: string) {
    const idx = this.notes.findIndex(w => w.note.id === noteId);
    if (idx !== -1) {
      this.dedupMap.delete(this.notes[idx].dedupKey);
      this.notes.splice(idx, 1);
    }
  }

  applyReaction(
    noteId: string,
    reaction: string,
    emoji: { name: string; url: string } | undefined,
    userId: string,
    accountUserIds: string[],
  ) {
    this.notes = this.notes.map(w => {
      const n = w.note;
      const target = n.id === noteId ? n : (n.renote && n.renote.id === noteId ? n : null);
      if (!target) return w;

      const actualNote = n.id === noteId ? n : n.renote!;
      const updatedReactions = { ...(actualNote.reactions ?? {}) };
      updatedReactions[reaction] = (updatedReactions[reaction] ?? 0) + 1;

      const reactionEmojis = { ...((actualNote as any).reactionEmojis ?? {}) };
      if (emoji?.url) {
        reactionEmojis[emoji.name] = emoji.url;
      }

      const isSelf = accountUserIds.includes(userId);
      const myReaction = isSelf ? reaction : actualNote.myReaction;

      if (n.id === noteId) {
        return { ...w, note: { ...n, reactions: updatedReactions, reactionEmojis, myReaction } };
      } else {
        return { ...w, note: { ...n, renote: { ...actualNote, reactions: updatedReactions, reactionEmojis, myReaction } } };
      }
    });
  }

  applyUnreaction(
    noteId: string,
    reaction: string,
    userId: string,
    accountUserIds: string[],
  ) {
    this.notes = this.notes.map(w => {
      const n = w.note;
      const target = n.id === noteId ? n : (n.renote && n.renote.id === noteId ? n : null);
      if (!target) return w;

      const actualNote = n.id === noteId ? n : n.renote!;
      const updatedReactions = { ...(actualNote.reactions ?? {}) };
      const newCount = (updatedReactions[reaction] ?? 1) - 1;
      if (newCount <= 0) {
        delete updatedReactions[reaction];
      } else {
        updatedReactions[reaction] = newCount;
      }

      const isSelf = accountUserIds.includes(userId);
      const myReaction = isSelf ? null : actualNote.myReaction;

      if (n.id === noteId) {
        return { ...w, note: { ...n, reactions: updatedReactions, myReaction } };
      } else {
        return { ...w, note: { ...n, renote: { ...actualNote, reactions: updatedReactions, myReaction } } };
      }
    });
  }

  clear() {
    this.notes = [];
    this.dedupMap.clear();
  }
}
