import type { RendererProps } from '$lib/render/props';
import { byWriteTo } from '$lib/render/select';
import { coreData, geoLabel, yearsLabel, type CoreData } from '../shared/fields';

export interface PeopleData extends CoreData {
  /** Person the event is about: the linked user, else the free-text name. */
  person: string | null;
  geo: string | null;
  years: string | null;
}

export function peopleData(fields: RendererProps['fields']): PeopleData {
  const core = coreData(fields);
  return {
    ...core,
    person: core.fromPerson ?? core.from,
    geo: geoLabel(byWriteTo(fields, 'toGeo')?.raw),
    years: yearsLabel(core.start, core.end),
  };
}
