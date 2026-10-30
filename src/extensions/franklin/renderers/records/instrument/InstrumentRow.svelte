<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import RowShell from '$lib/renderers/_shared/RowShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { coreData } from '../../shared/fields';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(coreData(fields));
  const parties = $derived([d.fromPerson ?? d.from, d.to].filter(Boolean).join(' · '));
</script>

<RowShell {creator} {createdAt} {status} class="bg-[#f6f3ea]">
  <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" stroke={type.color} stroke-width="1.6" />
    <circle cx="12" cy="12" r="4.5" stroke={type.color} stroke-width="1" stroke-dasharray="2 1.5" />
  </svg>
  <span class="truncate font-display text-stone-900"
    >{d.title ?? m.curly_simple_gazelle_fetch()}</span
  >
  {#if parties}<span class="shrink-0 truncate text-xs text-stone-500">{parties}</span>{/if}
  {#if d.when}<span class="ml-auto shrink-0 text-xs text-stone-500 tabular-nums">{d.when}</span
    >{/if}
</RowShell>
