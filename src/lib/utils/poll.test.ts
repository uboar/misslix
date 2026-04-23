import { describe, expect, it } from 'vitest';
import type { NotePoll } from '$lib/types';
import {
  applyPollVoteToPoll,
  buildPostPoll,
  canVotePollChoice,
  getPollTotalVotes,
  hasVotedInPoll,
  isPollExpired,
  normalizePollChoices,
} from './poll';

function makePoll(overrides: Partial<NotePoll> = {}): NotePoll {
  return {
    multiple: false,
    expiresAt: null,
    choices: [
      { text: 'A', votes: 2, isVoted: false },
      { text: 'B', votes: 1, isVoted: false },
    ],
    ...overrides,
  };
}

describe('normalizePollChoices', () => {
  it('空文字と空白を除去する', () => {
    expect(normalizePollChoices([' A ', '', '   ', 'B'])).toEqual(['A', 'B']);
  });
});

describe('buildPostPoll', () => {
  it('無効時は null を返す', () => {
    expect(buildPostPoll({
      enabled: false,
      choices: ['A', 'B'],
      multiple: false,
      expires: false,
      durationValue: 1,
      durationUnit: 'hours',
    })).toBeNull();
  });

  it('有効で2件以上なら payload を返す', () => {
    expect(buildPostPoll({
      enabled: true,
      choices: [' A ', 'B', ''],
      multiple: true,
      expires: true,
      durationValue: 2,
      durationUnit: 'hours',
    })).toEqual({
      choices: ['A', 'B'],
      multiple: true,
      expiredAfter: 7_200_000,
    });
  });

  it('選択肢が1件以下なら null を返す', () => {
    expect(buildPostPoll({
      enabled: true,
      choices: ['A', '  '],
      multiple: false,
      expires: false,
      durationValue: 1,
      durationUnit: 'days',
    })).toBeNull();
  });
});

describe('poll helpers', () => {
  it('合計票数を返す', () => {
    expect(getPollTotalVotes(makePoll())).toBe(3);
  });

  it('期限切れ判定を返す', () => {
    expect(isPollExpired(makePoll({ expiresAt: '2000-01-01T00:00:00.000Z' }), Date.now())).toBe(true);
  });

  it('投票済み判定を返す', () => {
    expect(hasVotedInPoll(makePoll({ choices: [{ text: 'A', votes: 1, isVoted: true }] }))).toBe(true);
  });

  it('単一選択で未投票の選択肢は投票可能', () => {
    expect(canVotePollChoice(makePoll(), 0)).toBe(true);
  });

  it('単一選択で別の選択肢に投票済みなら投票不可', () => {
    const poll = makePoll({
      choices: [
        { text: 'A', votes: 2, isVoted: true },
        { text: 'B', votes: 1, isVoted: false },
      ],
    });
    expect(canVotePollChoice(poll, 1)).toBe(false);
  });

  it('自分の投票を反映する', () => {
    const updated = applyPollVoteToPoll(makePoll(), 1, true);
    expect(updated.choices[0]).toMatchObject({ votes: 2, isVoted: false });
    expect(updated.choices[1]).toMatchObject({ votes: 2, isVoted: true });
  });

  it('他人の投票は件数だけ反映する', () => {
    const updated = applyPollVoteToPoll(makePoll(), 0, false);
    expect(updated.choices[0]).toMatchObject({ votes: 3, isVoted: false });
  });
});
