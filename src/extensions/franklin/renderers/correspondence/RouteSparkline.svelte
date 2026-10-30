<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import type { Point } from '$lib/maps/projection';
  import { crossesAtlantic, distanceMiles } from './letters';

  // An abstract route: sender dot on the left, recipient on the right, a dashed
  // arc between, the great-circle distance above it. Not a map — just the
  // journey's length and whether it crossed the ocean.
  let {
    from,
    to,
    color,
    class: className,
  }: { from: Point | null; to: Point | null; color: string; class?: string } = $props();

  const miles = $derived(from && to ? Math.round(distanceMiles(from, to)) : null);
  const ocean = $derived(crossesAtlantic(from, to));
</script>

{#if miles !== null}
  <div class={['flex flex-col gap-0.5', className]}>
    <div class="flex items-baseline justify-between gap-2 text-[10px] text-stone-500">
      <span class="tabular-nums"
        >{m.awake_slimy_walrus_blink({ distance: miles.toLocaleString('en-GB') })}</span
      >
      {#if ocean}
        <span class="tracking-widest uppercase" style="color:{color}"
          >{m.mean_trick_ape_jump()}</span
        >
      {/if}
    </div>
    <svg viewBox="0 0 120 14" class="h-3.5 w-full" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M4 11 Q60 -6 116 11"
        fill="none"
        stroke={color}
        stroke-width="1.4"
        stroke-dasharray="3 2.5"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
      <circle cx="4" cy="11" r="2.4" fill={color} />
      <circle cx="116" cy="11" r="2.4" fill="none" stroke={color} stroke-width="1.4" />
    </svg>
  </div>
{/if}
