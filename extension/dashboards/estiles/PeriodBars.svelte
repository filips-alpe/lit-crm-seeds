<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import type { PeriodBar } from './periods';

  // One horizontal bar per period of Franklin's life, sized by how many records fall in it.
  let { bars, empty }: { bars: PeriodBar[]; empty?: string } = $props();
</script>

{#if bars.length}
  <ul class="space-y-2">
    {#each bars as b (b.id)}
      <li
        class="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr_3rem]"
      >
        <span class="truncate text-stone-800">{b.label}</span>
        <span class="h-3 rounded bg-stone-100">
          <span
            class="block h-3 rounded"
            style="width: {b.width * 100}%; background-color: {b.color}"
          ></span>
        </span>
        <span
          class="text-right text-xs text-stone-500 tabular-nums"
          title={m.front_wise_mole_fade({ count: b.count })}>{b.count}</span
        >
      </li>
    {/each}
  </ul>
{:else if empty}
  <p class="py-3 text-center text-sm text-stone-400">{empty}</p>
{/if}
