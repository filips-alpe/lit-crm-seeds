import type { RecordRenderer } from '$lib/renderers/registry';
import { correspondenceRenderers } from './correspondence';
import { writingRenderers } from './writings';
import { recordRenderers } from './records';
import { peopleRenderers } from './people';

export const renderers: RecordRenderer[] = [
  ...correspondenceRenderers,
  ...writingRenderers,
  ...recordRenderers,
  ...peopleRenderers,
];
