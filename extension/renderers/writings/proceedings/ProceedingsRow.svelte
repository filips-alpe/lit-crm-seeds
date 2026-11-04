<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import RowShell from '$lib/renderers/_shared/RowShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { coreData } from '../../shared/fields';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(coreData(fields));
</script>

<RowShell {creator} {createdAt} {status}>
  <span class="size-2.5 shrink-0 rounded-sm" style="background:{type.color}" aria-hidden="true"
  ></span>
  {#if d.from}
    <span class="max-w-[30%] shrink-0 truncate text-xs font-semibold tracking-wide uppercase"
      >{d.from}</span
    >
  {/if}
  <span class="truncate text-stone-700">{d.title ?? m.curly_simple_gazelle_fetch()}</span>
  {#if d.to}<span class="shrink-0 truncate text-xs text-stone-500">→ {d.to}</span>{/if}
  {#if d.when}<span class="ml-auto shrink-0 text-xs text-stone-500 tabular-nums">{d.when}</span
    >{/if}
</RowShell>
