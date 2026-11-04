<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import {
    Epigraph,
    RecordList,
    SectionCard,
    StatTile,
    TypeBreakdown,
  } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import { isEmpty, totalOf } from './holdings';

  // An illustrative role (the compositor at the Passy press): the role first, then whatever he holds.
  let { user, data }: DashboardProps = $props();

  const empty = $derived(isEmpty(data.countsByType));
</script>

<div class="mx-auto w-full max-w-3xl space-y-5 px-3 py-6 sm:px-0">
  <header
    class="flex items-center gap-4 border-b-2 border-dashed pb-4"
    style="border-color: {user.color}"
  >
    <AvatarImage {user} class="size-16 shrink-0" />
    <div class="min-w-0">
      <span
        class="inline-block rounded-sm border px-1.5 py-0.5 text-[0.65rem] tracking-widest uppercase"
        style="color: {user.color}; border-color: {user.color}">{m.every_away_rook_blend()}</span
      >
      <h1 class="font-serif text-2xl text-stone-900">{user.name}</h1>
      <p class="text-sm text-stone-500">{m.new_inclusive_jannes_catch()}</p>
    </div>
  </header>

  <Epigraph text={m.awful_empty_tadpole_mix()} source={m.many_inclusive_lemur_tap()} />

  {#if empty}
    <section
      class="rounded-lg border-2 border-dashed px-6 py-10 text-center"
      style="border-color: color-mix(in srgb, {user.color} 40%, white)"
    >
      <h2 class="font-serif text-lg text-stone-700">{m.sharp_equal_kudu_roar()}</h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-stone-500">{m.smart_legal_fish_enjoy()}</p>
    </section>
  {:else}
    <StatTile
      label={m.vexed_late_cod_pinch()}
      value={totalOf(data.countsByType)}
      color={user.color}
    />
    <SectionCard title={m.born_agent_puma_stop()}>
      <TypeBreakdown counts={data.countsByType} />
    </SectionCard>
    <SectionCard title={m.grassy_next_dachshund_sew()}>
      <RecordList records={data.recent} limit={8} empty={m.quaint_calm_warbler_rush()} />
    </SectionCard>
  {/if}
</div>
