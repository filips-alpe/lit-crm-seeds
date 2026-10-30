<script lang="ts">
  import { resolve } from '$app/paths';
  import * as m from '$lib/paraglide/messages.js';
  import { formatDate } from '$lib/utils/formatDate';
  import type { DashboardRecord } from '$lib/dashboards/types';
  import { toRoman } from './roman';

  // Philosophical-Transactions style index: numbered, dated, titled.
  let { records, color, empty }: { records: DashboardRecord[]; color: string; empty: string } =
    $props();
</script>

{#if records.length}
  <ol class="divide-y divide-stone-300 border-y-2 border-double border-stone-400">
    {#each records as r, i (r.id)}
      <li class="flex items-baseline gap-4 py-3">
        <span
          class="w-24 shrink-0 font-serif text-sm tracking-wide uppercase"
          style="color: {color}"
        >
          {m.few_chunky_carp_type({ numeral: toRoman(i + 1) })}
        </span>
        <div class="min-w-0 flex-1">
          <a
            href={resolve('/(app)/data/[id]', { id: r.id })}
            class="font-serif text-lg text-stone-900 hover:underline">{r.title}</a
          >
          {#if r.to}<div class="text-xs text-stone-500 italic">{r.to}</div>{/if}
        </div>
        <time class="shrink-0 text-xs text-stone-500 tabular-nums">
          {formatDate(r.date ?? r.start ?? r.createdAt)}
        </time>
      </li>
    {/each}
  </ol>
{:else}
  <p class="py-4 text-center font-serif text-stone-400 italic">{empty}</p>
{/if}
