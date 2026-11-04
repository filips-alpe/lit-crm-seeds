<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  import { SectionCard, Timeline } from '$lib/dashboards/widgets';
  import type { DashboardRecord } from '$lib/dashboards/types';
  import { ofType, timelineItems } from './pick';

  // Births, marriages, deaths: the life records among the newest, as a dated rail.
  let {
    records,
    title = m.stale_formal_butterfly_grasp(),
    codes = ['life'],
  }: { records: DashboardRecord[]; title?: string; codes?: string[] } = $props();

  const items = $derived(timelineItems(ofType(records, ...codes)));
</script>

<SectionCard {title}>
  <Timeline {items} empty={m.early_sour_lamb_loop()} />
</SectionCard>
