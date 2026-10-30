/** A generated record as the loader hands it to the seeder (see pipeline/record-mapper.ts). */
export type SeedRecordFlat = {
  type: string;
  title?: string;
  description?: string;
  text?: string;
  note?: string;
  references: string[];
  // ISO date strings: the generated import stores plain ISO strings in JSON.
  // `new Date(...)` in index.ts accepts them.
  entered: string; // NS date -> createdAt
  date?: string; // `date` column (Old Style before 1752)
  start?: string;
  end?: string;
  allDay?: boolean;
  from?: string;
  to?: string;
  fromGeo?: string;
  toGeo?: string;
  user?: string; // creator username
  assignee?: string; // assignee username
  projects: string[];
};

export type SeedProjectMeta = {
  code: string;
  description: string;
  status?: 'ACTIVE' | 'INACTIVE';
  color: string;
  assignee?: string;
};

export type SeedLayoutField = {
  id: string;
  label: string;
  kind:
    | 'text'
    | 'markdown'
    | 'number'
    | 'date'
    | 'datetime'
    | 'list'
    | 'location'
    | 'user'
    | 'record';
  writeTo: string;
};

export type SeedLayout = {
  fields: SeedLayoutField[];
};

export type SeedType = {
  code: string;
  description: string;
  color: string;
  iconSeed?: string;
  layout?: SeedLayout;
  // Optional installed renderer id (from the renderer registry).
  rendererId?: string;
};
