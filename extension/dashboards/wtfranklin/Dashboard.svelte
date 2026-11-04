<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import {
    PersonList,
    RecordList,
    SectionCard,
    StatTile,
    TypeBreakdown,
    YearBars,
  } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import LifeEvents from '../_family/LifeEvents.svelte';
  import { countOf, typed } from '../_family/pick';
  import { passyWindow } from './passy';

  // The secretary's desk at Passy: a dark rail of who and what, and the Passy years in focus.
  let { user, data }: DashboardProps = $props();

  const passy = $derived(passyWindow(data.byYear));
</script>

<div
  class="mx-auto grid w-full max-w-6xl gap-5 px-3 py-5 sm:px-0 lg:grid-cols-[18rem_minmax(0,1fr)]"
>
  <aside class="space-y-4 rounded-xl p-4 text-white" style="background-color: {user.color}">
    <div class="flex items-center gap-3">
      <AvatarImage {user} class="size-14 shrink-0 bg-white/90" />
      <h1 class="font-serif text-xl leading-tight font-semibold">
        {m.helpful_tame_lobster_spur()}
      </h1>
    </div>
    {#if user.bio}<p class="text-sm text-white/80">{user.bio}</p>{/if}
    <dl class="grid grid-cols-2 gap-3 border-t border-white/20 pt-3">
      <div>
        <dt class="text-xs tracking-wide text-white/60 uppercase">
          {m.green_smug_shrike_strive()}
        </dt>
        <dd class="font-serif text-3xl tabular-nums">{countOf(data.countsByType, 'letter')}</dd>
      </div>
      <div>
        <dt class="text-xs tracking-wide text-white/60 uppercase">
          {m.warm_noble_hedgehog_nurture()}
        </dt>
        <dd class="font-serif text-3xl tabular-nums">{passy.inside}</dd>
      </div>
    </dl>
    <div class="rounded-lg bg-white p-3 text-stone-800">
      <h2 class="mb-2 text-sm font-semibold">{m.tasty_great_octopus_lend()}</h2>
      <PersonList
        people={data.correspondents}
        limit={6}
        color={user.color}
        empty={m.factual_drab_gopher_dazzle()}
      />
    </div>
  </aside>

  <div class="min-w-0 space-y-5">
    <SectionCard title={m.slow_fluffy_antelope_fulfill()} subtitle={m.stock_brave_jurgen_drip()}>
      {#snippet aside()}
        {#if passy.peak}{m.known_each_puma_heal({
            year: passy.peak.year,
            count: passy.peak.count,
          })}{/if}
      {/snippet}
      {#if passy.years.length}
        <YearBars data={passy.years} color={user.color} height={96} />
      {:else}
        <p class="py-4 text-center text-sm text-stone-400">{m.factual_drab_gopher_dazzle()}</p>
      {/if}
    </SectionCard>

    <div class="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <SectionCard title={m.tasty_vexed_crocodile_grow()}>
        <RecordList
          records={typed(data, 'letter')}
          variant="card"
          limit={4}
          empty={m.factual_drab_gopher_dazzle()}
        />
      </SectionCard>
      <div class="space-y-4">
        <StatTile
          label={m.sea_home_millipede_fall()}
          value={data.range.earliest && data.range.latest
            ? `${data.range.earliest.getUTCFullYear()}–${data.range.latest.getUTCFullYear()}`
            : '—'}
          color={user.color}
        />
        <SectionCard title={m.mellow_glad_sparrow_pick()}>
          <TypeBreakdown counts={data.countsByType} empty={m.factual_drab_gopher_dazzle()} />
        </SectionCard>
      </div>
    </div>

    <LifeEvents records={typed(data, 'life')} />
  </div>
</div>
