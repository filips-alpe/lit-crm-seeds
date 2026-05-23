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
  orderNote?: string;
  typeNote?: string;
  priceNote?: string;
  bookNote?: string;
  placeFrom?: string;
  placeTo?: string;
  remindTo?: string;
  status?: SeedStatus;
  user?: string;
};

export type SeedOrder = {
  code: string;
  description: string;
  status?: SeedStatus;
  color: string;
  records: SeedRecord[];
};

export type SeedOrderMeta = {
  code: string;
  description: string;
  status?: SeedStatus;
  color: string;
  assignee?: string;
};

export type SeedRecordFlat = SeedRecord & { order: string };

export type SeedType = {
  code: string;
  description: string;
  color: string;
};
