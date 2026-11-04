<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import CardShell from '$lib/renderers/_shared/CardShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { excerpt } from '../../correspondence/letters';
  import { coreData } from '../../shared/fields';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(coreData(fields));
  const entry = $derived(excerpt(d.text, 220) || d.note || d.description);
</script>

<CardShell {creator} {createdAt} {status} meta={false} bg="#fbf8ee">
  <!-- A journal page: red margin rule, ruled lines under the handwriting. -->
  <div
    class="flex h-full min-w-0 flex-col gap-1 border-l-2 py-3 pr-3 pl-4"
    style="border-color:{type.color}66; background-image:repeating-linear-gradient(transparent 0 19px, rgb(120 113 108 / 0.15) 19px 20px)"
  >
    <span class="text-[10px] tracking-[0.2em] uppercase" style="color:{type.color}"
      >{m.fuzzy_round_cat_fear()}</span
    >
    <h3 class="font-hand text-xl leading-5 text-stone-900 tabular-nums">
      {d.when ?? m.large_maroon_toad_hush()}
    </h3>
    {#if d.title}<p class="line-clamp-1 text-xs font-medium text-stone-700">{d.title}</p>{/if}
    {#if entry}
      <p class="line-clamp-4 font-hand text-sm leading-5 text-stone-700">{entry}</p>
    {:else}
      <p class="text-xs text-stone-400 italic">{m.crazy_super_florian_dazzle()}</p>
    {/if}
  </div>
</CardShell>
