<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import type { TenurePlot } from './tenure';

  // One bar per year; the years under her roof carry the colour, the others sit in grey.
  let {
    plot,
    tenureStart,
    tenureEnd,
    color,
  }: { plot: TenurePlot; tenureStart: number; tenureEnd: number; color: string } = $props();

  const max = $derived(Math.max(1, ...plot.years.map((y) => y.count)));
</script>

<figure>
  <div class="flex h-24 items-end gap-0.5 rounded bg-stone-50 px-1">
    {#each plot.years as y (y.year)}
      <div
        class="min-w-0 flex-1 rounded-t-sm"
        style="height: {Math.max(
          y.count ? 6 : 2,
          (y.count / max) * 100,
        )}%; background-color: {y.inside ? color : '#a8a29e'}; opacity: {y.count ? 1 : 0.3}"
        title="{y.year}: {y.count}"
      ></div>
    {/each}
  </div>
  <figcaption class="mt-1.5 flex justify-between text-xs text-stone-500 tabular-nums">
    <span>{plot.years[0]?.year}</span>
    <span class="font-medium" style="color: {color}">
      {m.helpful_mealy_cod_endure({ from: tenureStart, to: tenureEnd })}
    </span>
    <span>{plot.years.at(-1)?.year}</span>
  </figcaption>
</figure>
