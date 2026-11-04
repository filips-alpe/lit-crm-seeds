<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import { PersonList, RecordList, SectionCard, StatTile, YearBars } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import LifeEvents from '../_family/LifeEvents.svelte';
  import { countOf, typed } from '../_family/pick';
  import FatherAndSon from './FatherAndSon.svelte';
  import { eras, exchangeWith } from './exchange';

  // A governor's desk split down the middle of 1776: before the war, and after it.
  let { user, data }: DashboardProps = $props();

  const exchange = $derived(exchangeWith(data.correspondents, 'benjamin'));
  const split = $derived(eras(data.byYear, 1776));
</script>

<div class="mx-auto w-full max-w-6xl space-y-5 px-3 py-5 sm:px-0">
  <header class="flex flex-wrap items-center gap-4">
    <AvatarImage {user} class="size-14 shrink-0" />
    <div class="min-w-0 flex-1">
      <h1 class="font-serif text-3xl font-semibold" style="color: {user.color}">
        {m.pretty_stock_nils_burn()}
      </h1>
      {#if user.bio}<p class="text-sm text-stone-600">{user.bio}</p>{/if}
    </div>
  </header>

  <div class="grid gap-5 lg:grid-cols-2">
    <SectionCard title={m.next_stale_thrush_grasp()}>
      <FatherAndSon {exchange} color={user.color} />
    </SectionCard>

    <SectionCard title={m.zesty_full_mammoth_smile()} subtitle={m.hour_noisy_lemming_propel()}>
      <div class="grid grid-cols-2 gap-3">
        <StatTile label={m.bald_vivid_baboon_feast()} value={split.before} color={user.color} />
        <StatTile label={m.aloof_good_clownfish_talk()} value={split.after} color="#78716c" />
      </div>
      {#if data.byYear.length}
        <YearBars data={data.byYear} color={user.color} class="mt-3" />
      {/if}
    </SectionCard>
  </div>

  <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div class="space-y-5">
      <LifeEvents
        records={typed(data, 'life', 'office')}
        title={m.quick_noisy_hawk_inspire()}
        codes={['life', 'office']}
      />
      <SectionCard title={m.green_smug_shrike_strive()}>
        <RecordList
          records={typed(data, 'letter')}
          limit={6}
          empty={m.factual_drab_gopher_dazzle()}
        />
      </SectionCard>
    </div>
    <aside class="space-y-5">
      <StatTile
        label={m.green_smug_shrike_strive()}
        value={countOf(data.countsByType, 'letter')}
        color={user.color}
      />
      <SectionCard title={m.tasty_great_octopus_lend()}>
        <PersonList
          people={data.correspondents}
          limit={8}
          color={user.color}
          empty={m.factual_drab_gopher_dazzle()}
        />
      </SectionCard>
    </aside>
  </div>
</div>
