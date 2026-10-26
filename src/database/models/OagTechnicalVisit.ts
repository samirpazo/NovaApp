import { field, text } from '@nozbe/watermelondb/decorators';
import { SYNC_RESOURCES } from '@/contracts/sync';
import { EntityBaseModel } from '@/database/models/EntityBaseModel';

export class OagTechnicalVisitModel extends EntityBaseModel {
  static table = SYNC_RESOURCES.OagTechnicalVisit;
  @field('TviID') TviID: number;
  @field('TvsID') TvsID: number;
  @text('TviPerformedDate') TviPerformedDate: string;
  @text('TviDocumentSeries') TviDocumentSeries: string | null;
  @field('TviDocumentNumber') TviDocumentNumber: number | null;
  @field('TviLatitude') TviLatitude: number | null;
  @field('TviLongitude') TviLongitude: number | null;
  @text('TviObservation') TviObservation: string | null;
  @field('TviSignatureFilID') TviSignatureFilID: number | null;
  @text('Snapshot') Snapshot: string;
}
