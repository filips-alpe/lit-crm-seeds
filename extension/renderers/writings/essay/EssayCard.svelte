<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import CardShell from '$lib/renderers/_shared/CardShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { excerpt } from '../../correspondence/letters';
  import { coreData } from '../../shared/fields';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(coreData(fields));
  const author = $derived(d.fromPerson ?? d.from);
  const lead = $derived(excerpt(d.text, 150) || d.note || d.description);
</script>

<CardShell {creator} {createdAt} {status} meta={false} bg="#fffefa">
  <div class="flex h-full min-w-0 flex-col items-center gap-1 p-3 text-center">
    <span class="text-[9px] tracking-[0.3em] uppercase" style="color:{type.color}"
      >{m.mild_tired_cobra_yell()}</span
    >
    <h3 class="line-clamp-3 font-display text-base leading-tight text-stone-900">
      {d.title ?? m.curly_simple_gazelle_fetch()}
    </h3>
    {#if author}
      <span class="truncate text-xs text-stone-500 italic"
        >{m.only_stale_deer_boost()}: {author}</span
      >
    {/if}
    <span class="h-px w-10 bg-stone-300" aria-hidden="true"></span>
    {#if lead}<p class="line-clamp-3 text-[11px] leading-snug text-stone-600">{lead}</p>{/if}
    <span class="mt-auto text-[10px] text-stone-400 tabular-nums"
      >{d.when ?? m.large_maroon_toad_hush()}</span
    >
  </div>
</CardShell>
