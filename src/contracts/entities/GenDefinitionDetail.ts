import type { EntityBaseContract } from '@/contracts/entities/EntityBaseContract';

export interface GenDefinitionDetail extends EntityBaseContract {
  DedID: number;
  DedCode: string | null;
  DedDescription: string;
  DedValue: number;
  DedAbbreviation: string | null;
  DedFormat: string | null;
  DedHelper: string | null;
  DedHelper2: string | null;
  DedIcon: string | null;
  DedColor: string | null;
  DedStated: number;
  DefID: number;
  DedGroup: string | null;
  DedImagePath: string | null;
}
