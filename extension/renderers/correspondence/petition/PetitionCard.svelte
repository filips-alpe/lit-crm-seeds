<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import CardShell from '$lib/renderers/_shared/CardShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { coreData } from '../../shared/fields';
  import { excerpt } from '../letters';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(coreData(fields));
  const lead = $derived(excerpt(d.text, 140) || d.description);
</script>

<CardShell {creator} {createdAt} {status} meta={false} bg="#f3e9d2" class="border-stone-300/80">
  <div class="relative flex h-full flex-col p-3">
    <!-- Masthead: the formal address, ruled off from the body. -->
    <div
      class="flex flex-col items-center gap-0.5 border-b-2 border-double pb-1.5 text-center"
      style="border-color:{type.color}80"
    >
      {#if d.to}
        <span class="text-[9px] tracking-[0.25em] uppercase" style="color:{type.color}"
          >{m.fancy_vivid_insect_burn()}</span
        >
      {:else}
        <span class="text-[9px] tracking-[0.25em] uppercase" style="color:{type.color}"
          >{m.fuzzy_bright_pigeon_glow()}</span
        >
      {/if}
      <span class="line-clamp-2 font-display text-sm leading-tight text-stone-900"
        >{d.to ?? d.title ?? m.curly_simple_gazelle_fetch()}</span
      >
    </div>

    {#if d.title && d.to}
      <h3 class="mt-1.5 line-clamp-2 text-center text-xs font-medium text-stone-800 italic">
        {d.title}
      </h3>
    {/if}
    {#if lead}
      <p class="mt-1 line-clamp-3 text-center text-[11px] leading-snug text-stone-600">{lead}</p>
    {/if}

    <div class="mt-auto flex flex-col pt-1.5">
      {#if d.from}
        <span class="text-[9px] tracking-widest text-stone-400 uppercase"
          >{m.inclusive_vivid_finch_ask()}</span
        >
        <span class="truncate font-hand text-base leading-tight text-stone-800">{d.from}</span>
      {/if}
      <span class="text-[9px] text-stone-400 tabular-nums"
        >{d.when ?? m.large_maroon_toad_hush()}</span
      >
    </div>
  </div>
</CardShell>
