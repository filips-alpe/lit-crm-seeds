<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import CardShell from '$lib/renderers/_shared/CardShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import LocationLine from '../LocationLine.svelte';
  import { peopleData } from '../people';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(peopleData(fields));
</script>

<CardShell {creator} {createdAt} {status} meta={false} bg="#f8f7f3">
  <div class="flex h-full min-w-0 flex-col gap-1 p-3">
    <div class="flex items-baseline justify-between gap-2">
      <span class="text-[10px] tracking-[0.2em] uppercase" style="color:{type.color}"
        >{m.witty_every_jackdaw_aid()}</span
      >
      <span class="text-xs font-semibold text-stone-800 tabular-nums"
        >{d.years ?? m.large_maroon_toad_hush()}</span
      >
    </div>
    <h3 class="line-clamp-2 font-display text-sm leading-snug text-stone-900">
      {d.title ?? d.person ?? m.curly_simple_gazelle_fetch()}
    </h3>
    {#if d.person && d.title}
      <p class="truncate text-xs text-stone-600">
        <span class="text-stone-400">{m.topical_broad_warthog_bask()}</span>
        {d.person}
      </p>
    {/if}
    {#if d.to}
      <p class="truncate text-xs text-stone-600">
        <span class="text-stone-400">{m.sound_fine_jannes_adore()}</span>
        {d.to}
      </p>
    {/if}
    <LocationLine place={null} geo={d.geo} class="mt-auto text-xs text-stone-500" />
    {#if d.when && d.years}
      <span class="text-[10px] text-stone-400 tabular-nums">{d.when}</span>
    {/if}
  </div>
</CardShell>
