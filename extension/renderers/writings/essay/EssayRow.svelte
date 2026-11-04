<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import RowShell from '$lib/renderers/_shared/RowShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { coreData } from '../../shared/fields';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(coreData(fields));
  const author = $derived(d.fromPerson ?? d.from);
</script>

<RowShell {creator} {createdAt} {status}>
  <span class="h-4 w-0.5 shrink-0" style="background:{type.color}" aria-hidden="true"></span>
  <span class="truncate font-display text-stone-900"
    >{d.title ?? m.curly_simple_gazelle_fetch()}</span
  >
  {#if author}<span class="shrink-0 truncate text-xs text-stone-500 italic">— {author}</span>{/if}
  {#if d.when}<span class="ml-auto shrink-0 text-xs text-stone-500 tabular-nums">{d.when}</span
    >{/if}
</RowShell>
