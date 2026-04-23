<script lang="ts">
  import type { AccountRuntime, NotePoll } from '$lib/types';
  import { canVotePollChoice, getPollTotalVotes, isPollExpired } from '$lib/utils/poll';
  import { BarChart3, Check, Loader2 } from 'lucide-svelte';

  type Props = {
    noteId: string;
    poll: NotePoll;
    runtime?: AccountRuntime;
  };

  let { noteId, poll, runtime }: Props = $props();

  let votingChoice = $state<number | null>(null);
  let error = $state('');

  const totalVotes = $derived(getPollTotalVotes(poll));
  const expired = $derived(isPollExpired(poll));
  const hasVoted = $derived(poll.choices.some((choice) => choice.isVoted));

  async function vote(choice: number) {
    if (!runtime || !canVotePollChoice(poll, choice) || votingChoice !== null) return;

    votingChoice = choice;
    error = '';
    try {
      await runtime.cli.request('notes/polls/vote', {
        noteId,
        choice,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : '投票に失敗しました';
    } finally {
      votingChoice = null;
    }
  }

  function getRate(votes: number): number {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 1000) / 10;
  }

  function formatExpiry(expiresAt: string | null | undefined): string {
    if (!expiresAt) return '期限なし';
    return new Date(expiresAt).toLocaleString('ja-JP');
  }
</script>

<div class="mt-2 rounded-lg border border-base-300/70 bg-base-200/30 p-2">
  <div class="mb-2 flex items-center justify-between gap-2 text-[0.65rem] text-base-content/60">
    <span class="inline-flex items-center gap-1">
      <BarChart3 class="h-3 w-3" aria-hidden="true" />
      <span>{poll.multiple ? '複数選択投票' : '単一選択投票'}</span>
    </span>
    <span>{totalVotes}票</span>
  </div>

  <div class="flex flex-col gap-1.5">
    {#each poll.choices as choice, index (choice.text)}
      {@const percent = getRate(choice.votes)}
      {@const canVote = !!runtime && canVotePollChoice(poll, index)}
      <button
        class="relative overflow-hidden rounded-md border border-base-300/70 bg-base-100 px-2 py-2 text-left transition disabled:cursor-default disabled:opacity-100"
        class:hover:bg-base-200={canVote}
        disabled={!canVote || votingChoice !== null}
        onclick={() => vote(index)}
      >
        <div
          class="pointer-events-none absolute inset-y-0 left-0 bg-primary/12 transition-[width]"
          style="width: {percent}%;"
          aria-hidden="true"
        ></div>
        <div class="relative flex items-center gap-2">
          <span class="min-w-0 flex-1 truncate text-xs text-base-content/90">{choice.text}</span>
          <span class="shrink-0 text-[0.65rem] text-base-content/60">{choice.votes}票</span>
          <span class="shrink-0 text-[0.65rem] text-base-content/60">{percent}%</span>
          {#if votingChoice === index}
            <Loader2 class="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden="true" />
          {:else if choice.isVoted}
            <Check class="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
          {/if}
        </div>
      </button>
    {/each}
  </div>

  <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] text-base-content/50">
    <span>{expired ? '終了' : hasVoted ? '投票済み' : '投票受付中'}</span>
    <span>期限: {formatExpiry(poll.expiresAt)}</span>
  </div>

  {#if error}
    <p class="mt-1 text-[0.65rem] text-error">{error}</p>
  {/if}
</div>
