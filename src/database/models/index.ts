import { GenDefinitionModel } from '@/database/models/GenDefinition';
import { GenDefinitionDetailModel } from '@/database/models/GenDefinitionDetail';
import { RstBranchModel } from '@/database/models/RstBranch';
import { RstTableModel } from '@/database/models/RstTable';

export * from '@/database/models/EntityBaseModel';
export * from '@/database/models/GenDefinition';
export * from '@/database/models/GenDefinitionDetail';
export * from '@/database/models/RstBranch';
export * from '@/database/models/RstTable';

export const databaseModels = [GenDefinitionModel, GenDefinitionDetailModel, RstBranchModel, RstTableModel];
