<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import { RecordList, SectionCard, Sparkline, StatTile, Timeline } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import ExchangeBars from './ExchangeBars.svelte';
  import { exchangeRows, lifeItems } from './exchange';
  import { typed } from '../_family/pick';

  let { user, data }: DashboardProps = $props();

  const count = (code: string) => data.countsByType.find((c) => c.code === code)?.count ?? 0;
  const rows = $derived(exchangeRows(data.correspondents));
  const life = $derived(lifeItems(typed(data, 'life')));
  const mail = $derived(typed(data, 'letter'));
</script>

<div class="mx-auto w-full max-w-5xl space-y-6 px-3 py-6 sm:px-0">
  <header class="flex items-center gap-4">
    <AvatarImage {user} class="size-16 shrink-0" />
    <div class="min-w-0 flex-1">
      <h1 class="font-serif text-3xl text-stone-900">{m.spry_equal_lynx_burn()}</h1>
      <p class="text-sm text-stone-500 italic">{m.awful_giant_shrike_urge()}</p>
    </div>
    {#if data.byYear.length > 1}
      <Sparkline values={data.byYear.map((y) => y.count)} color={user.color} width={140} />
    {/if}
  </header>

  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <StatTile label={m.green_smug_shrike_strive()} value={count('letter')} color={user.color} />
    <StatTile label={m.solid_noble_emu_tickle()} value={count('life')} color={user.color} />
    <StatTile
      label={m.sea_home_millipede_fall()}
      value={data.range.earliest && data.range.latest
        ? `${data.range.earliest.getUTCFullYear()}–${data.range.latest.getUTCFullYear()}`
        : '—'}
      color={user.color}
      class="col-span-2 sm:col-span-1"
    />
  </div>

  <div class="grid gap-6 md:grid-cols-5">
    <SectionCard title={m.teary_blue_cowfish_grip()} class="md:col-span-3">
      <ExchangeBars {rows} color={user.color} />
    </SectionCard>
    <SectionCard title={m.loved_bad_mare_fond()} class="md:col-span-2">
      <Timeline items={life} empty={m.quaint_calm_warbler_rush()} />
    </SectionCard>
  </div>

  <SectionCard title={m.tasty_vexed_crocodile_grow()}>
    <RecordList records={mail} limit={6} empty={m.quaint_calm_warbler_rush()} />
  </SectionCard>
</div>
