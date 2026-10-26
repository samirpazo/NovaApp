import { field, text } from '@nozbe/watermelondb/decorators';
import { SYNC_RESOURCES } from '@/contracts/sync';
import { EntityBaseModel } from '@/database/models/EntityBaseModel';

export class GenCampaignModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.GenCampaign;
  @field('CmpID') CmpID: number;
  @text('CmpCode') CmpCode: string;
  @text('CmpName') CmpName: string;
  @text('CmpStartDate') CmpStartDate: string | null;
  @text('CmpEndDate') CmpEndDate: string | null;
  @field('TypeCampaign') TypeCampaign: number | null;
}
export class OagFruitFarmModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.OagFruitFarm;
  @field('FrfID') FrfID: number;
  @text('FrfName') FrfName: string;
  @text('FrfAddress') FrfAddress: string;
}
export class OagPlotFarmModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.OagPlotFarm;
  @field('PlfID') PlfID: number;
  @field('FrfID') FrfID: number;
  @text('PlfCode') PlfCode: string;
  @text('PlfName') PlfName: string;
  @field('CltID') CltID: number;
  @field('VrtID') VrtID: number;
  @field('TypeCrop') TypeCrop: number;
  @field('PlfHectares') PlfHectares: number;
}
export class OagFruitFarmSupervisorModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.OagFruitFarmSupervisor;
  @field('FfsID') FfsID: number;
  @field('FrfID') FrfID: number;
  @field('SpvID') SpvID: number;
  @text('FfsStartDate') FfsStartDate: string;
  @text('FfsEndDate') FfsEndDate: string | null;
  @field('FfsIsActive') FfsIsActive: boolean;
}
export class OagCultiveModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.OagCultive;
  @field('CltID') CltID: number;
  @text('CltDescription') CltDescription: string;
  @text('CltAbbreviation') CltAbbreviation: string | null;
  @field('CltStatus') CltStatus: number | null;
}
export class OagVarietyModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.OagVariety;
  @field('VrtID') VrtID: number;
  @field('CltID') CltID: number;
  @text('VrtCode') VrtCode: string;
  @text('VrtDescription') VrtDescription: string;
  @field('VrtStatus') VrtStatus: number | null;
}
export class OagFarmSuppliesModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.OagFarmSupplies;
  @field('FrsID') FrsID: number;
  @field('TypeSupplies') TypeSupplies: number | null;
  @text('FrsDescription') FrsDescription: string;
  @text('FrsCode') FrsCode: string;
  @text('FrsActiveIngredientName') FrsActiveIngredientName: string;
  @field('FrsStatus') FrsStatus: number;
  @field('TypeApplication') TypeApplication: number | null;
  @field('TypeAction') TypeAction: number | null;
  @field('TypeMeasurement') TypeMeasurement: number | null;
  @field('TypeUnit') TypeUnit: number | null;
  @field('TypeCategory') TypeCategory: number | null;
  @field('TypeClassification') TypeClassification: number | null;
}
export class OagFarmSuppliesTargetModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.OagFarmSuppliesTarget;
  @field('FstID') FstID: number;
  @field('FrsID') FrsID: number;
  @field('CltID') CltID: number;
  @field('PlgID') PlgID: number;
  @field('FstMinDose') FstMinDose: number | null;
  @field('FstMaxDose') FstMaxDose: number | null;
  @text('FstApplicationFrequency') FstApplicationFrequency: string | null;
  @text('FstPpplCode') FstPpplCode: string | null;
  @field('FstGracePeriodDays') FstGracePeriodDays: number | null;
}
export class OagPlagueModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.OagPlague;
  @field('PlgID') PlgID: number;
  @text('PlgDescription') PlgDescription: string;
  @field('TypePlague') TypePlague: number;
}
export class OagPlagueCultiveModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.OagPlagueCultive;
  @field('PgcID') PgcID: number;
  @field('PlgID') PlgID: number;
  @field('CltID') CltID: number;
}
export class OagWaterSourceModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.OagWaterSource;
  @field('OwsID') OwsID: number;
  @field('PlfID') PlfID: number;
  @field('OwsType') OwsType: number;
  @text('OwsName') OwsName: string;
  @text('OwsAdministrator') OwsAdministrator: string;
}
