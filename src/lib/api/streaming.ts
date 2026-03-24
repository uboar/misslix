/**
 * WebSocketストリーミング管理
 *
 * misskey-js の Stream を利用して全8種のタイムラインチャンネルに接続し、
 * ノートのリアルタイム受信・リアクション更新・削除を管理する。
 */

import type { entities } from 'misskey-js';
import type { AccountRuntime, ColumnConfig } from '$lib/types';
import { CHANNEL_ENDPOINTS } from '$lib/api/endpoints';

export type NoteUpdatedData = {
  id: string;
  type: 'reacted' | 'unreacted' | 'deleted' | 'pollVoted';
  body: unknown;
};

export type TimelineConnection = {
  /** チャンネル接続を切断し、イベントリスナーを解除する */
  disconnect: () => void;
  /** ノートのリアクション更新を購読する */
  subNote: (noteId: string) => void;
  /** ノートのリアクション更新の購読を解除する */
  unsubNote: (noteId: string) => void;
  /** WebSocketを手動で再接続する */
  reconnect: () => void;
};

type TimelineCallbacks = {
  onNote: (note: entities.Note) => void;
  onNoteUpdated?: (data: NoteUpdatedData) => void;
  /** WebSocket接続状態が変化したときに呼ばれる */
  onStateChange?: (connected: boolean) => void;
};

/**
 * タイムラインチャンネルに接続し、ノートイベントを受信する
 *
 * @param runtime - アカウントランタイム（Stream・APIClientを含む）
 * @param config - カラム設定（チャンネル種別・チャンネルIDなどを含む）
 * @param callbacks - イベントコールバック
 * @returns タイムライン接続オブジェクト
 */
export function connectTimeline(
  runtime: AccountRuntime,
  config: ColumnConfig,
  callbacks: TimelineCallbacks,
): TimelineConnection {
  const endpointInfo = CHANNEL_ENDPOINTS[config.channel];
  const channelName = endpointInfo.streamChannel;

  // チャンネル接続パラメータを構築
  // paramKey が定義されており、channelId が存在する場合はパラメータを付与する
  let params: Record<string, string> | undefined;
  if (endpointInfo.paramKey && config.channelId) {
    params = { [endpointInfo.paramKey]: config.channelId };
  }

  // misskey-js の Stream.useChannel は型パラメータが厳格なため、
  // 動的なチャンネル名を扱うために型アサーションを使用する
  const connection = (runtime.stream as any).useChannel(channelName, params);

  // ノートイベントのハンドラ
  connection.on('note', (note: entities.Note) => {
    callbacks.onNote(note);
  });

  // noteUpdated イベントハンドラ (stream 自体のイベント)
  const noteUpdatedHandler = (data: NoteUpdatedData) => {
    callbacks.onNoteUpdated?.(data);
  };

  if (callbacks.onNoteUpdated) {
    (runtime.stream as any).on('noteUpdated', noteUpdatedHandler);
  }

  // WebSocket接続状態の変化を監視
  const connectedHandler = () => {
    callbacks.onStateChange?.(true);
  };
  const disconnectedHandler = () => {
    callbacks.onStateChange?.(false);
  };

  if (callbacks.onStateChange) {
    (runtime.stream as any).on('_connected_', connectedHandler);
    (runtime.stream as any).on('_disconnected_', disconnectedHandler);
    // 初期状態をコールバックで通知
    callbacks.onStateChange(runtime.stream.state === 'connected');
  }

  return {
    disconnect() {
      connection.dispose();
      if (callbacks.onNoteUpdated) {
        (runtime.stream as any).off('noteUpdated', noteUpdatedHandler);
      }
      if (callbacks.onStateChange) {
        (runtime.stream as any).off('_connected_', connectedHandler);
        (runtime.stream as any).off('_disconnected_', disconnectedHandler);
      }
    },

    subNote(noteId: string) {
      (runtime.stream as any).send('subNote', { id: noteId });
    },

    unsubNote(noteId: string) {
      (runtime.stream as any).send('unsubNote', { id: noteId });
    },

    reconnect() {
      // misskey-js の Stream が内部で持つ ReconnectingWebSocket の reconnect() を呼ぶ
      (runtime.stream as any).stream?.reconnect?.();
    },
  };
}
