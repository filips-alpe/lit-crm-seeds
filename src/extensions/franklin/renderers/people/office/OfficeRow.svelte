<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import RowShell from '$lib/renderers/_shared/RowShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { peopleData } from '../people';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(peopleData(fields));
</script>

<RowShell {creator} {createdAt} {status}>
  <span class="w-20 shrink-0 text-xs font-semibold tabular-nums" style="color:{type.color}"
    >{d.years ?? m.large_maroon_toad_hush()}</span
  >
  <span class="truncate text-stone-800"
    >{d.title ?? d.person ?? m.curly_simple_gazelle_fetch()}</span
  >
  {#if d.to}<span class="shrink-0 truncate text-xs text-stone-500">{d.to}</span>{/if}
</RowShell>
