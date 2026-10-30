<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import type { Exchange } from './exchange';

  // One bar split between the letters the son wrote and those he received from his father.
  let { exchange, color }: { exchange: Exchange | null; color: string } = $props();
</script>

{#if exchange && exchange.total > 0}
  <figure>
    <div class="flex h-8 overflow-hidden rounded-md bg-stone-100">
      <div
        class="flex items-center justify-start px-2 text-xs font-medium text-white tabular-nums"
        style="width: {exchange.sentPct}%; background-color: {color}"
      >
        {#if exchange.sent}{exchange.sent}{/if}
      </div>
      <div
        class="flex flex-1 items-center justify-end px-2 text-xs font-medium text-stone-700 tabular-nums"
      >
        {#if exchange.received}{exchange.received}{/if}
      </div>
    </div>
    <figcaption class="mt-1 flex justify-between text-xs text-stone-500">
      <span>{m.noisy_giant_florian_sail({ name: exchange.name })}</span>
      <span>{m.yummy_flat_owl_achieve({ name: exchange.name })}</span>
    </figcaption>
  </figure>
{:else}
  <p class="py-4 text-center text-sm text-stone-400">{m.factual_drab_gopher_dazzle()}</p>
{/if}
