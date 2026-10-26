import { field, text } from '@nozbe/watermelondb/decorators';
import { SYNC_RESOURCES } from '@/contracts/sync';
import { EntityBaseModel } from '@/database/models/EntityBaseModel';

export class OagTechnicalVisitScheduleModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.OagTechnicalVisitSchedule;
  @field('TvsID') TvsID: number;
  @field('PlfID') PlfID: number;
  @field('CmpID') CmpID: number | null;
  @field('TvsScheduledDate') TvsScheduledDate: string;
  @field('TvsResponsiblePrsID') TvsResponsiblePrsID: number;
  @field('TvsVisitType') TvsVisitType: number;
  @field('TvsObservation') TvsObservation: string | null;
  @text('PlfName') PlfName: string | null;
  @text('FrfName') FrfName: string | null;
  @text('CmpName') CmpName: string | null;
  @text('ProducerName') ProducerName: string | null;
  @text('ResponsibleName') ResponsibleName: string | null;
  @text('VrtDescription') VrtDescription: string | null;
  @text('CltDescription') CltDescription: string | null;
  @text('TypeCropDescription') TypeCropDescription: string | null;
  @text('FrfAddress') FrfAddress: string | null;
  @text('ZonDescription') ZonDescription: string | null;
  @text('SzoDescription') SzoDescription: string | null;
  @field('TviID') TviID: number | null;
}
