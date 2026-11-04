<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import CardShell from '$lib/renderers/_shared/CardShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import SpanLabel from './SpanLabel.svelte';
  import { accountData } from './account';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(accountData(fields));
</script>

<CardShell {creator} {createdAt} {status} meta={false} accent={type.color} bg="#fffdf7">
  <div class="flex h-full min-w-0 flex-col gap-1 p-3 pl-4">
    <div class="flex items-baseline justify-between gap-2">
      <span class="text-[10px] font-semibold tracking-[0.2em] text-amber-800/70 uppercase"
        >{m.drab_polite_liger_link()}</span
      >
      <span class="text-[10px] text-stone-500 tabular-nums"
        >{d.when ?? m.large_maroon_toad_hush()}</span
      >
    </div>
    <span class="line-clamp-2 text-sm leading-snug font-semibold text-stone-800"
      >{d.title ?? m.curly_simple_gazelle_fetch()}</span
    >
    {#if d.from}
      <span class="truncate text-xs text-stone-500"
        >{m.nice_game_dingo_support()}
        <span class="font-medium text-stone-700">{d.from}</span></span
      >
    {/if}
    {#if d.to}
      <span class="truncate text-xs text-stone-500"
        >{m.safe_deft_orangutan_trust()}
        <span class="font-medium text-stone-700">{d.to}</span></span
      >
    {/if}
    <div class="mt-auto flex items-end gap-2 pt-1">
      <span class="mb-1.5 min-w-4 flex-1 border-b border-dotted border-stone-300"></span>
      {#if d.span}
        <span class="text-[10px] text-stone-400"><SpanLabel span={d.span} /></span>
      {/if}
    </div>
  </div>
</CardShell>
