import { describe, it, expect } from 'vitest';
import { CHANNEL_ENDPOINTS, MIAUTH_PERMISSIONS } from './endpoints';

describe('CHANNEL_ENDPOINTS', () => {
  it('contains all expected channel types', () => {
    const expectedKeys = [
      'homeTimeline',
      'localTimeline',
      'hybridTimeline',
      'globalTimeline',
      'channel',
      'antenna',
      'userList',
      'roleTimeline',
    ];
    expect(Object.keys(CHANNEL_ENDPOINTS)).toEqual(expectedKeys);
  });

  it('every entry has streamChannel and restEndpoint', () => {
    for (const [key, info] of Object.entries(CHANNEL_ENDPOINTS)) {
      expect(info.streamChannel, `${key}.streamChannel`).toBeTruthy();
      expect(info.restEndpoint, `${key}.restEndpoint`).toBeTruthy();
    }
  });

  it('entries requiring paramKey have it defined', () => {
    const needsParam = ['channel', 'antenna', 'userList', 'roleTimeline'] as const;
    for (const key of needsParam) {
      expect(CHANNEL_ENDPOINTS[key].paramKey, `${key} should have paramKey`).toBeDefined();
    }
  });

  it('basic timeline entries do not have paramKey', () => {
    const noParam = ['homeTimeline', 'localTimeline', 'hybridTimeline', 'globalTimeline'] as const;
    for (const key of noParam) {
      expect(CHANNEL_ENDPOINTS[key].paramKey, `${key} should not have paramKey`).toBeUndefined();
    }
  });

  it('maps specific endpoints correctly', () => {
    expect(CHANNEL_ENDPOINTS.homeTimeline.restEndpoint).toBe('notes/timeline');
    expect(CHANNEL_ENDPOINTS.localTimeline.restEndpoint).toBe('notes/local-timeline');
    expect(CHANNEL_ENDPOINTS.globalTimeline.restEndpoint).toBe('notes/global-timeline');
    expect(CHANNEL_ENDPOINTS.channel.paramKey).toBe('channelId');
    expect(CHANNEL_ENDPOINTS.antenna.paramKey).toBe('antennaId');
    expect(CHANNEL_ENDPOINTS.userList.paramKey).toBe('listId');
    expect(CHANNEL_ENDPOINTS.roleTimeline.paramKey).toBe('roleId');
  });
});

describe('MIAUTH_PERMISSIONS', () => {
  it('is a non-empty array', () => {
    expect(MIAUTH_PERMISSIONS.length).toBeGreaterThan(0);
  });

  it('contains read:account and write:notes', () => {
    expect(MIAUTH_PERMISSIONS).toContain('read:account');
    expect(MIAUTH_PERMISSIONS).toContain('write:notes');
  });

  it('all entries are strings matching the pattern "read:|write:"', () => {
    for (const perm of MIAUTH_PERMISSIONS) {
      expect(perm).toMatch(/^(read|write):\w+$/);
    }
  });

  it('includes essential permission categories', () => {
    const categories = ['account', 'drive', 'favorites', 'following', 'notes', 'notifications', 'reactions'];
    for (const cat of categories) {
      const hasRead = MIAUTH_PERMISSIONS.some((p) => p === `read:${cat}`);
      const hasWrite = MIAUTH_PERMISSIONS.some((p) => p === `write:${cat}`);
      expect(hasRead || hasWrite, `should have read or write for ${cat}`).toBe(true);
    }
  });
});
