<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import { PersonList, RecordList, SectionCard, StatTile, YearBars } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import LifeEvents from '../_family/LifeEvents.svelte';
  import { countOf, typed } from '../_family/pick';
  import { activeYears, longestSilence } from './silence';

  // The household ledger: what reached Market Street, and the long years of waiting between.
  let { user, data }: DashboardProps = $props();

  const silence = $derived(longestSilence(data.byYear));
  const years = $derived(activeYears(data.byYear));
</script>

<div class="mx-auto w-full max-w-5xl space-y-5 px-3 py-5 sm:px-0">
  <header
    class="flex items-center gap-4 rounded-xl border-l-8 bg-stone-50 p-5"
    style="border-color: {user.color}"
  >
    <AvatarImage {user} class="size-16 shrink-0" />
    <div class="min-w-0">
      <h1 class="font-serif text-3xl font-semibold" style="color: {user.color}">
        {m.actual_alive_crocodile_comfort()}
      </h1>
      {#if user.bio}<p class="mt-1 text-sm text-stone-600">{user.bio}</p>{/if}
    </div>
  </header>

  <div class="grid gap-4 sm:grid-cols-3">
    <StatTile
      label={m.green_smug_shrike_strive()}
      value={countOf(data.countsByType, 'letter')}
      color={user.color}
    />
    <StatTile
      label={m.stale_formal_butterfly_grasp()}
      value={countOf(data.countsByType, 'life')}
      color={user.color}
    />
    <StatTile
      label={m.great_large_tuna_relish()}
      value={years.active}
      hint={years.span ? m.funny_tasty_horse_rise({ span: years.span }) : undefined}
      color={user.color}
    />
  </div>

  <SectionCard title={m.caring_round_meerkat_pave()}>
    {#snippet aside()}
      {#if silence}{m.lost_curly_squid_drop({
          from: silence.from,
          to: silence.to,
          years: silence.years,
        })}{/if}
    {/snippet}
    {#if data.byYear.length}
      <YearBars data={data.byYear} color={user.color} height={96} />
    {:else}
      <p class="py-4 text-center text-sm text-stone-400">{m.factual_drab_gopher_dazzle()}</p>
    {/if}
  </SectionCard>

  <div class="grid gap-5 md:grid-cols-2">
    <LifeEvents records={typed(data, 'life')} />
    <div class="space-y-5">
      <SectionCard title={m.tasty_great_octopus_lend()}>
        <PersonList
          people={data.correspondents}
          limit={6}
          color={user.color}
          empty={m.factual_drab_gopher_dazzle()}
        />
      </SectionCard>
    </div>
  </div>

  <SectionCard title={m.tasty_vexed_crocodile_grow()}>
    <RecordList records={typed(data, 'letter')} limit={5} empty={m.factual_drab_gopher_dazzle()} />
  </SectionCard>
</div>
