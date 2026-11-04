<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import {
    Epigraph,
    PersonList,
    RecordList,
    RouteMap,
    SectionCard,
    StatTile,
    Timeline,
  } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import PeriodSplit from './PeriodSplit.svelte';
  import { periodSplit } from './periods';
  import { typed } from '../_family/pick';

  let { user, data }: DashboardProps = $props();

  const periods = $derived(periodSplit(data.byYear));
  const total = $derived(data.countsByType.reduce((n, c) => n + c.count, 0));
  const letters = $derived(data.countsByType.find((c) => c.code === 'letter')?.count ?? 0);
  const quoted = $derived(typed(data, 'letter').find((r) => r.description));
  const offices = $derived(
    typed(data, 'office').map((r) => ({
      id: r.id,
      date: r.start ?? r.date,
      title: r.to ?? r.title ?? '',
      subtitle: r.end ? `→ ${r.end.getUTCFullYear()}` : null,
      color: r.type.color,
    })),
  );
  const mail = $derived(typed(data, 'letter'));
</script>

<div class="mx-auto w-full max-w-3xl space-y-8 px-3 py-6 sm:px-0">
  <header class="text-center">
    <AvatarImage {user} class="mx-auto size-16" />
    <h1 class="mt-3 font-serif text-3xl text-stone-800">{m.north_quiet_seal_treasure()}</h1>
    <p class="mt-1 text-sm text-stone-500">{m.new_noisy_beaver_offer()}</p>
    <div class="mx-auto mt-4 h-px w-24" style="background-color: {user.color}"></div>
  </header>

  {#if quoted?.description}
    <section>
      <h2 class="mb-2 text-xs tracking-widest text-stone-500 uppercase">
        {m.honest_patchy_gibbon_pride()}
      </h2>
      <Epigraph text={quoted.description} by={quoted.title ?? undefined} />
    </section>
  {/if}

  <div class="grid grid-cols-2 gap-3">
    <StatTile
      label={m.green_smug_shrike_strive()}
      value={letters}
      hint={m.quick_jolly_meerkat_greet({ count: total })}
      color={user.color}
    />
    <StatTile
      label={m.sea_home_millipede_fall()}
      value={data.range.earliest && data.range.latest
        ? `${data.range.earliest.getUTCFullYear()}–${data.range.latest.getUTCFullYear()}`
        : '—'}
      color={user.color}
    />
  </div>

  <SectionCard title={m.short_proud_mink_scoop()}>
    <PeriodSplit {periods} color={user.color} empty={m.quaint_calm_warbler_rush()} />
  </SectionCard>

  {#if offices.length}
    <SectionCard title={m.last_empty_moose_enrich()}>
      <Timeline items={offices} />
    </SectionCard>
  {/if}

  {#if data.geo.length}
    <SectionCard title={m.weird_awful_walrus_scoop()}>
      <RouteMap routes={data.geo} color={user.color} />
    </SectionCard>
  {/if}

  <SectionCard title={m.tasty_vexed_crocodile_grow()}>
    <RecordList records={mail} limit={8} empty={m.quaint_calm_warbler_rush()} />
  </SectionCard>

  <SectionCard title={m.tasty_great_octopus_lend()}>
    <PersonList
      people={data.correspondents}
      limit={5}
      color={user.color}
      empty={m.quaint_calm_warbler_rush()}
    />
  </SectionCard>
</div>
