<script lang="ts">
  import PersonChip from '$lib/renderers/_shared/PersonChip.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import type { Exchange } from './papers';

  // Per correspondent: how much of the exchange was written by the user vs received.
  let { exchanges, color, empty }: { exchanges: Exchange[]; color: string; empty?: string } =
    $props();
</script>

{#if exchanges.length}
  <ul class="divide-y divide-stone-100">
    {#each exchanges as e (e.name)}
      <li class="grid grid-cols-[minmax(0,12rem)_1fr] items-center gap-3 py-2">
        <PersonChip name={e.name} {color} compact />
        <div>
          <div class="flex h-2.5 overflow-hidden rounded-full bg-stone-200">
            <div
              class="h-full"
              style="width: {e.sentShare * 100}%; background-color: {color}"
            ></div>
          </div>
          <div class="mt-1 flex justify-between text-xs text-stone-500 tabular-nums">
            <span>{m.flat_still_cod_nourish()} {e.sent}</span>
            <span>{m.watery_wide_elephant_tickle()} {e.received}</span>
          </div>
        </div>
      </li>
    {/each}
  </ul>
{:else if empty}
  <p class="py-3 text-center text-sm text-stone-400">{empty}</p>
{/if}
