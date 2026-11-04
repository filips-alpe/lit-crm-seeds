<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import type { Period, PeriodId } from './periods';

  // One stacked bar: how the papers fall before, during and after the Paris years.
  let { periods, color, empty }: { periods: Period[]; color: string; empty: string } = $props();

  const total = $derived(periods.reduce((n, p) => n + p.count, 0));
  const label: Record<PeriodId, () => string> = {
    before: () => m.low_giant_jan_borrow(),
    paris: () => m.glad_lazy_husky_aid(),
    after: () => m.lime_basic_gibbon_snip(),
  };
  const shade: Record<PeriodId, string> = { before: '55', paris: 'ff', after: '99' };
</script>

{#if total > 0}
  <div class="flex h-3 overflow-hidden rounded-full bg-stone-100">
    {#each periods as p (p.id)}
      <div style="width: {(p.count / total) * 100}%; background-color: {color}{shade[p.id]}"></div>
    {/each}
  </div>
  <dl class="mt-3 grid grid-cols-3 gap-2 text-center">
    {#each periods as p (p.id)}
      <div>
        <dd class="font-serif text-2xl text-stone-800 tabular-nums">{p.count}</dd>
        <dt class="text-xs text-stone-500">{label[p.id]()}</dt>
      </div>
    {/each}
  </dl>
{:else}
  <p class="py-3 text-center text-sm text-stone-400">{empty}</p>
{/if}
