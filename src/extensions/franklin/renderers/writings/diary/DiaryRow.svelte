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

<RowShell {creator} {createdAt} {status} class="bg-[#fbf8ee]">
  <svg
    class="size-4 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke={type.color}
    stroke-width="1.6"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M5 3.5h12.5a1.5 1.5 0 0 1 1.5 1.5v15.5H6.5A1.5 1.5 0 0 1 5 19z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
  <span class="shrink-0 font-hand text-base text-stone-800 tabular-nums"
    >{d.when ?? m.large_maroon_toad_hush()}</span
  >
  {#if lead}<span class="truncate text-stone-600">{lead}</span>{/if}
</RowShell>
