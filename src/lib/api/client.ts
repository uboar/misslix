import { Stream, api } from 'misskey-js';

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
