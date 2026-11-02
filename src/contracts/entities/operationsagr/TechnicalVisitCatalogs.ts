import { z } from 'zod';
import { EntityBaseContractSchema } from '@/contracts/entities/EntityBaseContract';

const base = EntityBaseContractSchema;
export const OagFruitFarmSchema = base.extend({ FrfID: z.number().int(), FrfName: z.string(), FrfAddress: z.string() });
export const OagPlotFarmSchema = base.extend({
  PlfID: z.number().int(), FrfID: z.number().int(), PlfCode: z.string(), PlfName: z.string(),
  CltID: z.number().int(), VrtID: z.number().int(), TypeCrop: z.number().int(), PlfHectares: z.number(),
});
export const OagFruitFarmSupervisorSchema = base.extend({
  FfsID: z.number().int(), FrfID: z.number().int(), SpvID: z.number().int(),
  FfsStartDate: z.string(), FfsEndDate: z.string().nullish(), FfsIsActive: z.boolean(),
});
export const OagCultiveSchema = base.extend({ CltID: z.number().int(), CltDescription: z.string(), CltAbbreviation: z.string().nullish(), CltStatus: z.number().int().nullish() });
export const OagVarietySchema = base.extend({ VrtID: z.number().int(), CltID: z.number().int(), VrtCode: z.string(), VrtDescription: z.string(), VrtStatus: z.number().int().nullish() });
export const OagFarmSuppliesSchema = base.extend({
  FrsID: z.number().int(), TypeSupplies: z.number().int().nullish(), FrsDescription: z.string(), FrsCode: z.string(),
  FrsActiveIngredientName: z.string(), FrsStatus: z.number().int(), TypeApplication: z.number().int().nullish(),
  TypeAction: z.number().int().nullish(), TypeMeasurement: z.number().int().nullish(), TypeUnit: z.number().int().nullish(),
  TypeCategory: z.number().int().nullish(), TypeClassification: z.number().int().nullish(),
});
export const OagFarmSuppliesTargetSchema = base.extend({
  FstID: z.number().int(), FrsID: z.number().int(), CltID: z.number().int(), ObjID: z.number().int(),
  FstMinDose: z.number().nullish(), FstMaxDose: z.number().nullish(), FstApplicationFrequency: z.string().nullish(),
  FstPpplCode: z.string().nullish(), FstGracePeriodDays: z.number().int().nullish(),
});
export const OagObjectiveSchema = base.extend({ ObjID: z.number().int(), ObjDescription: z.string(), ObjType: z.number().int() });
export const OagObjectiveCultiveSchema = base.extend({ OjcID: z.number().int(), ObjID: z.number().int(), CltID: z.number().int() });
export const OagWaterSourceSchema = base.extend({ OwsID: z.number().int(), PlfID: z.number().int(), OwsType: z.number().int(), OwsName: z.string(), OwsAdministrator: z.string() });

export type OagFruitFarm = z.infer<typeof OagFruitFarmSchema>;
export type OagPlotFarm = z.infer<typeof OagPlotFarmSchema>;
export type OagFruitFarmSupervisor = z.infer<typeof OagFruitFarmSupervisorSchema>;
export type OagCultive = z.infer<typeof OagCultiveSchema>;
export type OagVariety = z.infer<typeof OagVarietySchema>;
export type OagFarmSupplies = z.infer<typeof OagFarmSuppliesSchema>;
export type OagFarmSuppliesTarget = z.infer<typeof OagFarmSuppliesTargetSchema>;
export type OagObjective = z.infer<typeof OagObjectiveSchema>;
export type OagObjectiveCultive = z.infer<typeof OagObjectiveCultiveSchema>;
export type OagWaterSource = z.infer<typeof OagWaterSourceSchema>;
