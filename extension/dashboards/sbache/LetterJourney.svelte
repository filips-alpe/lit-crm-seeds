<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import type { GeoRoute } from '$lib/dashboards/types';

  // The longest located letter: how far it had to travel to reach the household.
  let { route, miles, color }: { route: GeoRoute; miles: number; color: string } = $props();
</script>

<div class="rounded-2xl border border-stone-200 bg-white p-5 text-center">
  <div class="text-xs tracking-widest text-stone-500 uppercase">{m.soft_every_owl_arrive()}</div>
  <div class="mt-1 font-serif text-5xl tabular-nums" style="color: {color}">
    {miles.toLocaleString('en-GB')}
  </div>
  <div class="mt-3 flex items-center gap-2 text-sm text-stone-600">
    <span class="size-2 rounded-full" style="background-color: {color}"></span>
    <span class="flex-1 border-t border-dashed border-stone-300"></span>
    <span class="size-2 rounded-full" style="background-color: {color}"></span>
  </div>
  <p class="mt-2 text-sm text-stone-600">
    {m.least_bland_hare_arise({ from: route.from ?? '', to: route.to ?? '' })}
  </p>
</div>
