import {
  permissionsForOption,
  type NCrudOperation,
} from '@/features/security/options/permissions';
import type { SecOption } from '@/contracts/security/SecOption';

const option = (
  OptCode: string,
  operations: NCrudOperation[],
  Children: SecOption[] = [],
): SecOption => ({
  OptID: Math.floor(Math.random() * 10_000) + 1,
  TypeOption: 2,
  OptCode,
  OptName: OptCode,
  OptIcon: '',
  OptIsMobile: true,
  OptParent: null,
  OptOrder: 1,
  Operations: operations.map((TypeOperation) => ({ TypeOperation })),
  Levels: [],
  SpecialPermissions: [],
  Children,
});

describe('permisos NCrud', () => {
  it('encuentra una opción anidada y mapea sus operaciones', () => {
    const permissions = permissionsForOption(
      [option('PARENT', [], [option('GEN_DEFINITIONS', [1, 2, 4])])],
      'GEN_DEFINITIONS',
    );

    expect(permissions).toEqual({
      access: true,
      add: true,
      edit: true,
      remove: false,
      export: true,
      manage: false,
    });
  });

  it('deniega todo si la opción no está en la caché autorizada', () => {
    expect(permissionsForOption([], 'RST_BRANCH')).toEqual({
      access: false,
      add: false,
      edit: false,
      remove: false,
      export: false,
      manage: false,
    });
  });
});
