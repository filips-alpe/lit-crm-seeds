<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import CardShell from '$lib/renderers/_shared/CardShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { excerpt } from '../../correspondence/letters';
  import { coreData } from '../../shared/fields';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(coreData(fields));
  const lead = $derived(excerpt(d.text, 150) || d.description);
</script>

<!-- A memorandum slip: headed lines, then the body. -->
<CardShell {creator} {createdAt} {status} meta={false} bg="#fef9e1" class="border-amber-200">
  <div class="flex h-full min-w-0 flex-col gap-1 p-3">
    <div class="flex items-baseline justify-between gap-2 border-b border-amber-300/70 pb-1">
      <span class="text-[10px] font-semibold tracking-[0.25em] uppercase" style="color:{type.color}"
        >{m.warm_alive_salmon_chop()}</span
      >
      <span class="text-[10px] text-stone-500 tabular-nums"
        >{d.when ?? m.large_maroon_toad_hush()}</span
      >
    </div>
    {#if d.from}
      <p class="truncate text-[11px] text-stone-600">
        <span class="text-stone-400">{m.nice_game_dingo_support()}</span>
        {d.from}
      </p>
    {/if}
    {#if d.to}
      <p class="truncate text-[11px] text-stone-600">
        <span class="text-stone-400">{m.safe_deft_orangutan_trust()}</span>
        {d.to}
      </p>
    {/if}
    <h3 class="line-clamp-2 text-sm leading-snug font-medium text-stone-900">
      {d.title ?? m.curly_simple_gazelle_fetch()}
    </h3>
    {#if lead}<p class="line-clamp-3 font-hand text-sm leading-snug text-stone-700">{lead}</p>{/if}
  </div>
</CardShell>
