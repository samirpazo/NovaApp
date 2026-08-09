import type { EntityBaseContract } from '@/contracts/entities/EntityBaseContract';

export interface GenDefinition extends EntityBaseContract {
  DefID: number;
  DefDescription: string;
  DefCode: string;
  DefStated: number;
}
