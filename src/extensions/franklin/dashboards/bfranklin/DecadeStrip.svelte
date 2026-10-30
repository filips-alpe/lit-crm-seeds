<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import type { DecadeCount } from './decades';

  // Hero chart: one tall column per decade of working life, drawn like type in a form.
  let { decades, color }: { decades: DecadeCount[]; color: string } = $props();

  const max = $derived(Math.max(1, ...decades.map((d) => d.count)));
</script>

{#if decades.length}
  <ol class="flex h-44 items-end gap-1.5" aria-label={m.salty_tame_boar_greet()}>
    {#each decades as d (d.decade)}
      <li class="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
        <span class="font-serif text-sm text-stone-700 tabular-nums">{d.count}</span>
        <div
          class="mt-1 rounded-t-sm"
          style="height: {Math.max(
            2,
            (d.count / max) * 100,
          )}%; background-color: {color}; opacity: {d.count ? 1 : 0.25}"
        ></div>
        <span class="mt-1 border-t border-stone-300 pt-1 font-serif text-xs text-stone-500"
          >{d.decade}s</span
        >
      </li>
    {/each}
  </ol>
{:else}
  <p class="py-6 text-center text-sm text-stone-400">{m.simple_helpful_mare_nourish()}</p>
{/if}
