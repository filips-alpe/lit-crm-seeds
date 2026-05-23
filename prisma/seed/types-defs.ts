export type SeedStatus = 'ACTIVE' | 'INACTIVE';

export type SeedRecord = {
  type: string;
  date: Date;
  allDay?: boolean;
  sum?: number;
  hours?: number;
  totalPrice?: number;
  startDate?: Date;
  endDate?: Date;
  note?: string;
  footNote?: string;
  idNote?: string;
  projectNote?: string;
  typeNote?: string;
  priceNote?: string;
  bookNote?: string;
  placeFrom?: string;
  placeTo?: string;
  remindTo?: string;
  status?: SeedStatus;
  user?: string;
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

export type SeedRecordFlat = SeedRecord & { project: string };

export type SeedType = {
  code: string;
  description: string;
  color: string;
};
