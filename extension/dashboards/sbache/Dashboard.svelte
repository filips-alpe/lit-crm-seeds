<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import { Epigraph, PersonList, RecordList, SectionCard, YearBars } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import LifeEvents from '../_family/LifeEvents.svelte';
  import { countOf, typed } from '../_family/pick';
  import LetterJourney from './LetterJourney.svelte';
  import { longestRoute } from './distance';
  import { lettersFromFather } from './father';

  // "Dear Sally": a single warm column, led by what her father has written.
  let { user, data }: DashboardProps = $props();

  const journey = $derived(longestRoute(data.geo));
  const fromFather = $derived(lettersFromFather(typed(data, 'letter')));
</script>

<div class="mx-auto w-full max-w-3xl space-y-6 px-3 py-6 sm:px-0">
  <header
    class="flex items-center gap-4 rounded-2xl p-5"
    style="background-color: color-mix(in srgb, {user.color} 10%, white)"
  >
    <AvatarImage {user} class="size-16 shrink-0" />
    <div class="min-w-0">
      <h1 class="font-serif text-3xl italic" style="color: {user.color}">
        {m.sweet_lazy_polecat_cry()}
      </h1>
      <p class="mt-1 text-sm text-stone-600">{m.fair_arable_tadpole_feel()}</p>
      <p class="mt-1 text-xs text-stone-500 tabular-nums">
        {m.funny_brave_dingo_zap({
          letters: countOf(data.countsByType, 'letter'),
          events: countOf(data.countsByType, 'life'),
        })}
      </p>
    </div>
  </header>

  <SectionCard title={m.slimy_petty_starfish_explore()}>
    <RecordList
      records={fromFather}
      variant="card"
      limit={6}
      empty={m.clean_wild_millipede_twirl()}
    />
  </SectionCard>

  {#if data.byYear.length}
    <SectionCard title={m.caring_round_meerkat_pave()}>
      <YearBars data={data.byYear} color={user.color} />
    </SectionCard>
  {/if}

  <div class="grid gap-6 sm:grid-cols-2">
    <LifeEvents records={typed(data, 'life')} />
    <SectionCard title={m.tasty_great_octopus_lend()}>
      <PersonList
        people={data.correspondents}
        limit={6}
        color={user.color}
        empty={m.factual_drab_gopher_dazzle()}
      />
    </SectionCard>
  </div>

  <div class="grid gap-6 sm:grid-cols-2">
    <Epigraph text={m.born_cute_sheep_splash()} source={m.noble_that_bobcat_reap()} />
    {#if journey}
      <LetterJourney route={journey.route} miles={journey.miles} color={user.color} />
    {/if}
  </div>
</div>
