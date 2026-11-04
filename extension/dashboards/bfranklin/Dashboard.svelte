<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import {
    PersonList,
    RecordList,
    RouteMap,
    SectionCard,
    TypeBreakdown,
  } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import DecadeStrip from './DecadeStrip.svelte';
  import { decadeCounts, peakYear } from './decades';
  import LifeEvents from '../_family/LifeEvents.svelte';
  import { countOf, typed } from '../_family/pick';

  // A printer's broadsheet: masthead, one tall chart of the whole working life,
  // then a narrow column of correspondents and a wide column of recent pages.
  let { user, data }: DashboardProps = $props();

  const decades = $derived(decadeCounts(data.byYear));
  const peak = $derived(peakYear(data.byYear));
  const stats = $derived([
    { label: m.green_smug_shrike_strive(), value: countOf(data.countsByType, 'letter') },
    { label: m.smug_happy_monkey_coax(), value: countOf(data.countsByType, 'essay', 'note') },
    { label: m.last_empty_moose_enrich(), value: countOf(data.countsByType, 'office') },
    { label: m.lost_warm_stork_jest(), value: countOf(data.countsByType, 'membership') },
  ]);
  const vocations = [
    () => m.formal_misty_goat_link(),
    () => m.any_inclusive_meerkat_greet(),
    () => m.zippy_large_lion_laugh(),
    () => m.calm_crazy_dragonfly_nudge(),
    () => m.lucky_fine_bison_strive(),
    () => m.blue_many_beetle_learn(),
  ];
</script>

<div class="mx-auto w-full max-w-6xl space-y-5 px-3 py-5 sm:px-0">
  <header class="border-y-4 border-double border-stone-700 py-4 text-center">
    <div class="flex items-center justify-center gap-3">
      <AvatarImage {user} class="size-12 shrink-0" />
      <h1 class="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
        {m.stout_civil_cow_race()}
      </h1>
    </div>
    <ul
      class="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 font-serif text-sm text-stone-600"
    >
      {#each vocations as voc, i (i)}
        <li class="after:ml-3 after:text-stone-400 after:content-['·'] last:after:content-none">
          {voc()}
        </li>
      {/each}
    </ul>
  </header>

  <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div class="space-y-5">
      <SectionCard
        title={m.key_gaudy_llama_aid()}
        subtitle={data.range.earliest && data.range.latest
          ? `${data.range.earliest.getUTCFullYear()}–${data.range.latest.getUTCFullYear()}`
          : undefined}
      >
        {#snippet aside()}
          {#if peak}{m.known_each_puma_heal({ year: peak.year, count: peak.count })}{/if}
        {/snippet}
        <DecadeStrip {decades} color={user.color} />
      </SectionCard>

      <SectionCard title={m.livid_tired_wolf_intend()}>
        <RecordList
          records={typed(data, 'essay', 'note', 'letter', 'diary')}
          limit={8}
          empty={m.simple_helpful_mare_nourish()}
        />
      </SectionCard>

      <div class="grid gap-5 md:grid-cols-2">
        <SectionCard title={m.ideal_round_shrike_drop()}>
          <RecordList
            records={typed(data, 'office')}
            limit={6}
            empty={m.simple_helpful_mare_nourish()}
          />
        </SectionCard>
        <SectionCard title={m.formal_front_dachshund_trim()}>
          <RecordList
            records={typed(data, 'membership')}
            limit={6}
            empty={m.simple_helpful_mare_nourish()}
          />
        </SectionCard>
      </div>

      {#if data.geo.length}
        <SectionCard title={m.dry_stout_jurgen_wave()} subtitle={m.stale_north_bumblebee_foster()}>
          <RouteMap routes={data.geo} color={user.color} />
        </SectionCard>
      {/if}
    </div>

    <aside class="space-y-5">
      <div
        class="grid grid-cols-2 divide-x divide-y divide-stone-200 rounded-lg border border-stone-300 bg-stone-50"
      >
        {#each stats as s (s.label)}
          <div class="px-2 py-3 text-center">
            <div class="font-serif text-2xl font-semibold text-stone-900 tabular-nums">
              {s.value}
            </div>
            <div class="text-[0.65rem] tracking-wider text-stone-500 uppercase">{s.label}</div>
          </div>
        {/each}
      </div>

      <SectionCard title={m.tasty_great_octopus_lend()}>
        <PersonList
          people={data.correspondents}
          limit={10}
          color={user.color}
          empty={m.simple_helpful_mare_nourish()}
        />
      </SectionCard>

      <LifeEvents records={typed(data, 'life')} />

      <SectionCard title={m.ideal_watery_bat_fetch()}>
        <TypeBreakdown counts={data.countsByType} empty={m.simple_helpful_mare_nourish()} />
      </SectionCard>
    </aside>
  </div>
</div>
