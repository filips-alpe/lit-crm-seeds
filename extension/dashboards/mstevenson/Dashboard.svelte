<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import { PersonList, RecordList, SectionCard, StatTile, Timeline } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import LifeEvents from '../_family/LifeEvents.svelte';
  import { countOf, timelineItems, typed } from '../_family/pick';
  import TenureStrip from './TenureStrip.svelte';
  import { tenurePlot } from './tenure';

  // The house at Craven Street: the landlady's years as a strip, her letters as
  // ticks on it, and the two people the household revolved around.
  let { user, data }: DashboardProps = $props();

  const TENURE_START = 1757;
  const TENURE_END = 1775;

  const plot = $derived(tenurePlot(data.byYear, TENURE_START, TENURE_END));
  const chronological = $derived(timelineItems(typed(data, 'letter')).slice(-10));
</script>

<div class="mx-auto w-full max-w-5xl space-y-4 px-3 py-5 sm:px-0">
  <header
    class="flex items-center gap-4 rounded-xl px-5 py-4"
    style="background-color: {user.color}14; border: 1px solid {user.color}40"
  >
    <AvatarImage {user} class="size-14 shrink-0" />
    <div class="min-w-0">
      <h1 class="font-serif text-2xl font-semibold" style="color: {user.color}">
        {m.neat_teary_frog_buzz()}
      </h1>
      {#if user.bio}<p class="text-sm text-stone-600">{user.bio}</p>{/if}
    </div>
  </header>

  <SectionCard title={m.minor_teal_warthog_approve()} subtitle={m.jumpy_seemly_tortoise_adore()}>
    <TenureStrip {plot} tenureStart={TENURE_START} tenureEnd={TENURE_END} color={user.color} />
    <div class="mt-4 grid grid-cols-3 gap-3">
      <StatTile
        label={m.slow_north_maggot_roar()}
        value={countOf(data.countsByType, 'letter')}
        color={user.color}
      />
      <StatTile label={m.still_tiny_raven_drip()} value={plot.inside} color={user.color} />
      <StatTile label={m.gray_aloof_grebe_quell()} value={plot.outside} color="#78716c" />
    </div>
  </SectionCard>

  <div class="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <SectionCard title={m.many_grand_goat_fear()} subtitle={m.noisy_less_halibut_fond()}>
      <Timeline items={chronological} empty={m.tiny_top_fish_roar()} />
    </SectionCard>
    <div class="space-y-4">
      <SectionCard title={m.frail_away_husky_bask()}>
        <PersonList
          people={data.correspondents}
          limit={6}
          color={user.color}
          empty={m.tiny_top_fish_roar()}
        />
      </SectionCard>
      <LifeEvents records={typed(data, 'life')} />
      <SectionCard title={m.antsy_mild_gorilla_gleam()}>
        <RecordList records={data.recent} limit={3} empty={m.tiny_top_fish_roar()} />
      </SectionCard>
    </div>
  </div>
</div>
