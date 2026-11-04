import * as m from '$lib/paraglide/messages.js';
import type { RecordRenderer } from '$lib/renderers/registry';
import CorrespondenceDetail from '$lib/renderers/correspondence/CorrespondenceDetail.svelte';
import LetterCard from './letter/LetterCard.svelte';
import LetterRow from './letter/LetterRow.svelte';
import PetitionCard from './petition/PetitionCard.svelte';
import PetitionRow from './petition/PetitionRow.svelte';

// Both reuse the correspondence detail: it places the columns a layout has and
// renders the rest generically, so a layout with no geo or person fields is fine.
export const correspondenceRenderers: RecordRenderer[] = [
  {
    id: 'letter',
    get name() {
      return m.clean_level_monkey_gleam();
    },
    card: LetterCard,
    row: LetterRow,
    detail: CorrespondenceDetail,
    fullBleed: true,
  },
  {
    id: 'petition',
    get name() {
      return m.fuzzy_bright_pigeon_glow();
    },
    card: PetitionCard,
    row: PetitionRow,
    detail: CorrespondenceDetail,
    fullBleed: true,
  },
];
