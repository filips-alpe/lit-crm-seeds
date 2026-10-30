<script lang="ts">
  import { resolve } from '$app/paths';
  import * as m from '$lib/paraglide/messages.js';
  import AvatarImage from '$lib/components/AvatarImage.svelte';
  import { formatDate } from '$lib/utils/formatDate';
  import { Epigraph, RecordList, SectionCard, StatTile } from '$lib/dashboards/widgets';
  import type { DashboardProps } from '$lib/dashboards/types';
  import { accountRows } from './ledger';
  import { typed } from '../_family/pick';

  // An illustrative supplier (the paper-works): the role, then a ledger of whatever accounts it holds.
  let { user, data }: DashboardProps = $props();

  const accountCount = $derived(data.countsByType.find((c) => c.code === 'account')?.count ?? 0);
  const total = $derived(data.countsByType.reduce((n, c) => n + c.count, 0));
  const rows = $derived(accountRows(typed(data, 'account')));
  const letters = $derived(typed(data, 'letter'));
</script>

<div class="mx-auto w-full max-w-4xl space-y-5 px-3 py-6 sm:px-0">
  <header
    class="flex items-center gap-4 rounded-lg px-4 py-4"
    style="background-color: color-mix(in srgb, {user.color} 12%, white)"
  >
    <AvatarImage {user} class="size-16 shrink-0" />
    <div class="min-w-0">
      <span class="text-[0.65rem] tracking-widest uppercase" style="color: {user.color}"
        >{m.every_away_rook_blend()}</span
      >
      <h1 class="font-serif text-2xl text-stone-900">{user.name}</h1>
      <p class="text-sm text-stone-500">{m.ideal_merry_warthog_hack()}</p>
    </div>
  </header>

  <Epigraph text={m.loose_bold_rabbit_beam()} source={m.weary_bald_meerkat_agree()} />

  <SectionCard title={m.dirty_simple_kestrel_bloom()} subtitle={m.loud_trite_rook_persist()}>
    {#if accountCount === 0}
      <div class="rounded-lg border-2 border-dashed border-stone-200 px-6 py-8 text-center">
        <h3 class="font-serif text-lg text-stone-700">{m.equal_wide_piranha_zip()}</h3>
        <p class="mx-auto mt-2 max-w-md text-sm text-stone-500">
          {m.basic_sound_earthworm_harbor()}
        </p>
      </div>
    {:else}
      <div class="mb-3 grid gap-3 sm:grid-cols-3">
        <StatTile
          label={m.wide_tiny_mallard_trip({ count: accountCount })}
          value={accountCount}
          color={user.color}
        />
      </div>
      <table class="w-full text-sm">
        <tbody class="divide-y divide-stone-100">
          {#each rows as r (r.id)}
            <tr>
              <td class="w-28 py-1.5 pr-3 text-xs text-stone-500 tabular-nums"
                >{formatDate(r.date)}</td
              >
              <td class="py-1.5">
                <a
                  href={resolve('/(app)/data/[id]', { id: r.id })}
                  class="text-stone-800 hover:underline">{r.title}</a
                >
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </SectionCard>

  {#if letters.length}
    <SectionCard title={m.green_smug_shrike_strive()}>
      <RecordList records={letters} limit={6} />
    </SectionCard>
  {:else if total > accountCount}
    <SectionCard title={m.trite_plane_ape_believe()}>
      <RecordList records={data.recent} limit={6} />
    </SectionCard>
  {/if}
</div>
