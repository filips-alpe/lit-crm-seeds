<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import RowShell from '$lib/renderers/_shared/RowShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { peopleData } from '../people';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(peopleData(fields));
</script>

<RowShell {creator} {createdAt} {status}>
  <svg
    class="size-4 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke={type.color}
    stroke-width="1.6"
    aria-hidden="true"
  >
    <circle cx="12" cy="9" r="5.5" />
    <path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5" />
  </svg>
  <span class="truncate text-stone-800"
    >{d.title ?? d.person ?? m.curly_simple_gazelle_fetch()}</span
  >
  {#if d.to}<span class="shrink-0 truncate text-xs text-stone-500">{d.to}</span>{/if}
  {#if d.when}<span class="ml-auto shrink-0 text-xs text-stone-500 tabular-nums">{d.when}</span
    >{/if}
</RowShell>
