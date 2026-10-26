import { z } from 'zod';
import { EntityBaseContractSchema } from '@/contracts/entities/EntityBaseContract';

export const GenCampaignSchema = EntityBaseContractSchema.extend({
  CmpID: z.number().int(),
  CmpCode: z.string(),
  CmpName: z.string(),
  CmpStartDate: z.string().nullish(),
  CmpEndDate: z.string().nullish(),
  TypeCampaign: z.number().int().nullish(),
});
export type GenCampaign = z.infer<typeof GenCampaignSchema>;
