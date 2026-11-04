<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import CardShell from '$lib/renderers/_shared/CardShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import LocationLine from '../LocationLine.svelte';
  import { peopleData } from '../people';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(peopleData(fields));
</script>

<CardShell {creator} {createdAt} {status} meta={false} accent={type.color} bg="#fbfaf7">
  <div class="flex h-full min-w-0 flex-col gap-1 p-3 pl-4">
    <span class="text-[10px] tracking-[0.2em] uppercase" style="color:{type.color}"
      >{m.livid_super_falcon_cook()}</span
    >
    <h3 class="line-clamp-2 font-display text-sm leading-snug text-stone-900">
      {d.title ?? d.person ?? m.curly_simple_gazelle_fetch()}
    </h3>
    {#if d.person && d.title}<p class="truncate text-xs text-stone-600">{d.person}</p>{/if}
    <LocationLine place={d.to} geo={d.geo} class="text-xs text-stone-500" />
    {#if d.description}<p class="line-clamp-2 text-[11px] text-stone-500">{d.description}</p>{/if}
    <span class="mt-auto font-hand text-lg text-stone-800 tabular-nums"
      >{d.when ?? m.large_maroon_toad_hush()}</span
    >
  </div>
</CardShell>
