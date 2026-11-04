<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import RowShell from '$lib/renderers/_shared/RowShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { coreData } from '../../shared/fields';
  import { excerpt } from '../letters';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(coreData(fields));
  const subject = $derived(d.title ?? excerpt(d.text, 90));
</script>

<RowShell {creator} {createdAt} {status} class="bg-[#f3e9d2]">
  <span
    class="shrink-0 font-display text-[10px] tracking-[0.2em] uppercase"
    style="color:{type.color}">{m.fuzzy_bright_pigeon_glow()}</span
  >
  {#if d.from}<span class="max-w-[28%] shrink-0 truncate font-hand text-base">{d.from}</span>{/if}
  {#if d.from && d.to}<span class="shrink-0 text-stone-400" aria-hidden="true">→</span>{/if}
  {#if d.to}<span class="max-w-[28%] shrink-0 truncate text-stone-700 italic">{d.to}</span>{/if}
  {#if subject}<span class="truncate text-stone-600">{subject}</span>{/if}
  {#if d.when}<span class="ml-auto shrink-0 text-xs text-stone-500 tabular-nums">{d.when}</span
    >{/if}
</RowShell>
