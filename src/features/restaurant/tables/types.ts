import type { NCrudRow } from '@/components/crud';

export interface RstTableListItem extends NCrudRow {
  TabID: number;
  TabTableNumber: number;
  TabCapacity: number;
  TabStatus: number;
  BrhID: number | null;
  TabShape: string;
}
