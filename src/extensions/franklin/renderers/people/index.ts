import * as m from '$lib/paraglide/messages.js';
import type { RecordRenderer } from '$lib/renderers/registry';
import LifeCard from './life/LifeCard.svelte';
import LifeRow from './life/LifeRow.svelte';
import MembershipCard from './membership/MembershipCard.svelte';
import MembershipRow from './membership/MembershipRow.svelte';
import OfficeCard from './office/OfficeCard.svelte';
import OfficeRow from './office/OfficeRow.svelte';

export const peopleRenderers: RecordRenderer[] = [
  {
    id: 'life',
    get name() {
      return m.livid_super_falcon_cook();
    },
    card: LifeCard,
    row: LifeRow,
    fullBleed: true,
  },
  {
    id: 'office',
    get name() {
      return m.witty_every_jackdaw_aid();
    },
    card: OfficeCard,
    row: OfficeRow,
    fullBleed: true,
  },
  {
    id: 'membership',
    get name() {
      return m.dizzy_mealy_goat_smile();
    },
    card: MembershipCard,
    row: MembershipRow,
    fullBleed: true,
  },
];
