export type SeedStatus = 'ACTIVE' | 'INACTIVE';

export type SeedRecord = {
  type: string;
  key?: string;
  linkedTo?: string;
  title?: string;
  description?: string;
  text?: string;
  note?: string;
  references: string[];
  date?: Date;
  start?: Date;
  end?: Date;
  allDay?: boolean;
  sum?: number;
  hours?: number;
  total?: number;
  unit?: string;
  from?: string;
  to?: string;
  user?: string;
  remindTo?: string;
  status?: SeedStatus;
};

export type SeedProject = {
  code: string;
  description: string;
  status?: SeedStatus;
  color: string;
  records: SeedRecord[];
};

export type SeedProjectMeta = {
  code: string;
  description: string;
  status?: SeedStatus;
  color: string;
  assignee?: string;
};

export type SeedRecordFlat = SeedRecord & { projects: string[] };

export type SeedType = {
  code: string;
  description: string;
  color: string;
  iconSeed?: string;
};
