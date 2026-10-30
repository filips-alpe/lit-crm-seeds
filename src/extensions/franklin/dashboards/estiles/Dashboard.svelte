<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import {
    Epigraph,
    PersonList,
    RecordList,
    SectionCard,
    StatTile,
    YearBars,
  } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import PeriodBars from './PeriodBars.svelte';
  import { countOf, periodBars } from './periods';
  import { typed } from '../_family/pick';

  // The President of Yale: the creed letter on top, then essays and letters by period.
  let { user, data }: DashboardProps = $props();

  const bars = $derived(periodBars(data.projects));
  const essays = $derived(typed(data, 'essay'));
  const letters = $derived(typed(data, 'letter'));
  const span = $derived(
    data.range.earliest && data.range.latest
      ? m.inner_vivid_jellyfish_scoop({
          first: data.range.earliest.getUTCFullYear(),
          last: data.range.latest.getUTCFullYear(),
        })
      : '—',
  );
</script>

<div class="mx-auto w-full max-w-6xl space-y-4 px-3 py-4 sm:px-0">
  <header class="flex items-center gap-4">
    <AvatarImage {user} class="size-14 shrink-0" />
    <div class="min-w-0">
      <h1 class="font-serif text-2xl text-stone-900">{user.name}</h1>
      {#if user.bio}<p class="text-sm text-stone-500">{user.bio}</p>{/if}
    </div>
  </header>

  <SectionCard title={m.spicy_factual_quail_dust()}>
    <Epigraph text={m.new_light_pug_assure()} source={m.dull_livid_ray_pat()} />
  </SectionCard>

  <div class="grid gap-3 sm:grid-cols-3">
    <StatTile
      label={m.green_smug_shrike_strive()}
      value={countOf(data.countsByType, 'letter')}
      color={user.color}
    />
    <StatTile
      label={m.inclusive_spare_rat_fold()}
      value={countOf(data.countsByType, 'essay')}
      color={user.color}
    />
    <StatTile label={m.house_polite_felix_scoop()} value={span} color={user.color} />
  </div>

  <div class="grid gap-4 md:grid-cols-3">
    <SectionCard
      title={m.patient_strong_butterfly_gasp()}
      subtitle={m.fit_fair_chipmunk_cherish()}
      class="md:col-span-2"
    >
      <PeriodBars {bars} empty={m.quaint_calm_warbler_rush()} />
    </SectionCard>
    <SectionCard title={m.known_strong_lynx_wish()}>
      <PersonList
        people={data.correspondents}
        limit={5}
        color={user.color}
        empty={m.quaint_calm_warbler_rush()}
      />
    </SectionCard>
  </div>

  {#if data.byYear.length}
    <SectionCard title={m.caring_round_meerkat_pave()}>
      <YearBars data={data.byYear} color={user.color} />
    </SectionCard>
  {/if}

  <div class="grid gap-4 md:grid-cols-2">
    <SectionCard title={m.awful_each_jurgen_bask()}>
      <RecordList records={essays} variant="card" limit={4} empty={m.quaint_calm_warbler_rush()} />
    </SectionCard>
    <SectionCard title={m.green_smug_shrike_strive()}>
      <RecordList records={letters} variant="card" limit={4} empty={m.quaint_calm_warbler_rush()} />
    </SectionCard>
  </div>
</div>
