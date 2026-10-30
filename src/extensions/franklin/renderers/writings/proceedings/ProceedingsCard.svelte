<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import CardShell from '$lib/renderers/_shared/CardShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { excerpt } from '../../correspondence/letters';
  import { coreData } from '../../shared/fields';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(coreData(fields));
  const lead = $derived(excerpt(d.text, 170) || d.note || d.description);
</script>

<CardShell {creator} {createdAt} {status} meta={false} accent={type.color} bg="#fcfcfa">
  <div class="flex h-full min-w-0 flex-col gap-1 p-3 pl-4">
    <div class="flex items-baseline justify-between gap-2">
      <span class="truncate text-[10px] font-semibold tracking-[0.18em] uppercase"
        >{d.from ?? m.level_dirty_jaguar_mix()}</span
      >
      <span class="shrink-0 text-[10px] text-stone-500 tabular-nums"
        >{d.when ?? m.large_maroon_toad_hush()}</span
      >
    </div>
    <h3 class="line-clamp-2 text-sm leading-snug font-semibold text-stone-900">
      {d.title ?? m.curly_simple_gazelle_fetch()}
    </h3>
    {#if d.to}
      <p class="truncate text-[11px] text-stone-500">
        {m.bland_antsy_sawfish_fry()}
        <span class="text-stone-700">{d.to}</span>
      </p>
    {/if}
    {#if lead}
      <p
        class="mt-0.5 line-clamp-3 border-l border-stone-300 pl-2 text-xs leading-snug text-stone-600"
      >
        {lead}
      </p>
    {/if}
  </div>
</CardShell>
