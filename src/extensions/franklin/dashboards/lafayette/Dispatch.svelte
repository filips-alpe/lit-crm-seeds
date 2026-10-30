<script lang="ts">
  import { resolve } from '$app/paths';
  import * as m from '$lib/paraglide/messages.js';
  import { formatDate } from '$lib/utils/formatDate';
  import type { DashboardRecord } from '$lib/dashboards/types';

  // The page's hero: the newest letter set large, with its summary as the lead.
  let { record, color }: { record: DashboardRecord; color: string } = $props();

  const day = $derived(formatDate(record.date ?? record.start ?? record.createdAt));
</script>

<article class="overflow-hidden rounded-xl border border-stone-200 bg-white">
  <div class="h-1.5" style="background-color: {color}"></div>
  <div class="space-y-4 p-6 sm:p-8">
    <div
      class="flex flex-wrap items-baseline gap-x-3 text-xs tracking-wide text-stone-500 uppercase"
    >
      <span>{m.this_trite_mongoose_intend()}</span>
      <span class="tabular-nums">{day}</span>
      {#if record.from}<span>{m.next_gross_rabbit_support()}: {record.from}</span>{/if}
    </div>
    <h2 class="font-serif text-3xl leading-tight text-stone-900 sm:text-4xl">{record.title}</h2>
    {#if record.description}
      <p class="max-w-prose text-lg leading-relaxed text-stone-700">{record.description}</p>
    {/if}
    <a
      href={resolve('/(app)/data/[id]', { id: record.id })}
      class="inline-block rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      style="background-color: {color}">{m.crisp_wild_falcon_snap()}</a
    >
  </div>
</article>
