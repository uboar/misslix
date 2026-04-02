import type { ChannelType, ChannelEndpointInfo } from '$lib/types';

/**
 * チャンネル種別ごとのストリーミングチャンネル名とRESTエンドポイントのマッピング
 */
export const CHANNEL_ENDPOINTS: Record<ChannelType, ChannelEndpointInfo> = {
  homeTimeline: {
    streamChannel: 'homeTimeline',
    restEndpoint: 'notes/timeline',
  },
  localTimeline: {
    streamChannel: 'localTimeline',
    restEndpoint: 'notes/local-timeline',
  },
  hybridTimeline: {
    streamChannel: 'hybridTimeline',
    restEndpoint: 'notes/hybrid-timeline',
  },
  globalTimeline: {
    streamChannel: 'globalTimeline',
    restEndpoint: 'notes/global-timeline',
  },
  channel: {
    streamChannel: 'channel',
    restEndpoint: 'channels/timeline',
    paramKey: 'channelId',
  },
  antenna: {
    streamChannel: 'antenna',
    restEndpoint: 'antennas/notes',
    paramKey: 'antennaId',
  },
  userList: {
    streamChannel: 'userList',
    restEndpoint: 'notes/user-list-timeline',
    paramKey: 'listId',
  },
  roleTimeline: {
    streamChannel: 'roleTimeline',
    restEndpoint: 'roles/notes',
    paramKey: 'roleId',
  },
  userTimeline: {
    streamChannel: '',
    restEndpoint: 'users/notes',
    paramKey: 'userId',
  },
  mergeTimeline: {
    streamChannel: '',
    restEndpoint: '',
  },
};

/**
 * MiAuth認証で要求する権限
 */
export const MIAUTH_PERMISSIONS = [
  'read:account',
  'write:account',
  'read:blocks',
  'write:blocks',
  'read:drive',
  'write:drive',
  'read:favorites',
  'write:favorites',
  'read:following',
  'write:following',
  'read:mutes',
  'write:mutes',
  'write:notes',
  'read:notifications',
  'write:notifications',
  'read:reactions',
  'write:reactions',
  'write:votes',
  'read:channels',
  'write:channels',
] as const;
