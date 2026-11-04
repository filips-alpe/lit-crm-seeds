<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import RowShell from '$lib/renderers/_shared/RowShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { excerpt } from '../../correspondence/letters';
  import { coreData } from '../../shared/fields';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(coreData(fields));
  const lead = $derived(d.title ?? excerpt(d.text, 100));
</script>

<RowShell {creator} {createdAt} {status} class="bg-amber-50">
  <span
    class="shrink-0 rounded-sm px-1.5 text-[10px] tracking-wider text-white uppercase"
    style="background:{type.color}">{m.warm_alive_salmon_chop()}</span
  >
  <span class="truncate text-stone-800">{lead || m.curly_simple_gazelle_fetch()}</span>
  {#if d.from || d.to}
    <span class="shrink-0 truncate text-xs text-stone-500">
      {d.from ?? ''}{d.from && d.to ? ' → ' : ''}{d.to ?? ''}
    </span>
  {/if}
  {#if d.when}<span class="ml-auto shrink-0 text-xs text-stone-500 tabular-nums">{d.when}</span
    >{/if}
</RowShell>
