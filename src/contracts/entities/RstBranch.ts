import type { EntityBaseContract } from '@/contracts/entities/EntityBaseContract';

export interface RstBranch extends EntityBaseContract {
  BrhID: number;
  BrhResID: number;
  BrhName: string;
  BrhAddress: string | null;
  BrhPhone: string | null;
  BrhEmail: string | null;
  BrhManagerName: string | null;
  BrhCurrencyDefID: number | null;
}
