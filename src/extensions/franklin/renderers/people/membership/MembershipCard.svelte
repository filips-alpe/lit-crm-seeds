<script lang="ts">
  import type { RendererProps } from '$lib/render/props';
  import CardShell from '$lib/renderers/_shared/CardShell.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { peopleData } from '../people';

  let { fields, type, creator, createdAt, status }: RendererProps = $props();
  const d = $derived(peopleData(fields));
</script>

<CardShell {creator} {createdAt} {status} meta={false} bg="#fbf9f2">
  <div class="flex h-full min-w-0 items-start gap-3 p-3">
    <svg class="size-10 shrink-0" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle
        cx="20"
        cy="17"
        r="11"
        fill={type.color}
        fill-opacity="0.15"
        stroke={type.color}
        stroke-width="1.5"
      />
      <circle
        cx="20"
        cy="17"
        r="7"
        stroke={type.color}
        stroke-width="0.8"
        stroke-dasharray="1.5 1.5"
      />
      <path
        d="M13 26 11 38l9-4 9 4-2-12"
        stroke={type.color}
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>
    <div class="flex h-full min-w-0 flex-1 flex-col gap-0.5">
      <span class="text-[10px] tracking-[0.2em] uppercase" style="color:{type.color}"
        >{m.dizzy_mealy_goat_smile()}</span
      >
      <h3 class="line-clamp-2 font-display text-sm leading-snug text-stone-900">
        {d.title ?? d.person ?? m.curly_simple_gazelle_fetch()}
      </h3>
      {#if d.person && d.title}
        <p class="truncate text-xs text-stone-600">
          <span class="text-stone-400">{m.misty_known_vulture_exhale()}</span>
          {d.person}
        </p>
      {/if}
      {#if d.to}
        <p class="truncate text-xs text-stone-600">
          <span class="text-stone-400">{m.antsy_sound_flamingo_hush()}</span>
          {d.to}
        </p>
      {/if}
      <span class="mt-auto text-[10px] text-stone-500 tabular-nums"
        >{d.when ?? m.large_maroon_toad_hush()}</span
      >
    </div>
  </div>
</CardShell>
