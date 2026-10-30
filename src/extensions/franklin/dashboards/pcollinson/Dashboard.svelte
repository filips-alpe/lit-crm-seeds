<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import { RecordList, SectionCard, StatTile, YearBars } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import Communications from './Communications.svelte';
  import { typed } from '../_family/pick';

  let { user, data }: DashboardProps = $props();

  const count = (code: string) => data.countsByType.find((c) => c.code === code)?.count ?? 0;
  const ofType = (code: string) => typed(data, code);
  // Oldest first, as a journal prints them.
  const letters = $derived([...ofType('letter')].reverse().slice(-12));
</script>

<div class="mx-auto w-full max-w-4xl space-y-6 px-3 py-6 sm:px-0">
  <header class="border-b-2 border-double border-stone-400 pb-4 text-center">
    <AvatarImage {user} class="mx-auto size-14" />
    <h1 class="mt-2 font-serif text-3xl text-stone-900">{m.lazy_merry_scallop_list()}</h1>
    <p class="mt-1 text-sm text-stone-500 italic">{m.salty_glad_reindeer_belong()}</p>
  </header>

  <div class="grid grid-cols-3 gap-3">
    <StatTile label={m.green_smug_shrike_strive()} value={count('letter')} color={user.color} />
    <StatTile label={m.inclusive_spare_rat_fold()} value={count('essay')} color={user.color} />
    <StatTile label={m.lost_warm_stork_jest()} value={count('membership')} color={user.color} />
  </div>

  <SectionCard title={m.super_calm_elk_dazzle()}>
    <Communications records={letters} color={user.color} empty={m.quaint_calm_warbler_rush()} />
  </SectionCard>

  <div class="grid gap-4 md:grid-cols-2">
    <SectionCard title={m.brave_gaudy_marmot_laugh()}>
      <RecordList records={ofType('membership')} limit={5} empty={m.quaint_calm_warbler_rush()} />
    </SectionCard>
    <SectionCard title={m.inclusive_spare_rat_fold()}>
      <RecordList records={ofType('essay')} limit={5} empty={m.quaint_calm_warbler_rush()} />
    </SectionCard>
  </div>

  <SectionCard title={m.steep_full_capybara_flow()}>
    <YearBars data={data.byYear} color={user.color} height={80} />
  </SectionCard>
</div>
