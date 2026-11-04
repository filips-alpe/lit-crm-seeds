<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import { PersonList, SectionCard, StatTile, YearBars } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import Docket from './Docket.svelte';
  import { agencyTotal, agencyYears, countOf } from './docket';
  import { typed } from '../_family/pick';

  let { user, data }: DashboardProps = $props();

  const years = $derived(agencyYears(data.byYear));
  const inAgency = $derived(agencyTotal(data.byYear));
  const columns = $derived([
    { code: 'letter', title: m.green_smug_shrike_strive() },
    { code: 'proceedings', title: m.level_dirty_jaguar_mix() },
    { code: 'petition', title: m.tasty_zippy_hawk_commend() },
  ]);
</script>

<div class="mx-auto w-full max-w-6xl space-y-4 px-3 py-4 sm:px-0">
  <header
    class="flex items-center gap-4 border-b-4 border-double pb-4"
    style="border-color: {user.color}"
  >
    <AvatarImage {user} class="size-14 shrink-0" />
    <div class="min-w-0">
      <h1 class="font-serif text-2xl text-stone-900">{m.mad_mushy_angelfish_fold()}</h1>
      <p class="text-sm text-stone-500">{m.tidy_fair_haddock_embrace()}</p>
    </div>
    <div class="ml-auto hidden text-right sm:block">
      <div class="font-serif text-3xl tabular-nums" style="color: {user.color}">{inAgency}</div>
      <div class="text-xs text-stone-500">{m.wide_formal_earthworm_exhale()}</div>
    </div>
  </header>

  <div class="grid gap-4 md:grid-cols-3">
    {#each columns as c (c.code)}
      <Docket
        title={c.title}
        count={countOf(data.countsByType, c.code)}
        records={typed(data, c.code).slice(0, 6)}
        color={user.color}
        empty={m.quaint_calm_warbler_rush()}
      />
    {/each}
  </div>

  <div class="grid gap-4 md:grid-cols-3">
    <SectionCard title={m.seemly_solid_mare_skip()} class="md:col-span-2">
      <YearBars data={years} color={user.color} height={96} />
    </SectionCard>
    <div class="space-y-4">
      <StatTile
        label={m.vexed_late_cod_pinch()}
        value={data.countsByType.reduce((n, c) => n + c.count, 0)}
        color={user.color}
      />
      <SectionCard title={m.tasty_great_octopus_lend()}>
        <PersonList
          people={data.correspondents}
          limit={4}
          color={user.color}
          empty={m.quaint_calm_warbler_rush()}
        />
      </SectionCard>
    </div>
  </div>
</div>
