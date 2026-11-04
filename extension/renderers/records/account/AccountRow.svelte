<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import RowShell from '$lib/renderers/_shared/RowShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { accountData } from './account';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(accountData(fields));
</script>

<RowShell {creator} {createdAt} {status}>
  <span class="size-2.5 shrink-0 rounded-sm" style="background:{type.color}" aria-hidden="true"
  ></span>
  <span class="truncate text-stone-700">{d.title ?? m.curly_simple_gazelle_fetch()}</span>
  {#if d.from || d.to}
    <span class="shrink-0 truncate text-xs text-stone-500">
      {d.from ?? ''}{d.from && d.to ? ' → ' : ''}{d.to ?? ''}
    </span>
  {/if}
  <span class="mx-1 min-w-3 flex-1 border-b border-dotted border-stone-300"></span>
  {#if d.when}
    <span class="shrink-0 text-xs text-stone-500 tabular-nums">{d.when}</span>
  {/if}
</RowShell>
