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
