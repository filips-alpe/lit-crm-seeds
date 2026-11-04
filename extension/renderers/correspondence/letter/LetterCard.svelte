<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import CardShell from '$lib/renderers/_shared/CardShell.svelte';
  import PersonChip from '$lib/renderers/_shared/PersonChip.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import RouteSparkline from '../RouteSparkline.svelte';
  import { correspondenceData } from '../data';
  import { excerpt, salutation } from '../letters';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(correspondenceData(fields));
  const greeting = $derived(salutation(d.text));
  const lead = $derived(excerpt(d.text, 160) || d.note || d.description);
</script>

<CardShell {creator} {createdAt} {status} meta={false} accent={type.color} bg="#f7f1e3">
  <div class="flex h-full min-w-0 flex-col gap-1 p-3 pl-4">
    <div class="flex items-baseline justify-between gap-2 text-[10px] text-stone-500">
      <span class="tracking-[0.2em] uppercase" style="color:{type.color}"
        >{m.best_fair_tiger_harbor()}</span
      >
      <span class="tabular-nums">{d.when ?? m.large_maroon_toad_hush()}</span>
    </div>
    <h3 class="line-clamp-2 font-display text-sm leading-snug text-stone-900">
      {d.title ?? m.curly_simple_gazelle_fetch()}
    </h3>
    {#if d.sender.name || d.sender.place || d.recipient.name || d.recipient.place}
      <div class="flex min-w-0 items-center gap-1.5 text-xs">
        {#if d.sender.name}
          <PersonChip name={d.sender.name} color={type.color} compact class="max-w-[45%]" />
        {:else if d.sender.place}
          <span class="truncate font-hand text-stone-700">{d.sender.place}</span>
        {/if}
        <span class="shrink-0 text-stone-400" aria-hidden="true">→</span>
        {#if d.recipient.name}
          <PersonChip name={d.recipient.name} color={type.color} compact class="max-w-[45%]" />
        {:else if d.recipient.place}
          <span class="truncate font-hand text-stone-700">{d.recipient.place}</span>
        {/if}
      </div>
    {/if}
    {#if greeting}<p class="font-hand text-sm text-stone-700">{greeting}</p>{/if}
    {#if lead}<p class="line-clamp-3 text-xs leading-snug text-stone-600">{lead}</p>{/if}
    {#if d.fromPoint && d.toPoint}
      <RouteSparkline from={d.fromPoint} to={d.toPoint} color={type.color} class="mt-auto pt-1" />
    {/if}
  </div>
</CardShell>
