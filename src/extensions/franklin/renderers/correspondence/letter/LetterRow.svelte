<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import RowShell from '$lib/renderers/_shared/RowShell.svelte';
  import PersonChip from '$lib/renderers/_shared/PersonChip.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { correspondenceData } from '../data';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(correspondenceData(fields));
</script>

<RowShell {creator} {createdAt} {status} class="bg-[#f7f1e3]">
  <svg
    class="size-4 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke={type.color}
    stroke-width="1.6"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="2.5" y="5" width="19" height="14" rx="1.5" />
    <path d="M3.5 6.5 L12 13 L20.5 6.5" />
  </svg>
  {#if d.sender.name}
    <PersonChip name={d.sender.name} color={type.color} compact class="max-w-[30%] min-w-0" />
  {/if}
  {#if d.sender.name && (d.recipient.name || d.recipient.place)}
    <span class="shrink-0 text-stone-400" aria-hidden="true">→</span>
  {/if}
  {#if d.recipient.name}
    <PersonChip name={d.recipient.name} color={type.color} compact class="max-w-[30%] min-w-0" />
  {:else if d.recipient.place}
    <span class="max-w-[30%] truncate font-hand text-base text-stone-700">{d.recipient.place}</span>
  {/if}
  {#if d.subject}
    <span class="truncate text-stone-600">{d.subject}</span>
  {:else if !d.sender.name && !d.recipient.name && !d.recipient.place}
    <span class="truncate text-stone-400">{m.curly_simple_gazelle_fetch()}</span>
  {/if}
  {#if d.ocean}
    <span
      class="ml-auto shrink-0 rounded-full border px-1.5 text-[10px] tracking-wide uppercase"
      style="border-color:{type.color}80; color:{type.color}">{m.mean_trick_ape_jump()}</span
    >
  {/if}
  {#if d.when}
    <span class="shrink-0 text-xs text-stone-500 tabular-nums">{d.when}</span>
  {/if}
</RowShell>
