<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import { Epigraph, PersonList, RecordList, StatTile, YearBars } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import SeasonLine from './SeasonLine.svelte';
  import { countOf, seasons, totalOf } from './seasons';
  import { typed } from '../_family/pick';

  // The salon at Auteuil: unhurried, centred, letters like visiting cards.
  let { user, data }: DashboardProps = $props();

  const total = $derived(totalOf(data.countsByType));
  const letters = $derived(countOf(data.countsByType, 'letter'));
  const points = $derived(seasons(typed(data, 'letter')));
  const letterRecords = $derived(typed(data, 'letter'));
  const span = $derived(
    data.range.earliest && data.range.latest
      ? m.inner_vivid_jellyfish_scoop({
          first: data.range.earliest.getUTCFullYear(),
          last: data.range.latest.getUTCFullYear(),
        })
      : '—',
  );
</script>

<div
  class="mx-auto w-full max-w-3xl space-y-8 px-3 py-8 text-center sm:px-0"
  style="background: radial-gradient(ellipse at top, color-mix(in srgb, {user.color} 9%, white), transparent 70%)"
>
  <header class="space-y-2">
    <AvatarImage {user} class="mx-auto size-20" />
    <div class="text-xs tracking-[0.35em] text-stone-500 uppercase">
      {m.swift_quaint_zebra_bake()}
    </div>
    <h1 class="font-serif text-4xl" style="color: {user.color}">{user.name}</h1>
    <p class="mx-auto max-w-md font-serif text-stone-600 italic">{m.strong_only_manatee_hint()}</p>
  </header>

  <Epigraph
    class="mx-auto max-w-lg text-left"
    text={m.spry_arable_kudu_skip()}
    source={m.lower_spare_koala_achieve()}
  />

  {#if total === 0}
    <p class="font-serif text-stone-500 italic">{m.livid_zippy_florian_promise()}</p>
  {:else}
    <div class="grid grid-cols-3 gap-3 text-left">
      <StatTile label={m.green_smug_shrike_strive()} value={letters} color={user.color} />
      <StatTile label={m.flaky_ornate_ray_bump()} value={total - letters} color={user.color} />
      <StatTile label={m.polite_noisy_bat_enchant()} value={span} color={user.color} />
    </div>

    {#if data.byYear.length}
      <section class="text-left">
        <h2 class="mb-1 text-center font-serif text-lg text-stone-800">
          {m.caring_round_meerkat_pave()}
        </h2>
        <YearBars data={data.byYear} color={user.color} />
      </section>
    {/if}

    {#if points.length}
      <section>
        <h2 class="font-serif text-lg text-stone-800">{m.lucky_ideal_javelina_view()}</h2>
        <p class="text-xs text-stone-500 italic">{m.stale_safe_newt_breathe()}</p>
        <SeasonLine {points} color={user.color} />
      </section>
    {/if}

    <section class="text-left">
      <h2 class="mb-2 text-center font-serif text-lg text-stone-800">
        {m.known_strong_lynx_wish()}
      </h2>
      <PersonList
        people={data.correspondents}
        limit={6}
        color={user.color}
        empty={m.quaint_calm_warbler_rush()}
      />
    </section>

    <section class="text-left">
      <h2 class="mb-2 text-center font-serif text-lg text-stone-800">
        {m.factual_front_duck_vent()}
      </h2>
      <RecordList
        records={letterRecords}
        variant="card"
        limit={5}
        empty={m.quaint_calm_warbler_rush()}
      />
    </section>
  {/if}
</div>
