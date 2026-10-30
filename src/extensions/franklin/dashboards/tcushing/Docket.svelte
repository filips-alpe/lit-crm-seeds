<script lang="ts">
  import { resolve } from '$app/paths';
  import { formatDate } from '$lib/utils/formatDate';
  import type { DashboardRecord } from '$lib/dashboards/types';

  // One column of the House docket: a heading with its count, then dated entries.
  let {
    title,
    count,
    records,
    color,
    empty,
  }: { title: string; count: number; records: DashboardRecord[]; color: string; empty: string } =
    $props();
</script>

<section class="rounded-lg border border-stone-200 bg-white">
  <h2
    class="flex items-baseline justify-between border-b-2 px-4 py-2 font-serif text-lg text-stone-800"
    style="border-color: {color}"
  >
    {title}
    <span class="text-sm text-stone-500 tabular-nums">{count}</span>
  </h2>
  {#if records.length}
    <ul class="divide-y divide-stone-100">
      {#each records as r (r.id)}
        <li class="px-4 py-2">
          <time class="block text-xs text-stone-500 tabular-nums">
            {formatDate(r.date ?? r.start ?? r.createdAt)}
          </time>
          <a
            href={resolve('/(app)/data/[id]', { id: r.id })}
            class="text-sm text-stone-900 hover:underline">{r.title ?? r.from ?? r.id}</a
          >
          {#if r.to}<div class="text-xs text-stone-500 italic">{r.to}</div>{/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="px-4 py-4 text-center text-sm text-stone-400">{empty}</p>
  {/if}
</section>
