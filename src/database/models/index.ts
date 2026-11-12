import { GenDefinitionModel } from '@/database/models/GenDefinition';
import { GenDefinitionDetailModel } from '@/database/models/GenDefinitionDetail';
import { OagTechnicalVisitModel } from '@/database/models/OagTechnicalVisit';
import { OagTechnicalVisitScheduleModel } from '@/database/models/OagTechnicalVisitSchedule';
import {
  GenCampaignModel, OagFruitFarmModel, OagPlotFarmModel, OagFruitFarmSupervisorModel,
  OagCultiveModel, OagVarietyModel, OagFarmSuppliesModel, OagFarmSuppliesTargetModel,
  OagObjectiveModel, OagObjectiveCultiveModel, OagWaterSourceModel,
} from '@/database/models/TechnicalVisitCatalogs';

export * from '@/database/models/EntityBaseModel';
export * from '@/database/models/GenDefinition';
export * from '@/database/models/GenDefinitionDetail';
export * from '@/database/models/OagTechnicalVisit';
export * from '@/database/models/OagTechnicalVisitSchedule';
export * from '@/database/models/TechnicalVisitCatalogs';

export const databaseModels = [
  GenDefinitionModel,
  GenDefinitionDetailModel,
  OagTechnicalVisitModel,
  OagTechnicalVisitScheduleModel,
  GenCampaignModel,
  OagFruitFarmModel,
  OagPlotFarmModel,
  OagFruitFarmSupervisorModel,
  OagCultiveModel,
  OagVarietyModel,
  OagFarmSuppliesModel,
  OagFarmSuppliesTargetModel,
  OagObjectiveModel,
  OagObjectiveCultiveModel,
  OagWaterSourceModel,
];
