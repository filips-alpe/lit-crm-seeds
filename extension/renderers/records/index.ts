import * as m from '$lib/paraglide/messages.js';
import type { RecordRenderer } from '$lib/renderers/registry';
import AccountCard from './account/AccountCard.svelte';
import AccountRow from './account/AccountRow.svelte';
import InstrumentCard from './instrument/InstrumentCard.svelte';
import InstrumentRow from './instrument/InstrumentRow.svelte';

export const recordRenderers: RecordRenderer[] = [
  {
    id: 'instrument',
    get name() {
      return m.icy_pink_hare_assure();
    },
    card: InstrumentCard,
    row: InstrumentRow,
    fullBleed: true,
  },
  {
    id: 'account',
    get name() {
      return m.drab_polite_liger_link();
    },
    card: AccountCard,
    row: AccountRow,
    fullBleed: true,
  },
];
