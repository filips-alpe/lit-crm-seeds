<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import RowShell from '$lib/renderers/_shared/RowShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import LocationLine from '../LocationLine.svelte';
  import { peopleData } from '../people';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(peopleData(fields));
</script>

<RowShell {creator} {createdAt} {status}>
  <span
    class="size-2.5 shrink-0 rounded-full border-2"
    style="border-color:{type.color}"
    aria-hidden="true"
  ></span>
  <span class="truncate text-stone-800"
    >{d.title ?? d.person ?? m.curly_simple_gazelle_fetch()}</span
  >
  <LocationLine place={d.to} geo={d.geo} class="max-w-[35%] shrink-0 text-xs text-stone-500" />
  {#if d.when}<span class="ml-auto shrink-0 text-xs text-stone-500 tabular-nums">{d.when}</span
    >{/if}
</RowShell>
