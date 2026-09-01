import type { SecOption } from '@/contracts/security/SecOption';

export type NCrudOperation = 1 | 2 | 3 | 4 | 5;

export interface OptionPermissions {
  access: boolean;
  add: boolean;
  edit: boolean;
  remove: boolean;
  export: boolean;
  manage: boolean;
}

const deniedPermissions: OptionPermissions = {
  access: false,
  add: false,
  edit: false,
  remove: false,
  export: false,
  manage: false,
};

function findOption(options: SecOption[], optCode: string): SecOption | null {
  for (const option of options) {
    if (option.OptCode === optCode) return option;
    const child = findOption(option.Children, optCode);
    if (child) return child;
  }
  return null;
}

export function permissionsForOption(
  options: SecOption[],
  optCode: string,
): OptionPermissions {
  const option = findOption(options, optCode);
  if (!option) return deniedPermissions;
  const operations = new Set(
    option.Operations.map(({ TypeOperation }) => TypeOperation),
  );
  return {
    access: true,
    add: operations.has(1),
    edit: operations.has(2),
    remove: operations.has(3),
    export: operations.has(4),
    manage: operations.has(5),
  };
}
