import type { RendererProps } from '$lib/render/props';
import { byWriteTo } from '$lib/render/select';
import { parseLatLng } from '$lib/fields/registry';
import { coreData, type CoreData } from '../shared/fields';
import { crossesAtlantic, excerpt, splitEndpoint, type Endpoint } from './letters';

export interface CorrespondenceData extends CoreData {
  sender: Endpoint;
  recipient: Endpoint;
  fromPoint: ReturnType<typeof parseLatLng>;
  toPoint: ReturnType<typeof parseLatLng>;
  ocean: boolean;
  /** Title, else the opening of the text. */
  subject: string;
}

/** Letter/petition facts: endpoints split into name + place, geo only when parseable. */
export function correspondenceData(fields: RendererProps['fields']): CorrespondenceData {
  const core = coreData(fields);
  const fromPoint = parseLatLng(byWriteTo(fields, 'fromGeo')?.raw);
  const toPoint = parseLatLng(byWriteTo(fields, 'toGeo')?.raw);
  return {
    ...core,
    sender: splitEndpoint(core.from ?? '', core.fromPerson),
    recipient: splitEndpoint(core.to ?? '', core.toPerson, 'name'),
    fromPoint,
    toPoint,
    ocean: crossesAtlantic(fromPoint, toPoint),
    subject: core.title ?? excerpt(core.text, 90),
  };
}
