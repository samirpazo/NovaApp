import type { NCrudRow } from '@/components/crud';

export interface GenDefinitionOption {
  DefID: number;
  DefCode: string;
  DefDescription: string;
}

export interface GenDefinitionDetailListItem extends NCrudRow {
  DedID: number;
  DefID: number;
  DedCode: string | null;
  DedValue: number;
  DedDescription: string;
  DedAbbreviation: string | null;
  DedFormat: string | null;
  DedGroup: string | null;
  DedHelper: string | null;
  DedHelper2: string | null;
  DedIcon: string | null;
  DedColor: string | null;
  DedStated: number;
  DedImageFilID: number | null;
}

export interface SaveGenDefinitionDetailInput {
  LocalId?: string;
  Definition: GenDefinitionOption;
  DedValue: number;
  DedDescription: string;
  DedAbbreviation: string;
  DedFormat: string;
  DedGroup: string;
  DedHelper: string;
  DedHelper2: string;
  DedIcon: string;
  DedColor: string;
  DedStated: number;
  DedImageFilID: number | null;
  UserId: number;
}
