import type { RendererProps } from '$lib/render/props';
import { coreData, type CoreData } from '../../shared/fields';
import { termSpan, type TermSpan } from './money';

export interface AccountData extends CoreData {
  span: TermSpan | null;
}

export function accountData(fields: RendererProps['fields']): AccountData {
  const core = coreData(fields);
  return {
    ...core,
    span: termSpan(core.start as string | Date | null, core.end as string | Date | null),
  };
}
