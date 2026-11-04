<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import CardShell from '$lib/renderers/_shared/CardShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { excerpt } from '../../correspondence/letters';
  import { coreData } from '../../shared/fields';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(coreData(fields));
  const first = $derived(d.fromPerson ?? d.from);
  const lead = $derived(excerpt(d.text, 130) || d.note || d.description);
</script>

<CardShell {creator} {createdAt} {status} meta={false} bg="#f6f3ea" class="border-stone-400/70">
  <div class="m-1.5 flex min-w-0 flex-1 flex-col gap-1 border border-double border-stone-400 p-2">
    <span class="text-[9px] tracking-[0.3em] uppercase" style="color:{type.color}"
      >{m.icy_pink_hare_assure()}</span
    >
    <h3 class="line-clamp-2 font-display text-sm leading-tight text-stone-900">
      {d.title ?? m.curly_simple_gazelle_fetch()}
    </h3>
    {#if first || d.to}
      <p class="line-clamp-2 text-[11px] text-stone-600">
        <span class="text-stone-400"
          >{first && d.to ? m.moving_due_tuna_care() : m.sea_this_mole_breathe()}</span
        >
        {[first, d.to].filter(Boolean).join(' & ')}
      </p>
    {/if}
    {#if lead}<p class="line-clamp-2 text-[11px] leading-snug text-stone-500 italic">{lead}</p>{/if}
    <div class="mt-auto flex items-end justify-between gap-2">
      <span class="text-[10px] text-stone-500 tabular-nums"
        >{d.when ?? m.large_maroon_toad_hush()}</span
      >
      <svg class="size-7 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" fill={type.color} fill-opacity="0.15" stroke={type.color} />
        <circle
          cx="12"
          cy="12"
          r="6"
          stroke={type.color}
          stroke-width="0.8"
          stroke-dasharray="1.5 1.5"
        />
      </svg>
    </div>
  </div>
</CardShell>
