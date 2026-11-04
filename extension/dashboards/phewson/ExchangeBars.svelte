<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import { exchangeMax, type ExchangeRow } from './exchange';

  // Back-to-back bars per correspondent: what she wrote (left) against what came to her (right).
  let { rows, color }: { rows: ExchangeRow[]; color: string } = $props();

  const max = $derived(exchangeMax(rows));
</script>

{#if rows.length}
  <div>
    <div class="mb-2 flex justify-between text-xs tracking-wide text-stone-500 uppercase">
      <span>{m.gross_sunny_mammoth_wish()}</span>
      <span>{m.long_soft_lynx_fold()}</span>
    </div>
    <ul class="space-y-2">
      {#each rows as r (r.name)}
        <li>
          <div class="mb-0.5 text-center font-serif text-sm text-stone-700">{r.name}</div>
          <div class="flex items-center gap-1">
            <span class="w-6 text-right text-xs text-stone-500 tabular-nums">{r.sent}</span>
            <div class="flex h-2.5 flex-1 justify-end rounded-l-full bg-stone-100">
              <div
                class="rounded-l-full"
                style="width: {(r.sent / max) * 100}%; background-color: {color}"
              ></div>
            </div>
            <div class="flex h-2.5 flex-1 rounded-r-full bg-stone-100">
              <div
                class="rounded-r-full"
                style="width: {(r.received / max) * 100}%; background-color: {color}80"
              ></div>
            </div>
            <span class="w-6 text-xs text-stone-500 tabular-nums">{r.received}</span>
          </div>
        </li>
      {/each}
    </ul>
  </div>
{:else}
  <p class="py-4 text-center font-serif text-stone-500 italic">{m.quaint_calm_warbler_rush()}</p>
{/if}
