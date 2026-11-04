<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import { PersonList, RecordList, SectionCard, StatTile, YearBars } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import SourceLedger from './SourceLedger.svelte';
  import { countOf, sourceEntries, totalOf } from './sources';
  import { typed } from '../_family/pick';

  // The abolitionist's docket: petitions and letters of the cause, with their sources.
  let { user, data }: DashboardProps = $props();

  const petitions = $derived(typed(data, 'petition'));
  const letters = $derived(typed(data, 'letter'));
  const entries = $derived(sourceEntries(data.records));
</script>

<div class="mx-auto w-full max-w-4xl space-y-5 px-3 py-5 sm:px-0">
  <header class="flex items-center gap-4 border-b-4 pb-4" style="border-color: {user.color}">
    <AvatarImage {user} class="size-14 shrink-0" />
    <div class="min-w-0">
      <p class="text-xs tracking-widest uppercase" style="color: {user.color}">
        {m.plain_civil_seal_hurl()}
      </p>
      <h1 class="font-serif text-2xl text-stone-900">{user.name}</h1>
      <p class="mt-0.5 text-sm text-stone-500">{m.bald_zesty_panda_reside()}</p>
    </div>
  </header>

  <div class="grid grid-cols-3 gap-3">
    <StatTile
      label={m.green_smug_shrike_strive()}
      value={countOf(data.countsByType, 'letter')}
      color={user.color}
    />
    <StatTile
      label={m.tasty_zippy_hawk_commend()}
      value={countOf(data.countsByType, 'petition')}
      color={user.color}
    />
    <StatTile
      label={m.vexed_late_cod_pinch()}
      value={totalOf(data.countsByType)}
      color={user.color}
    />
  </div>

  {#if data.byYear.length}
    <SectionCard title={m.zippy_many_mare_bend()}>
      <YearBars data={data.byYear} color={user.color} />
    </SectionCard>
  {/if}

  <div class="grid gap-4 md:grid-cols-2">
    <SectionCard title={m.weary_extra_guppy_bask()}>
      <RecordList
        records={petitions}
        variant="card"
        limit={5}
        empty={m.quaint_calm_warbler_rush()}
      />
    </SectionCard>
    <SectionCard title={m.flaky_proud_yak_mend()}>
      <RecordList records={letters} variant="card" limit={5} empty={m.quaint_calm_warbler_rush()} />
    </SectionCard>
  </div>

  <div class="grid gap-4 md:grid-cols-5">
    <SectionCard
      title={m.giant_dizzy_penguin_slide()}
      subtitle={m.proof_bland_oryx_persist()}
      class="md:col-span-3"
    >
      <SourceLedger {entries} color={user.color} empty={m.quaint_calm_warbler_rush()} />
    </SectionCard>
    <SectionCard title={m.known_strong_lynx_wish()} class="md:col-span-2">
      <PersonList
        people={data.correspondents}
        limit={5}
        color={user.color}
        empty={m.quaint_calm_warbler_rush()}
      />
    </SectionCard>
  </div>
</div>
