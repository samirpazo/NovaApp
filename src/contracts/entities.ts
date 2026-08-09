export interface EntityBaseContract {
  SyncId: string;
  SyncVersion: string;
  SecStatus: boolean;
  CreateUserId: number;
  UpdateUserId: number | null;
  DeleteUserId: number | null;
  CreateDate: string;
  UpdateDate: string | null;
  DeleteDate: string | null;
}

export interface GenDefinition extends EntityBaseContract {
  DefID: number;
  DefDescription: string;
  DefCode: string;
  DefStated: number;
}

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

export interface RstBranch extends EntityBaseContract {
  BrhID: number;
  BrhResID: number;
  BrhName: string;
  BrhAddress: string | null;
  BrhPhone: string | null;
  BrhEmail: string | null;
  BrhManagerName: string | null;
  BrhCurrencyDefID: number | null;
}

export interface RstTable extends EntityBaseContract {
  TabID: number;
  TabTableNumber: number;
  TabCapacity: number;
  TabStatus: number;
  BrhID: number | null;
  TabPosX: number;
  TabPosY: number;
  TabWidth: number;
  TabHeight: number;
  TabRotation: number;
  TabShape: string;
  TabZIndex: number;
}
