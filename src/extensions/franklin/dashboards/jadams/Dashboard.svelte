<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import { RecordList, SectionCard, StatTile, Timeline, YearBars } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import ExchangeLedger from './ExchangeLedger.svelte';
  import { countOf, exchangeLedger, peakYear } from './papers';
  import { typed } from '../_family/pick';

  let { user, data }: DashboardProps = $props();

  const exchanges = $derived(exchangeLedger(data.correspondents));
  const peak = $derived(peakYear(data.byYear));
  const diary = $derived(typed(data, 'diary'));
  const papers = $derived(typed(data, 'instrument', 'proceedings'));
  const offices = $derived(
    typed(data, 'office').map((r) => ({
      id: r.id,
      date: r.start ?? r.date,
      title: r.to ?? r.title ?? '',
      subtitle: r.end ? `→ ${r.end.getUTCFullYear()}` : null,
      color: r.type.color,
    })),
  );
</script>

<div class="mx-auto w-full max-w-6xl space-y-4 px-3 py-4 sm:px-0">
  <header
    class="flex items-center gap-4 rounded-lg px-5 py-4 text-white"
    style="background-color: {user.color}"
  >
    <AvatarImage {user} class="size-14 shrink-0 ring-2 ring-white/60" />
    <div class="min-w-0">
      <h1 class="font-serif text-2xl font-semibold">{m.nice_east_jellyfish_hint()}</h1>
      <p class="text-sm text-white/80">{m.left_spry_butterfly_greet()}</p>
    </div>
  </header>

  <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
    <StatTile
      label={m.cuddly_away_antelope_treat()}
      value={countOf(data.countsByType, 'diary')}
      color={user.color}
    />
    <StatTile
      label={m.green_smug_shrike_strive()}
      value={countOf(data.countsByType, 'letter')}
      color={user.color}
    />
    <StatTile
      label={m.last_empty_moose_enrich()}
      value={countOf(data.countsByType, 'office')}
      color={user.color}
    />
    <StatTile
      label={m.that_icy_millipede_forgive()}
      value={peak?.year ?? '—'}
      hint={peak ? m.quick_jolly_meerkat_greet({ count: peak.count }) : undefined}
      color={user.color}
    />
  </div>

  <div class="grid gap-4 lg:grid-cols-3">
    <div class="space-y-4 lg:col-span-2">
      <SectionCard title={m.muddy_funny_beetle_dare()}>
        <RecordList records={diary} limit={6} empty={m.quaint_calm_warbler_rush()} />
      </SectionCard>
      <SectionCard title={m.icy_watery_porpoise_harbor()}>
        <ExchangeLedger {exchanges} color={user.color} empty={m.quaint_calm_warbler_rush()} />
      </SectionCard>
      <SectionCard title={m.steep_full_capybara_flow()}>
        <YearBars data={data.byYear} color={user.color} height={96} />
      </SectionCard>
    </div>
    <div class="space-y-4">
      <SectionCard title={m.last_empty_moose_enrich()}>
        <Timeline items={offices} empty={m.quaint_calm_warbler_rush()} />
      </SectionCard>
      <SectionCard title={m.flaky_lofty_tern_flip()}>
        <RecordList records={papers} limit={6} empty={m.quaint_calm_warbler_rush()} />
      </SectionCard>
    </div>
  </div>
</div>
