import type { NCrudRow } from '@/components/crud';

export interface RstBranchListItem extends NCrudRow {
  BrhID: number;
  BrhResID: number;
  BrhName: string;
  BrhAddress: string | null;
  BrhPhone: string | null;
  BrhEmail: string | null;
  BrhManagerName: string | null;
  BrhCurrencyDefID: number | null;
}

export interface CurrencyOption {
  [key: string]: unknown;
  value: number;
  text: string;
}

export interface SaveRstBranchInput {
  LocalId?: string;
  BrhResID: number;
  BrhName: string;
  BrhAddress: string;
  BrhPhone: string;
  BrhEmail: string;
  BrhManagerName: string;
  BrhCurrencyDefID: number | null;
  UserId: number;
}
