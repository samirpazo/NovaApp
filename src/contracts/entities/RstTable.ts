import type { EntityBaseContract } from '@/contracts/entities/EntityBaseContract';

export interface RstTable extends EntityBaseContract {
  TabID: number;
  TabTableNumber: number;
  TabCapacity: number;
  TabStatus: number;
  BrhID: number | null;
  TabPosX: number;
  TabPosY: number;
  TabWidth: number;
  TabHeight: number;
  TabRotation: number;
  TabShape: string;
  TabZIndex: number;
}
