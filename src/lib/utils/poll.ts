import type { NotePoll, NotePollChoice, PostPoll } from '$lib/types';

export type PollDurationUnit = 'minutes' | 'hours' | 'days';

export function normalizePollChoices(choices: string[]): string[] {
  return choices.map((choice) => choice.trim()).filter(Boolean);
}

export function buildPostPoll(params: {
  enabled: boolean;
  choices: string[];
  multiple: boolean;
  expires: boolean;
  durationValue: number;
  durationUnit: PollDurationUnit;
}): PostPoll | null {
  if (!params.enabled) return null;

  const normalizedChoices = normalizePollChoices(params.choices);
  if (normalizedChoices.length < 2) return null;

  const poll: PostPoll = {
    choices: normalizedChoices,
    multiple: params.multiple,
  };

  if (params.expires) {
    const duration = Math.max(1, Math.floor(params.durationValue));
    const unitMs: Record<PollDurationUnit, number> = {
      minutes: 60_000,
      hours: 3_600_000,
      days: 86_400_000,
    };
    poll.expiredAfter = duration * unitMs[params.durationUnit];
  }

  return poll;
}

export function getPollTotalVotes(poll: NotePoll): number {
  return poll.choices.reduce((sum, choice) => sum + choice.votes, 0);
}

export function isPollExpired(poll: NotePoll, now = Date.now()): boolean {
  if (!poll.expiresAt) return false;
  return new Date(poll.expiresAt).getTime() <= now;
}

export function hasVotedInPoll(poll: NotePoll): boolean {
  return poll.choices.some((choice) => choice.isVoted);
}

export function canVotePollChoice(poll: NotePoll, index: number): boolean {
  if (isPollExpired(poll)) return false;
  const choice = poll.choices[index];
  if (!choice) return false;
  if (choice.isVoted) return false;
  if (!poll.multiple && hasVotedInPoll(poll)) return false;
  return true;
}

export function applyPollVoteToPoll(
  poll: NotePoll,
  choiceIndex: number,
  isSelfVote: boolean,
): NotePoll {
  return {
    ...poll,
    choices: poll.choices.map((choice, index): NotePollChoice => {
      const isTarget = index === choiceIndex;
      const nextVotes = isTarget ? choice.votes + 1 : choice.votes;

      if (!isSelfVote) {
        return {
          ...choice,
          votes: nextVotes,
        };
      }

      return {
        ...choice,
        votes: nextVotes,
        isVoted: isTarget || (poll.multiple ? choice.isVoted : false),
      };
    }),
  };
}
