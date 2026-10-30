<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import {
    PersonList,
    RecordList,
    RouteMap,
    SectionCard,
    StatTile,
    Timeline,
  } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import Dispatch from './Dispatch.svelte';
  import { featuredLetter, yearsSpan } from './featured';
  import { typed } from '../_family/pick';

  let { user, data }: DashboardProps = $props();

  const hero = $derived(featuredLetter(typed(data, 'letter')));
  const count = (code: string) => data.countsByType.find((c) => c.code === code)?.count ?? 0;
  const span = $derived(yearsSpan(data.range));
  const memberships = $derived(typed(data, 'membership'));
  const posts = $derived(
    typed(data, 'office').map((r) => ({
      id: r.id,
      date: r.start ?? r.date,
      title: r.to ?? r.title ?? '',
      subtitle: r.end ? `→ ${r.end.getUTCFullYear()}` : null,
      color: r.type.color,
    })),
  );
</script>

<div class="mx-auto w-full max-w-5xl space-y-5 px-3 py-4 sm:px-0">
  <header
    class="flex items-center gap-4 rounded-xl px-6 py-5 text-white"
    style="background: linear-gradient(120deg, {user.color}, #1e293b)"
  >
    <AvatarImage {user} class="size-16 shrink-0 ring-2 ring-white/60" />
    <div class="min-w-0">
      <h1 class="font-serif text-2xl italic sm:text-3xl">{m.last_north_grizzly_surge()}</h1>
      {#if user.bio}<p class="mt-1 text-sm text-white/80">{user.bio}</p>{/if}
    </div>
  </header>

  {#if hero}
    <Dispatch record={hero} color={user.color} />
  {/if}

  <div class="grid grid-cols-3 gap-3">
    <StatTile label={m.green_smug_shrike_strive()} value={count('letter')} color={user.color} />
    <StatTile label={m.lost_warm_stork_jest()} value={count('membership')} color={user.color} />
    <StatTile label={m.sea_home_millipede_fall()} value={span ?? '—'} color={user.color} />
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <SectionCard title={m.last_empty_moose_enrich()}>
      <Timeline items={posts} empty={m.quaint_calm_warbler_rush()} />
    </SectionCard>
    <SectionCard title={m.lost_warm_stork_jest()}>
      <RecordList records={memberships} limit={6} empty={m.quaint_calm_warbler_rush()} />
    </SectionCard>
  </div>

  {#if data.geo.length}
    <SectionCard title={m.weird_awful_walrus_scoop()}>
      <RouteMap routes={data.geo} color={user.color} />
    </SectionCard>
  {/if}

  <div class="grid gap-4 md:grid-cols-2">
    <SectionCard title={m.tasty_great_octopus_lend()}>
      <PersonList
        people={data.correspondents}
        limit={6}
        color={user.color}
        empty={m.quaint_calm_warbler_rush()}
      />
    </SectionCard>
    <SectionCard title={m.tasty_vexed_crocodile_grow()}>
      <RecordList records={typed(data, 'letter')} limit={6} empty={m.quaint_calm_warbler_rush()} />
    </SectionCard>
  </div>
</div>
