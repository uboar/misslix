import { Stream, api } from 'misskey-js';
import type { ChannelConnection } from 'misskey-js';
import type { Account, AccountRuntime } from '$lib/types';

const { APIClient } = api;

export function createApiClient(hostUrl: string, token: string): InstanceType<typeof APIClient> {
  const origin = hostUrl.startsWith('http') ? hostUrl : `https://${hostUrl}`;
  return new APIClient({
    origin,
    credential: token,
  });
}

export function createStream(hostUrl: string, token: string): Stream {
  const origin = hostUrl.startsWith('http') ? hostUrl : `https://${hostUrl}`;
  return new Stream(origin, { token });
}

/**
 * アカウントに対してStream/APIClient/mainチャンネル接続・絵文字取得を行い
 * AccountRuntimeを返す。
 */
export async function initAccountRuntime(account: Account): Promise<AccountRuntime> {
  const cli = createApiClient(account.hostUrl, account.token);
  const stream = createStream(account.hostUrl, account.token);

  // mainチャンネル接続 (型アサーションで ChannelConnection に合わせる)
  const mainConnection = stream.useChannel('main') as unknown as ChannelConnection;

  // 絵文字一覧取得
  let emojis: AccountRuntime['emojis'] = [];
  try {
    const res = await cli.request('emojis', {});
    // emojis エンドポイントは EmojiSimple[] を返すが、AccountRuntime は EmojiDetailed[] を期待する。
    // misskey-js のバージョンによって返り値の型が異なるため、ここでは型アサーションを使用する。
    emojis = res.emojis as unknown as AccountRuntime['emojis'];
  } catch {
    // 絵文字取得失敗は無視して続行
    emojis = [];
  }

  const runtime: AccountRuntime = {
    stream,
    cli,
    mainConnection,
    notifications: [],
    hasUnread: false,
    emojis,
    busy: false,
  };

  return runtime;
}
