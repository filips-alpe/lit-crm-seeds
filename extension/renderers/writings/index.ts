import * as m from '$lib/paraglide/messages.js';
import type { RecordRenderer } from '$lib/renderers/registry';
import DiaryCard from './diary/DiaryCard.svelte';
import DiaryRow from './diary/DiaryRow.svelte';
import EssayCard from './essay/EssayCard.svelte';
import EssayRow from './essay/EssayRow.svelte';
import NoteCard from './note/NoteCard.svelte';
import NoteRow from './note/NoteRow.svelte';
import ProceedingsCard from './proceedings/ProceedingsCard.svelte';
import ProceedingsRow from './proceedings/ProceedingsRow.svelte';

export const writingRenderers: RecordRenderer[] = [
  {
    id: 'diary',
    get name() {
      return m.fuzzy_round_cat_fear();
    },
    card: DiaryCard,
    row: DiaryRow,
    fullBleed: true,
  },
  {
    id: 'essay',
    get name() {
      return m.mild_tired_cobra_yell();
    },
    card: EssayCard,
    row: EssayRow,
    fullBleed: true,
  },
  {
    id: 'note',
    get name() {
      return m.warm_alive_salmon_chop();
    },
    card: NoteCard,
    row: NoteRow,
    fullBleed: true,
  },
  {
    id: 'proceedings',
    get name() {
      return m.level_dirty_jaguar_mix();
    },
    card: ProceedingsCard,
    row: ProceedingsRow,
    fullBleed: true,
  },
];
